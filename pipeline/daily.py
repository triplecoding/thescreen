"""Daily run: produce today's videos and schedule them on YouTube + Facebook.

usage: python pipeline/daily.py [--count N] [--now] [--dry-run] [--date YYYY-MM-DD]
- Idempotent: slots already filled for the date are skipped, so re-runs never double-post.
- A script that cannot be produced (too long/short/invalid) is parked in state.failed and the next one is used,
  so one bad script never blocks the channel.
- State is committed after every upload (in CI) so progress survives a crash.
"""
import argparse
import os
import subprocess
import sys
import traceback
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).parent))
from common import OUT, ROOT, SCRIPTS, STATE, channel, load_json, log, save_json  # noqa: E402


def merge_state(local, remote):
    """Union of two state.json versions — never loses a posted record (prevents double posts)."""
    if not remote:
        return local
    out = dict(remote)
    out.update({k: v for k, v in local.items() if k not in ("posted", "failed", "playlists", "dry_runs")})
    seen, posted = {}, []
    for rec in (remote.get("posted", []) + local.get("posted", [])):
        key = (rec.get("date"), rec.get("slot"))
        if key in seen:
            old = seen[key]
            for kk, vv in rec.items():          # same slot: keep the first record, fill in missing fields
                old.setdefault(kk, vv)
            continue
        seen[key] = dict(rec)
        posted.append(seen[key])
    out["posted"] = posted
    # failed: what is on main (a human may have removed entries to retry them) + entries parked during THIS run
    start = local.get("_run_started") or ""
    rkeys = {(f.get("id"), f.get("kind")) for f in remote.get("failed", [])}
    out["failed"] = list(remote.get("failed", [])) + [f for f in local.get("failed", []) if start and (f.get("id"), f.get("kind")) not in rkeys and f.get("at", "") >= start]
    out["playlists"] = {**remote.get("playlists", {}), **local.get("playlists", {})}
    out["dry_runs"] = (remote.get("dry_runs", []) + [d for d in local.get("dry_runs", []) if d not in remote.get("dry_runs", [])])[-20:]
    return out


def remote_state():
    """state.json as it is on origin/main right now (None outside CI or on error)."""
    if not os.environ.get("CI"):
        return None
    try:
        subprocess.run(["git", "fetch", "-q", "origin", "main"], cwd=ROOT, check=True, timeout=60)
        txt = subprocess.run(["git", "show", "origin/main:state.json"], cwd=ROOT, check=True, capture_output=True, text=True).stdout
        import json
        return json.loads(txt)
    except Exception as e:  # noqa
        log("could not read remote state:", e)
        return None


def sync_state(state):
    """Merge the latest origin/main state into `state` in place."""
    merged = merge_state(state, remote_state())
    state.clear(); state.update(merged)
    return state


_START_SHA = None


def git_commit(msg, state=None):
    """Commit state.json on top of the LATEST origin/main (merging, never overwriting other runs' records)."""
    if not os.environ.get("CI"):
        return
    global _START_SHA
    try:
        if _START_SHA is None:
            _START_SHA = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
        voices_changed = subprocess.run(["git", "diff", "--quiet", _START_SHA, "--", "config/voices.json"], cwd=ROOT).returncode != 0
        for _ in range(5):
            if state is not None:
                sync_state(state)
                save_json(STATE, state)
            subprocess.run(["git", "fetch", "-q", "origin", "main"], cwd=ROOT, check=False)
            subprocess.run(["git", "reset", "-q", "--mixed", "origin/main"], cwd=ROOT, check=False)
            subprocess.run(["git", "add", "state.json"] + (["config/voices.json"] if voices_changed else []), cwd=ROOT, check=False)
            if subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT).returncode == 0:
                return
            subprocess.run(["git", "commit", "-q", "-m", msg], cwd=ROOT, check=True)
            if subprocess.run(["git", "push", "-q", "origin", "HEAD:main"], cwd=ROOT).returncode == 0:
                return
        log("warning: could not push state")
    except Exception as e:  # noqa
        log("git commit failed:", e)


