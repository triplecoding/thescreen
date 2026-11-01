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


def git_commit(msg):
    if not os.environ.get("CI"):
        return
    try:
        subprocess.run(["git", "add", "state.json", "config/voices.json"], cwd=ROOT, check=False)
        if subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT).returncode == 0:
            return
        subprocess.run(["git", "commit", "-m", msg], cwd=ROOT, check=True)
        for _ in range(4):
            subprocess.run(["git", "pull", "--rebase", "-X", "theirs", "origin", "main"], cwd=ROOT, check=False)
            if subprocess.run(["git", "push", "origin", "HEAD:main"], cwd=ROOT).returncode == 0:
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
    ap.add_argument("--tts", default="elevenlabs")
    a = ap.parse_args()

    from produce import produce  # heavy imports after arg parsing
    import upload_facebook
    import upload_youtube
    from timeline import TooLong, TooShort

    cfg = channel()
    tz = ZoneInfo(cfg["timezone"])
    now = datetime.now(tz)
    date = datetime.strptime(a.date, "%Y-%m-%d").date() if a.date else now.date()
    state = load_json(STATE, {}) or {}
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
    for slot, when in todo:
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
                save_json(STATE, state); git_commit(f"park {sid}: length")
            except Exception as e:  # noqa
                tb = traceback.format_exc(limit=3)
                log(f"producing {sid} failed: {e}\n{tb}")
                if "script invalid" in str(e) or "QA failed" in str(e):
                    state["failed"].append({"id": sid, "reason": str(e)[:400], "at": now.isoformat(), "kind": "script"})
                    save_json(STATE, state); git_commit(f"park {sid}: invalid")
                else:
                    errors.append(f"{sid}: {e}")
                    raise
        if not produced:
            errors.append(f"slot {slot}: nothing producible")
            continue
        sid, odir = produced
        script = load_json(SCRIPTS / f"{sid}.json")
        video = Path(odir) / "video.mp4"
        meta = load_json(Path(odir) / "meta.json", {})
        rec = {"id": sid, "date": str(date), "slot": slot, "duration": meta.get("duration"), "title": script["youtube"]["title"]}
        schedule = not a.now and cfg.get("publish_mode") == "scheduled" and when > datetime.now(tz) + timedelta(minutes=20)
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
        git_commit(f"{'dry-run' if a.dry_run else 'post'} {sid} for {date} {slot}")
    remaining = len(queue(state))
    state["queue_remaining"] = remaining
    state["last_run"] = {"at": datetime.now(tz).isoformat(), "errors": errors, "queue_remaining": remaining}
    save_json(STATE, state)
    git_commit(f"daily run {date}")
    log(f"queue remaining: {remaining}")
    if remaining < cfg["posts_per_day"] * 3:
        log("WARNING: script queue is running low")
    if errors:
        log("ERRORS:\n  " + "\n  ".join(errors))
        sys.exit(2)


if __name__ == "__main__":
    main()
