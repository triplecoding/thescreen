"""Remove a duplicate YouTube upload: keep the copy with MORE views, delete the other, fix state.json.

usage: python pipeline/yt_dedupe.py <video_id_a> <video_id_b>
"""
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
from common import STATE, load_json, log, save_json  # noqa: E402
from upload_youtube import API, access_token  # noqa: E402
import daily  # noqa: E402


def main():
    a, b = sys.argv[1], sys.argv[2]
    H = {"Authorization": f"Bearer {access_token()}"}
    r = requests.get(f"{API}/videos", params={"part": "statistics,snippet", "id": f"{a},{b}"}, headers=H, timeout=60)
    r.raise_for_status()
    items = {it["id"]: it for it in r.json().get("items", [])}
    for v in (a, b):
        it = items.get(v)
        log(f"{v}: " + (f"views={it['statistics'].get('viewCount')} likes={it['statistics'].get('likeCount')} published={it['snippet']['publishedAt']}" if it else "not found"))
    if len(items) < 2:
        log("only one copy exists — nothing to delete"); return
    va, vb = (int(items[v]["statistics"].get("viewCount", 0)) for v in (a, b))
    # fewer views is deleted; on a tie the later upload (the duplicate) goes
    drop = a if va < vb else b if vb < va else max((a, b), key=lambda v: items[v]["snippet"]["publishedAt"])
    keep = b if drop == a else a
    d = requests.delete(f"{API}/videos", params={"id": drop}, headers=H, timeout=60)
    if d.status_code not in (200, 204):
        raise SystemExit(f"delete failed: {d.status_code} {d.text[:300]}")
    log(f"deleted {drop} (fewer views), kept {keep}")
    state = load_json(STATE, {}) or {}
    daily.sync_state(state)
    for rec in state.get("posted", []):
        if rec.get("youtube") in (a, b) or rec.get("youtube_duplicate") in (a, b):
            if rec.get("youtube") == drop:
                rec["youtube"] = keep
                for k in ("yt_comment", "yt_comment_error", "playlist"):
                    rec.pop(k, None)
            rec.pop("youtube_duplicate", None)
            rec["youtube_deleted_duplicate"] = drop
    save_json(STATE, state)
    daily.git_commit(f"youtube: deleted duplicate {drop}, kept {keep}", state)


if __name__ == "__main__":
    main()
