"""Schedule Facebook photo posts from cards/schedule.json (idempotent; results in cards/posted.json).

Each entry: {"id", "image", "when" (ISO, Asia/Dhaka), "caption"}. Already-posted ids are skipped.
A card whose time is < 12 min away (or passed within the last 3 h) is published immediately; older ones are skipped.
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
from common import ROOT, channel, env, log  # noqa: E402
from upload_facebook import page_token  # noqa: E402

SCHED, POSTED = ROOT / "cards" / "schedule.json", ROOT / "cards" / "posted.json"


def latest_posted():
    """cards/posted.json from origin/main (never a stale checkout) — prevents double photo posts."""
    if os.environ.get("CI"):
        subprocess.run(["git", "fetch", "-q", "origin", "main"], cwd=ROOT)
        r = subprocess.run(["git", "show", "origin/main:cards/posted.json"], cwd=ROOT, capture_output=True, text=True)
        if r.returncode == 0 and r.stdout.strip():
            return json.loads(r.stdout)
    return json.loads(POSTED.read_text(encoding="utf-8")) if POSTED.exists() else {}


def commit(msg):
    if not os.environ.get("CI"):
        return
    for _ in range(5):
        subprocess.run(["git", "fetch", "-q", "origin", "main"], cwd=ROOT)
        subprocess.run(["git", "reset", "-q", "--mixed", "origin/main"], cwd=ROOT)
        subprocess.run(["git", "add", "cards/posted.json"], cwd=ROOT)
        if subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT).returncode == 0:
            return
        subprocess.run(["git", "commit", "-q", "-m", msg], cwd=ROOT)
        if subprocess.run(["git", "push", "-q", "origin", "HEAD:main"], cwd=ROOT).returncode == 0:
            return


def main():
    ver = channel()["facebook"].get("graph_version", "v21.0")
    G = f"https://graph.facebook.com/{ver}"
    page, tok = env("FB_PAGE_ID"), page_token()
    sched = json.loads(SCHED.read_text(encoding="utf-8"))
    posted = latest_posted()
    now = datetime.now(timezone.utc)
    for it in sched:
        when = datetime.fromisoformat(it["when"])
        old = posted.get(it["id"])
        if old and old.get("version", 1) != it.get("version", 1) and when > now + timedelta(minutes=12):
            # a newer design of a card that is still only scheduled: delete the old scheduled post, schedule the new one
            d = requests.delete(f"{G}/{old['post']}", params={"access_token": tok}, timeout=60)
            log(f"{it['id']}: replacing scheduled post {old['post']} (v{old.get('version', 1)} → v{it.get('version', 1)}): delete {d.status_code}")
            if not d.ok and "does not exist" not in d.text:
                raise SystemExit(f"{it['id']}: could not delete old post {d.text[:300]}")
            posted.pop(it["id"]); old = None
            POSTED.write_text(json.dumps(posted, ensure_ascii=False, indent=2), encoding="utf-8")
        if old:
            log(f"{it['id']}: already scheduled ({old['post']}) — skip"); continue
        if when < now - timedelta(hours=3):
            log(f"{it['id']}: time passed — skip"); continue
        later = when > now + timedelta(minutes=12)
        img = ROOT / it["image"]
        with open(img, "rb") as f:
            r = requests.post(f"{G}/{page}/photos", data={"published": "false", "temporary": "true" if later else "false", "access_token": tok},
                              files={"source": (img.name, f, "image/jpeg")}, timeout=120)
        if not r.ok:
            raise SystemExit(f"{it['id']}: photo upload failed {r.status_code} {r.text[:300]}")
        media = r.json()["id"]
        data = {"message": it["caption"], "attached_media": json.dumps([{"media_fbid": media}]), "access_token": tok}
        if later:
            data.update({"published": "false", "scheduled_publish_time": str(int(when.timestamp()))})
        r = requests.post(f"{G}/{page}/feed", data=data, timeout=60)
        if not r.ok:
            raise SystemExit(f"{it['id']}: post failed {r.status_code} {r.text[:300]}")
        pid = r.json()["id"]
        posted[it["id"]] = {"post": pid, "when": it["when"], "mode": "scheduled" if later else "now", "version": it.get("version", 1), "video": it.get("video")}
        POSTED.write_text(json.dumps(posted, ensure_ascii=False, indent=2), encoding="utf-8")
        log(f"{it['id']}: {'scheduled for ' + it['when'] if later else 'published now'} → {pid}")
        commit(f"photo post {it['id']}")
    # once a card is live: post the episode's video link as the first comment (links never go in captions)
    for it in sched:
        rec = posted.get(it["id"])
        if not rec or rec.get("comment") or not it.get("video"):
            continue
        if datetime.fromisoformat(rec["when"]) > now - timedelta(minutes=1):
            continue
        msg = f"▶ পুরো গল্পটা দেখুন এখানে 👇\nhttps://www.facebook.com/watch/?v={it['video']}"
        r = requests.post(f"{G}/{rec['post']}/comments", data={"message": msg, "access_token": tok}, timeout=60)
        if r.ok:
            rec["comment"] = r.json().get("id")
            log(f"{it['id']}: video link commented")
        else:
            rec["comment_error"] = r.text[:200]
            log(f"{it['id']}: comment failed {r.status_code} {r.text[:200]}")
        POSTED.write_text(json.dumps(posted, ensure_ascii=False, indent=2), encoding="utf-8")
        commit(f"photo post {it['id']}: link comment")
    # verify what Facebook has scheduled
    r = requests.get(f"{G}/{page}/scheduled_posts", params={"fields": "id,message,scheduled_publish_time", "limit": 25, "access_token": tok}, timeout=60)
    if r.ok:
        for p in r.json().get("data", []):
            log("scheduled on Facebook:", datetime.fromtimestamp(int(p.get("scheduled_publish_time", 0)), timezone(timedelta(hours=6))).strftime("%d %b %H:%M"), "|", (p.get("message") or "")[:40].replace("\n", " "))
    else:
        log("could not list scheduled posts:", r.status_code, r.text[:200])


if __name__ == "__main__":
    main()
