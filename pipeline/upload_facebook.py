"""Facebook Page video upload (Graph API). Secrets: FB_PAGE_ID, FB_PAGE_TOKEN (long-lived Page access token).
Videos longer than 90 s cannot go through the Reels API, so they are posted as Page videos (Facebook shows vertical
Page videos in the Reels/Video surfaces)."""
from pathlib import Path

import time
import requests

from common import channel, env, log, retry


_PAGE_TOKEN = None


def page_token():
    """FB_PAGE_TOKEN may be a Page token, or a (system-)user token with access to the page — derive the Page token if needed."""
    global _PAGE_TOKEN
    if _PAGE_TOKEN:
        return _PAGE_TOKEN
    ver = channel()["facebook"].get("graph_version", "v21.0")
    tok, page = env("FB_PAGE_TOKEN"), env("FB_PAGE_ID")
    me = requests.get(f"https://graph.facebook.com/{ver}/me", params={"fields": "id", "access_token": tok}, timeout=30).json()
    if str(me.get("id")) != str(page):
        ex = requests.get(f"https://graph.facebook.com/{ver}/{page}", params={"fields": "access_token", "access_token": tok}, timeout=30).json()
        if ex.get("access_token"):
            tok = ex["access_token"]
    _PAGE_TOKEN = tok
    return tok


def caption(script):
    import seo
    return seo.facebook_caption(script, seed=int(script["id"]) if str(script["id"]).isdigit() else 0)


def comment(video_id, text):
    """First comment from the Page (needs pages_manage_engagement). Works once the video is published."""
    ver = channel()["facebook"].get("graph_version", "v21.0")
    r = requests.post(f"https://graph.facebook.com/{ver}/{video_id}/comments", data={"message": text, "access_token": page_token()}, timeout=60)
    if not r.ok:
        raise RuntimeError(f"comment failed {r.status_code}: {r.text[:200]}")
    return r.json().get("id")


def upload(video, script, publish_unix=None, thumb=None):
    ver = channel()["facebook"].get("graph_version", "v21.0")
    page = env("FB_PAGE_ID")
    token = page_token()
    url = f"https://graph-video.facebook.com/{ver}/{page}/videos"
    data = {"access_token": token, "description": caption(script), "title": script.get("title_bn", "")[:250]}
    if publish_unix:
        data.update({"published": "false", "scheduled_publish_time": str(int(publish_unix))})
    else:
        data["published"] = "true"

    video_only = channel()["facebook"].get("video_only", True)

    def go():
        files = {"source": (Path(video).name, open(video, "rb"), "video/mp4")}
        if thumb and Path(thumb).exists() and not video_only:   # owner rule: video only, no photo upload
            files["thumb"] = (Path(thumb).name, open(thumb, "rb"), "image/jpeg")
        return requests.post(url, data=data, files=files, timeout=900)

    vid = None
    for attempt in range(2):          # one retry, only for network / server (5xx) errors
        try:
            r = go()
        except requests.RequestException as e:
            if attempt: raise RuntimeError(f"Facebook upload failed: network {e}")
            log(f"facebook upload network error ({e}); retry in 30s"); time.sleep(30); continue
        if r.ok:
            vid = r.json()["id"]; break
        if r.status_code >= 500 and not attempt:
            log(f"facebook upload {r.status_code}; retry in 30s"); time.sleep(30); continue
        # 4xx (incl. code 368 posting limit): never retry — every extra call prolongs Facebook's block
        raise RuntimeError(f"Facebook upload failed: {r.status_code} {r.text[:400]}")
    log(f"Facebook uploaded: video {vid} ({'scheduled' if publish_unix else 'published'})")
    return vid
