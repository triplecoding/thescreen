"""Read-only status of recently posted videos on YouTube + Facebook.  usage: python pipeline/status.py"""
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
from common import STATE, channel, load_json  # noqa: E402

state = load_json(STATE, {}) or {}
posted = state.get("posted", [])[-6:]
if not posted:
    print("nothing posted yet")
try:
    import upload_youtube
    tok = upload_youtube.access_token()
    ids = ",".join(p["youtube"] for p in posted if p.get("youtube"))
    if ids:
        r = requests.get("https://www.googleapis.com/youtube/v3/videos", params={"part": "status,processingDetails,snippet", "id": ids},
                         headers={"Authorization": f"Bearer {tok}"}, timeout=30).json()
        for it in r.get("items", []):
            st = it["status"]
            print(f"YT {it['id']}: privacy={st.get('privacyStatus')} publishAt={st.get('publishAt')} upload={st.get('uploadStatus')} "
                  f"rejection={st.get('rejectionReason')} processing={it.get('processingDetails', {}).get('processingStatus')} | {it['snippet']['title'][:60]}")
except Exception as e:  # noqa
    print("YT status error:", e)
try:
    import upload_facebook
    tok = upload_facebook.page_token()
    ver = channel()["facebook"].get("graph_version", "v21.0")
    for p in posted:
        if p.get("facebook"):
            r = requests.get(f"https://graph.facebook.com/{ver}/{p['facebook']}", params={"fields": "status,scheduled_publish_time,published,length,title", "access_token": tok}, timeout=30).json()
            print(f"FB {p['facebook']}: {r}")
except Exception as e:  # noqa
    print("FB status error:", e)