def queue(state):
    used = {p["id"] for p in state.get("posted", [])} | {f["id"] for f in state.get("failed", [])}
    ready = []
    for p in sorted(SCRIPTS.glob("*.json")):
        s = load_json(p)
        if s and s.get("status", "ready") == "ready" and s["id"] not in used:
            ready.append(s["id"])
    return ready


def slot_times(date, cfg):
    tz = ZoneInfo(cfg["timezone"])
    out = []
    for hhmm in cfg["slots"][: cfg["posts_per_day"]]:
        h, m = map(int, hhmm.split(":"))
        out.append((hhmm, datetime(date.year, date.month, date.day, h, m, tzinfo=tz)))
    return sorted(out, key=lambda x: x[1])


def next_slot(now, cfg, done, grace_min=100):
    """The earliest slot (today or tomorrow) not yet filled whose time is >= now - grace."""
    cands = []
    for d in (now.date() - timedelta(days=1), now.date(), now.date() + timedelta(days=1)):
        for s, t in slot_times(d, cfg):
            if t >= now - timedelta(minutes=grace_min) and (str(d), s) not in done:
                cands.append((d, s, t))
    cands.sort(key=lambda x: x[2])
    return cands[0] if cands else None


def upcoming(now, cfg, done, hours=26, grace_min=100, limit=4):
    """All unfilled slots from (now - grace) to (now + hours), earliest first — so one successful run
    schedules a whole day ahead and a missed cron never means a missed post."""
    out = []
    for d in (now.date() - timedelta(days=1), now.date(), now.date() + timedelta(days=1), now.date() + timedelta(days=2)):
        for s, t in slot_times(d, cfg):
            if now - timedelta(minutes=grace_min) <= t <= now + timedelta(hours=hours) and (str(d), s) not in done:
                out.append((d, s, t))
    out.sort(key=lambda x: x[2])
    return out[:limit]


