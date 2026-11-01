"""Health check for secrets and APIs.  usage: python pipeline/doctor.py [--ci]
Prints what is configured, what works, and what to fix. Never prints secret values."""
import os
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
from common import channel  # noqa: E402

SECRETS = {
    "ELEVENLABS_API_KEY": "voice",
    "YT_CLIENT_ID": "youtube", "YT_CLIENT_SECRET": "youtube", "YT_REFRESH_TOKEN": "youtube",
    "FB_PAGE_ID": "facebook", "FB_PAGE_TOKEN": "facebook",
}


def present(n):
    return bool(os.environ.get(n, "").strip())


def check_eleven():
    k = os.environ["ELEVENLABS_API_KEY"].strip()
    H = {"xi-api-key": k}
    r = requests.get("https://api.elevenlabs.io/v1/user/subscription", headers=H, timeout=30)
    if r.status_code == 401:
        return False, "ElevenLabs key rejected (401)"
    info = r.json() if r.ok else {}
    msg = f"ElevenLabs OK — tier {info.get('tier', '?')}, used {info.get('character_count', '?')}/{info.get('character_limit', '?')} chars"
    m = requests.get("https://api.elevenlabs.io/v1/models", headers=H, timeout=30)
    if m.ok:
        ids = [x.get("model_id") for x in m.json()]
        want = channel()["elevenlabs"]["model_id"]
        msg += f"; model {want}: {'available' if want in ids else 'NOT listed (fallback will be used)'}"
    return True, msg


def check_youtube():
    r = requests.post("https://oauth2.googleapis.com/token", data={"client_id": os.environ["YT_CLIENT_ID"], "client_secret": os.environ["YT_CLIENT_SECRET"],
                                                                 "refresh_token": os.environ["YT_REFRESH_TOKEN"], "grant_type": "refresh_token"}, timeout=30)
    if not r.ok:
        return False, f"YouTube token refresh failed ({r.status_code}): {r.json().get('error_description', r.text[:120])}"
    tok = r.json()["access_token"]
    c = requests.get("https://www.googleapis.com/youtube/v3/channels", params={"part": "snippet,status", "mine": "true"}, headers={"Authorization": f"Bearer {tok}"}, timeout=30)
    if not c.ok or not c.json().get("items"):
        return False, f"YouTube channel lookup failed ({c.status_code})"
    it = c.json()["items"][0]
    return True, f"YouTube OK — channel '{it['snippet']['title']}', long uploads: {it['status'].get('longUploadsStatus', '?')}"


def check_facebook():
    ver = channel()["facebook"].get("graph_version", "v21.0")
    r = requests.get(f"https://graph.facebook.com/{ver}/{os.environ['FB_PAGE_ID']}", params={"fields": "name", "access_token": os.environ["FB_PAGE_TOKEN"]}, timeout=30)
    if not r.ok:
        return False, f"Facebook token/page check failed ({r.status_code}): {r.json().get('error', {}).get('message', '')[:160]}"
    return True, f"Facebook OK — page '{r.json().get('name')}'"


def main():
    ci = "--ci" in sys.argv
    groups = {}
    for n, g in SECRETS.items():
        groups.setdefault(g, []).append(n)
    ok_platforms = []
    fatal = False
    for g, names in groups.items():
        missing = [n for n in names if not present(n)]
        if missing:
            print(f"✗ {g}: missing secret(s) {', '.join(missing)}")
            if g == "voice":
                fatal = True
            continue
        try:
            ok, msg = {"voice": check_eleven, "youtube": check_youtube, "facebook": check_facebook}[g]()
        except Exception as e:  # noqa
            ok, msg = False, f"{g} check error: {e}"
        print(("✓ " if ok else "✗ ") + msg)
        if g == "voice" and not ok:
            fatal = True
        if g != "voice" and ok:
            ok_platforms.append(g)
    print("platforms ready:", ", ".join(ok_platforms) or "none (videos will be produced as dry-run artifacts)")
    if ci:
        gh = os.environ.get("GITHUB_ENV")
        if gh:
            with open(gh, "a") as f:
                f.write(f"READY_PLATFORMS={','.join(ok_platforms)}\n")
    if fatal:
        print("FATAL: ElevenLabs key missing or invalid — cannot produce voice.")
        sys.exit(1)


if __name__ == "__main__":
    main()
