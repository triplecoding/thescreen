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


def commit(msg):
    if not os.environ.get("CI"):
        return
    for _ in range(5):
        subprocess.run(["git", "add", "cards/posted.json"], cwd=ROOT)
        if subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT).returncode == 0:
            return
        subprocess.run(["git", "commit", "-q", "-m", msg], cwd=ROOT)
        subprocess.run(["git", "pull", "-q", "--rebase", "origin", "main"], cwd=ROOT)
        if subprocess.run(["git", "push", "-q", "origin", "HEAD:main"], cwd=ROOT).returncode == 0:
            return


def main():
    ver = channel()["facebook"].get("graph_version", "v21.0")
    G = f"https://graph.facebook.com/{ver}"
    page, tok = env("FB_PAGE_ID"), page_token()
    sched = json.loads(SCHED.read_text(encoding="utf-8"))
    posted = json.loads(POSTED.read_text(encoding="utf-8")) if POSTED.exists() else {}
    now = datetime.now(timezone.utc)
    for it in sched:
        if it["id"] in posted:
            log(f"{it['id']}: already scheduled ({posted[it['id']]['post']}) — skip"); continue
        when = datetime.fromisoformat(it["when"])
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
        posted[it["id"]] = {"post": pid, "when": it["when"], "mode": "scheduled" if later else "now"}
        POSTED.write_text(json.dumps(posted, ensure_ascii=False, indent=2), encoding="utf-8")
        log(f"{it['id']}: {'scheduled for ' + it['when'] if later else 'published now'} → {pid}")
        commit(f"photo post {it['id']}")
    # verify what Facebook has scheduled
    r = requests.get(f"{G}/{page}/scheduled_posts", params={"fields": "id,message,scheduled_publish_time", "limit": 25, "access_token": tok}, timeout=60)
    if r.ok:
        for p in r.json().get("data", []):
            log("scheduled on Facebook:", datetime.fromtimestamp(int(p.get("scheduled_publish_time", 0)), timezone(timedelta(hours=6))).strftime("%d %b %H:%M"), "|", (p.get("message") or "")[:40].replace("\n", " "))
    else:
        log("could not list scheduled posts:", r.status_code, r.text[:200])


if __name__ == "__main__":
    main()
