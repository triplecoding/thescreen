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
        if want not in ids:
            return False, f"ElevenLabs model {want} NOT available on this account"
        msg += f"; model {want}: available (locked, bn)"
    import json as _j
    vfile = Path(__file__).resolve().parent.parent / "config" / "voices.json"
    vids = sorted({v["voice_id"] for v in _j.loads(vfile.read_text()).values()})
    bad = []
    for vid in vids:
        rr = requests.get(f"https://api.elevenlabs.io/v1/voices/{vid}", headers=H, timeout=30)
        if not rr.ok:
            detail = ""
            try:
                d = rr.json().get("detail")
                detail = d.get("status", "") + ": " + d.get("message", "")[:120] if isinstance(d, dict) else str(d)[:120]
            except Exception:  # noqa
                pass
            # is it a public library voice that just isn't in "My Voices"?
            sv = requests.get("https://api.elevenlabs.io/v1/shared-voices", headers=H, params={"search": vid, "page_size": 5}, timeout=30)
            lib = [v for v in (sv.json().get("voices", []) if sv.ok else []) if v.get("voice_id") == vid]
            bad.append(f"{vid}({rr.status_code} {detail}{' | in public library: ' + lib[0].get('name', '') if lib else ''})")
    msg += f"; voices {len(vids) - len(bad)}/{len(vids)} reachable" + (f" — NOT reachable: {', '.join(bad)}" if bad else "")
    if bad:
        return False, msg
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
    info = requests.get("https://oauth2.googleapis.com/tokeninfo", params={"access_token": tok}, timeout=30).json()
    scopes = set(info.get("scope", "").split())
    need = {"https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube", "https://www.googleapis.com/auth/youtube.force-ssl"}
    missing = [x.rsplit("/", 1)[-1] for x in need - scopes]
    extra = " +analytics" if "https://www.googleapis.com/auth/yt-analytics.readonly" in scopes else " (no analytics scope)"
    msg = f"YouTube OK — channel '{it['snippet']['title']}', long uploads: {it['status'].get('longUploadsStatus', '?')}, scopes ok{extra}"
    if missing:
        return False, f"YouTube channel '{it['snippet']['title']}' found but token is missing scope(s): {', '.join(missing)}"
    return True, msg


def check_facebook():
    ver = channel()["facebook"].get("graph_version", "v21.0")
    r = requests.get(f"https://graph.facebook.com/{ver}/{os.environ['FB_PAGE_ID']}", params={"fields": "name", "access_token": os.environ["FB_PAGE_TOKEN"]}, timeout=30)
    if not r.ok:
        return False, f"Facebook token/page check failed ({r.status_code}): {r.json().get('error', {}).get('message', '')[:160]}"
    name = r.json().get("name")
    tok = os.environ["FB_PAGE_TOKEN"]
    me = requests.get(f"https://graph.facebook.com/{ver}/me", params={"fields": "id,name", "access_token": tok}, timeout=30).json()
    kind = "Page token" if str(me.get("id")) == str(os.environ["FB_PAGE_ID"]) else f"NOT a page token (token belongs to {me.get('name', '?')})"
    if "NOT a page" in kind:
        ex = requests.get(f"https://graph.facebook.com/{ver}/{os.environ['FB_PAGE_ID']}", params={"fields": "access_token", "access_token": tok}, timeout=30).json()
        if ex.get("access_token"):
            kind = f"user/system-user token ({me.get('name', '?')}) — page token derived automatically ✓"
            tok = ex["access_token"]
        else:
            kind += f"; could not derive page token: {ex.get('error', {}).get('message', '')[:120]}"
    perms = requests.get(f"https://graph.facebook.com/{ver}/me/permissions", params={"access_token": tok}, timeout=30)
    granted = []
    if perms.ok:
        granted = [p["permission"] for p in perms.json().get("data", []) if p.get("status") == "granted"]
    dbg = requests.get(f"https://graph.facebook.com/{ver}/debug_token", params={"input_token": tok, "access_token": tok}, timeout=30).json().get("data", {})
    exp = dbg.get("expires_at", None)
    scopes = dbg.get("scopes") or granted
    need = ["pages_manage_posts", "pages_read_engagement", "pages_manage_engagement", "pages_show_list"]
    miss = [p for p in need if scopes and p not in scopes]
    exp_txt = "never expires" if exp == 0 else (f"expires_at={exp}" if exp else "expiry unknown")
    ok = "NOT a page" not in kind and not miss
    return ok, f"Facebook {'OK' if ok else 'PROBLEM'} — page '{name}', {kind}, {exp_txt}" + (f", missing: {', '.join(miss)}" if miss else ", permissions ok")


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
    if not present("ELEVENLABS_API_KEY"):
        print("NOT CONFIGURED: add ELEVENLABS_API_KEY in GitHub → Settings → Secrets → Actions. Skipping production (not an error).")
        if ci and os.environ.get("GITHUB_ENV"):
            with open(os.environ["GITHUB_ENV"], "a") as f:
                f.write("SKIP_PRODUCTION=1\n")
        return
    if fatal:
        print("FATAL: ElevenLabs key invalid — cannot produce voice.")
        sys.exit(1)


if __name__ == "__main__":
    main()
