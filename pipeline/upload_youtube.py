"""YouTube Data API v3 upload (OAuth refresh token). Secrets: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN."""
import json
import os
from pathlib import Path

import requests

from common import channel, env, load_json, log, retry

TOKEN_URL = "https://oauth2.googleapis.com/token"
UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos"
API = "https://www.googleapis.com/youtube/v3"
CHUNK = 8 * 1024 * 1024


def access_token():
    r = requests.post(TOKEN_URL, data={"client_id": env("YT_CLIENT_ID"), "client_secret": env("YT_CLIENT_SECRET"),
                                       "refresh_token": env("YT_REFRESH_TOKEN"), "grant_type": "refresh_token"}, timeout=60)
    if not r.ok:
        raise RuntimeError(f"YouTube token refresh failed: {r.status_code} {r.text[:300]}")
    return r.json()["access_token"]


def build_metadata(script):
    import seo
    cfg = channel()
    m = seo.youtube_meta(script, seed=int(script["id"]) if str(script["id"]).isdigit() else 0)
    return {"title": m["title"], "description": m["description"], "tags": m["tags"], "categoryId": cfg["youtube"].get("category_id", "22"),
            "defaultLanguage": cfg["youtube"].get("default_language", "bn"), "defaultAudioLanguage": "bn"}


def comment(video_id, text):
    """Top-level comment from the channel (needs scope youtube.force-ssl). Works once the video is public."""
    tok = access_token()
    r = requests.post(f"{API}/commentThreads", params={"part": "snippet"}, headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
                      data=json.dumps({"snippet": {"videoId": video_id, "topLevelComment": {"snippet": {"textOriginal": text}}}}), timeout=60)
    if not r.ok:
        raise RuntimeError(f"comment failed {r.status_code}: {r.text[:200]}")
    return r.json()["id"]


def upload(video, script, publish_at_iso=None, thumb=None):
    tok = access_token()
    H = {"Authorization": f"Bearer {tok}"}
    status = {"selfDeclaredMadeForKids": bool(channel()["youtube"].get("made_for_kids", False)), "embeddable": True, "license": "youtube"}
    if publish_at_iso:
        status.update({"privacyStatus": "private", "publishAt": publish_at_iso})
    else:
        status["privacyStatus"] = "public"
    body = {"snippet": build_metadata(script), "status": status}
    size = os.path.getsize(video)

    def init():
        r = requests.post(UPLOAD_URL, params={"uploadType": "resumable", "part": "snippet,status"},
                          headers={**H, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": str(size)},
                          data=json.dumps(body), timeout=60)
        if not r.ok:
            raise RuntimeError(f"YouTube init failed: {r.status_code} {r.text[:400]}")
        return r.headers["Location"]
    loc = retry(init, what="youtube init")
    sent = 0
    with open(video, "rb") as f:
        while sent < size:
            f.seek(sent)
            chunk = f.read(CHUNK)
            end = sent + len(chunk) - 1
            def put():
                r = requests.put(loc, headers={**H, "Content-Length": str(len(chunk)), "Content-Range": f"bytes {sent}-{end}/{size}"}, data=chunk, timeout=300)
                if r.status_code not in (200, 201, 308):
                    raise RuntimeError(f"chunk {r.status_code} {r.text[:200]}")
                return r
            r = retry(put, what="youtube chunk")
            if r.status_code in (200, 201):
                vid = r.json()["id"]
                break
            rng = r.headers.get("Range")
            sent = int(rng.split("-")[1]) + 1 if rng else end + 1
        else:
            raise RuntimeError("upload ended without a video id")
    log(f"YouTube uploaded: https://youtu.be/{vid} ({'scheduled ' + publish_at_iso if publish_at_iso else 'public'})")
    if thumb and Path(thumb).exists():
        try:
            r = requests.post("https://www.googleapis.com/upload/youtube/v3/thumbnails/set", params={"videoId": vid},
                              headers={**H, "Content-Type": "image/jpeg"}, data=open(thumb, "rb").read(), timeout=120)
            log("thumbnail:", "set" if r.ok else f"skipped ({r.status_code})")
        except Exception as e:  # noqa
            log("thumbnail skipped:", e)
    return vid


def add_to_playlist(video_id, book, cache):
    """Group videos by source book. cache: dict book->playlist id (persisted in state.json)."""
    try:
        tok = access_token()
        H = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
        pid = cache.get(book)
        if not pid:
            r = requests.post(f"{API}/playlists", params={"part": "snippet,status"}, headers=H, timeout=60,
                              data=json.dumps({"snippet": {"title": f"{book} — বাংলা গল্পে | The Screen", "description": f"{book} বইয়ের শিক্ষা, জীবনের গল্পে। The Screen — গল্পে দেখি জীবন।", "defaultLanguage": "bn"}, "status": {"privacyStatus": "public"}}))
            if not r.ok:
                log("playlist create skipped:", r.status_code)
                return None
            pid = r.json()["id"]
            cache[book] = pid
        r = requests.post(f"{API}/playlistItems", params={"part": "snippet"}, headers=H, timeout=60,
                          data=json.dumps({"snippet": {"playlistId": pid, "resourceId": {"kind": "youtube#video", "videoId": video_id}}}))
        log("playlist:", "added" if r.ok else f"skipped ({r.status_code})")
        return pid
    except Exception as e:  # noqa
        log("playlist skipped:", e)
        return None