def engage(state, platforms, now):
    """Post the 'first comment' (the episode's mirror question) on videos that have gone live since the last run."""
    import seo
    import upload_facebook
    import upload_youtube
    for rec in state.get("posted", [])[-12:]:
        live = rec.get("scheduled_for") == "immediate" or (rec.get("scheduled_for") and datetime.fromisoformat(rec["scheduled_for"]) <= now)
        if not live:
            continue
        script = load_json(SCRIPTS / f"{rec['id']}.json")
        if "youtube" in platforms and rec.get("youtube") and script and not rec.get("playlist") and channel()["youtube"].get("playlist_by_book"):
            rec["playlist"] = upload_youtube.add_to_playlist(rec["youtube"], script["source"]["book"], state["playlists"])
        text = seo.first_comment(script) if script else None
        if not text:
            continue
        if "youtube" in platforms and rec.get("youtube") and not rec.get("yt_comment"):
            try:
                rec["yt_comment"] = upload_youtube.comment(rec["youtube"], text)
                log(f"youtube comment on {rec['id']}")
            except Exception as e:  # noqa
                rec["yt_comment_error"] = str(e)[:160]
                if "403" in str(e) or "404" in str(e): rec["yt_comment"] = "skipped"
        if "facebook" in platforms and rec.get("facebook") and not rec.get("fb_comment"):
            try:
                rec["fb_comment"] = upload_facebook.comment(rec["facebook"], text)
                log(f"facebook comment on {rec['id']}")
            except Exception as e:  # noqa
                rec["fb_comment_error"] = str(e)[:160]
                if "403" in str(e) or "(#200)" in str(e): rec["fb_comment"] = "skipped"
    save_json(STATE, state)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=0)
    ap.add_argument("--now", action="store_true", help="publish immediately instead of scheduling")
    ap.add_argument("--dry-run", action="store_true", help="produce but do not upload")
    ap.add_argument("--date", default="")
    ap.add_argument("--next", action="store_true", help="fill only the next upcoming slot (used by the cron)")
    ap.add_argument("--extra", action="store_true", help="one extra video published right now, without using a scheduled slot")
    ap.add_argument("--ahead", type=int, default=0, help="fill every unfilled slot in the next ~26 h (max N) — used by the cron")
    ap.add_argument("--plan", action="store_true", help="only report whether there is work (writes work=0/1 to GITHUB_OUTPUT)")
    ap.add_argument("--engage-only", action="store_true", help="only first comments / playlist backfill, no production")
    ap.add_argument("--tts", default="elevenlabs")
    a = ap.parse_args()

    global _START_SHA
    if os.environ.get("CI") and _START_SHA is None:
        _START_SHA = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    cfg = channel()
    if a.plan:
        tz = ZoneInfo(cfg["timezone"]); now = datetime.now(tz)
        state = load_json(STATE, {}) or {}
        done = {(p["date"], p["slot"]) for p in state.get("posted", [])}
        todo = upcoming(now, cfg, done, limit=max(a.ahead, 1))
        work = 1 if todo and queue(state) else 0
        log("plan:", ", ".join(f"{d} {s}" for d, s, _ in todo) or "all slots for the next 26 h already scheduled", "| queue:", len(queue(state)))
        if os.environ.get("GITHUB_OUTPUT"):
            with open(os.environ["GITHUB_OUTPUT"], "a") as f:
                f.write(f"work={work}\n")
        return
    if a.engage_only:
        tz = ZoneInfo(cfg["timezone"])
        state = load_json(STATE, {}) or {}
        state.setdefault("playlists", {})
        rp = os.environ.get("READY_PLATFORMS")
        platforms = [p for p in cfg["platforms"] if rp is None or p in rp.split(",")]
        engage(state, platforms, datetime.now(tz))
        git_commit("engage: first comments / playlists", state)
        return

    from produce import produce  # heavy imports after arg parsing
    import upload_facebook
    import upload_youtube
    from timeline import TooLong, TooShort

    tz = ZoneInfo(cfg["timezone"])
    now = datetime.now(tz)
    date = datetime.strptime(a.date, "%Y-%m-%d").date() if a.date else now.date()
    state = load_json(STATE, {}) or {}
    sync_state(state)                      # always decide from the latest origin/main, never a stale checkout
    state["_run_started"] = now.isoformat()
    state.setdefault("posted", []); state.setdefault("failed", []); state.setdefault("playlists", {})
    platforms = list(cfg["platforms"])
    rp = os.environ.get("READY_PLATFORMS")
    if rp is not None:
        platforms = [p for p in platforms if p in rp.split(",")]
        if not platforms and not a.dry_run:
            log("no platform credentials ready — running as dry-run (videos kept as artifacts, nothing marked posted)")
            a.dry_run = True
    done = {(p["date"], p["slot"]) for p in state["posted"]}
    if a.extra:
        date = now.date()
        todo = [(f"extra-{now.strftime('%H%M')}", now)]
        a.now = True
        log("extra video: publishing immediately (no slot used)")
    elif a.ahead:
        todo_d = upcoming(now, cfg, done, limit=a.ahead)
        if not todo_d:
            log("nothing to do — the next 26 h are already scheduled")
        todo = [(s_, t) for _, s_, t in todo_d]
        log("filling ahead:", ", ".join(f"{d} {s_}" for d, s_, _ in todo_d))
    elif a.next:
        ns = next_slot(now, cfg, done)
        if not ns:
            log("nothing to do"); return
        date = ns[0]
        todo = [(ns[1], ns[2])]
        log(f"next slot: {date} {ns[1]} ({ns[2].isoformat()})")
    else:
        slots = slot_times(date, cfg)
        if a.count:
            slots = slots[: a.count]
        todo = [(s, t) for s, t in slots if (str(date), s) not in done]
        log(f"date {date}: {len(todo)} slot(s) to fill of {len(slots)}")
    errors = []
    dry_used = set()
    if not a.dry_run:
        engage(state, platforms, now)
    def taken(slot, when):
        d = str(when.date()) if (a.ahead or a.next) else str(date)
        return (d, slot) in {(p["date"], p["slot"]) for p in state["posted"]}
    for slot, when in todo:
        if not a.dry_run and not a.extra:
            sync_state(state)
            if taken(slot, when):
                log(f"slot {when.date()} {slot} already posted (another run) — skipping"); continue
        q = [x for x in queue(state) if x not in dry_used]
        if not q:
            errors.append("queue empty — no ready scripts")
            break
        produced = None
        while q and not produced:
            sid = q.pop(0)
            try:
                log(f"=== {slot}: producing {sid}")
                odir = produce(sid, a.tts)
                produced = (sid, odir)
            except (TooLong, TooShort) as e:
                log(f"script {sid} parked: {e}")
                state["failed"].append({"id": sid, "reason": str(e), "at": now.isoformat(), "kind": "length"})
                save_json(STATE, state); git_commit(f"park {sid}: length", state)
            except Exception as e:  # noqa
                tb = traceback.format_exc(limit=3)
                log(f"producing {sid} failed: {e}\n{tb}")
                if "script invalid" in str(e) or "QA failed" in str(e):
                    state["failed"].append({"id": sid, "reason": str(e)[:400], "at": now.isoformat(), "kind": "script"})
                    save_json(STATE, state); git_commit(f"park {sid}: invalid", state)
                else:
                    errors.append(f"{sid}: {e}")
                    raise
        if not produced:
            errors.append(f"slot {slot}: nothing producible")
            continue
        sid, odir = produced
        if a.ahead:
            date = when.date()
        script = load_json(SCRIPTS / f"{sid}.json")
        video = Path(odir) / "video.mp4"
        meta = load_json(Path(odir) / "meta.json", {})
        rec = {"id": sid, "date": str(date), "slot": slot, "duration": meta.get("duration"), "title": script["youtube"]["title"]}
        schedule = not a.now and cfg.get("publish_mode") == "scheduled" and when > datetime.now(tz) + timedelta(minutes=20)
        if not a.dry_run and not a.extra:
            sync_state(state)                  # production took minutes: re-check right before uploading
            if taken(slot, when) or sid in {p["id"] for p in state["posted"]}:
                log(f"slot {slot} / script {sid} was posted by another run meanwhile — NOT uploading (no double post)")
                continue
        if a.dry_run:
            rec["dry_run"] = True
            log(f"dry run: {video}")
        else:
            if "youtube" in platforms:
                try:
                    iso = when.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z") if schedule else None
                    vid = upload_youtube.upload(video, script, iso, Path(odir) / "thumb_16x9.jpg")
                    rec["youtube"] = vid
                    if cfg["youtube"].get("playlist_by_book"):
                        rec["playlist"] = upload_youtube.add_to_playlist(vid, script["source"]["book"], state["playlists"])
                except Exception as e:  # noqa
                    rec["youtube_error"] = str(e)[:300]; errors.append(f"youtube {sid}: {e}")
            if "facebook" in platforms:
                try:
                    rec["facebook"] = upload_facebook.upload(video, script, when.timestamp() if schedule else None, Path(odir) / "thumb_9x16.jpg")
                except Exception as e:  # noqa
                    rec["facebook_error"] = str(e)[:300]; errors.append(f"facebook {sid}: {e}")
        rec["scheduled_for"] = when.isoformat() if schedule else "immediate"
        if a.dry_run:
            state.setdefault("dry_runs", []).append(rec)
            state["dry_runs"] = state["dry_runs"][-20:]
            # a dry run must not consume the script: produce the next one for the next slot
            dry_used.add(sid)
        elif rec.get("youtube") or rec.get("facebook"):
            state["posted"].append(rec)
        else:
            state["failed"].append({"id": sid, "reason": "all uploads failed: " + "; ".join(errors[-2:]), "at": now.isoformat(), "kind": "upload", "retry": True})
        state["last_run"] = {"at": datetime.now(tz).isoformat(), "errors": errors}
        save_json(STATE, state)
        git_commit(f"{'dry-run' if a.dry_run else 'post'} {sid} for {date} {slot}", state)
    remaining = len(queue(state))
    state["queue_remaining"] = remaining
    state["last_run"] = {"at": datetime.now(tz).isoformat(), "errors": errors, "queue_remaining": remaining}
    save_json(STATE, state)
    state.pop("_run_started", None)
    git_commit(f"daily run {date}", state)
    log(f"queue remaining: {remaining}")
    if remaining < cfg["posts_per_day"] * 3:
        log("WARNING: script queue is running low")
    if errors:
        log("ERRORS:\n  " + "\n  ".join(errors))
        sys.exit(2)


if __name__ == "__main__":
    main()
