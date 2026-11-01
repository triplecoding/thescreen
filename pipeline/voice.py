"""Voice generation.

Production: ElevenLabs (pay-as-you-go key in ELEVENLABS_API_KEY). Owner rules: model eleven_v4_turbo ONLY, language bn ONLY,
voices = the owner's fixed voice ids in config/voices.json (no voice design, no fallback model).
Preview only (never used for publishing): Microsoft Edge neural voices, so the system can be tested without a key.
"""
import base64
import hashlib
import json
import os
import subprocess
import time
from pathlib import Path

import requests

from common import CACHE, CONFIG, channel, env, load_json, log, plain, save_json, tokens

API = "https://api.elevenlabs.io"
VOICES_FILE = CONFIG / "voices.json"


# ---------------------------------------------------------------- ElevenLabs
class Eleven:
    def __init__(self):
        self.key = env("ELEVENLABS_API_KEY")
        self.cfg = channel()["elevenlabs"]
        self.s = requests.Session()
        self.s.headers.update({"xi-api-key": self.key})
        self._model = None
        self._model_langs = None

    def _req(self, method, path, **kw):
        for i in range(5):
            r = self.s.request(method, API + path, timeout=180, **kw)
            if r.status_code in (429, 500, 502, 503, 504, 409):
                wait = 5 * (2 ** i)
                log(f"elevenlabs {r.status_code} on {path}; retry in {wait}s")
                time.sleep(wait)
                continue
            return r
        return r

    def model(self):
        """Owner rule: ONLY eleven_v4_turbo, ONLY Bangla. No fallback to any other model."""
        if self._model:
            return self._model
        want = self.cfg["model_id"]
        try:
            r = self._req("GET", "/v1/models")
            if r.ok:
                ids = [m.get("model_id") for m in r.json()]
                if want not in ids:
                    raise RuntimeError(f"ElevenLabs model {want} is not available on this account (found: {', '.join(i for i in ids if i)[:300]})")
        except RuntimeError:
            raise
        except Exception as e:  # noqa - network hiccup on the listing; the TTS call itself will still enforce the model
            log("model listing check skipped:", e)
        self._model = want
        log("ElevenLabs model (locked):", self._model)
        return self._model

    def link_owner_voices(self):
        """Owner's voices come from ElevenLabs' public Voice Library. Add each one to this account's 'My Voices'
        (POST /v1/voices/add/{public_owner_id}/{voice_id}) so the API can use it. Updates config/voices.json if the id changes."""
        data = load_json(VOICES_FILE, {}) or {}
        report, changed = [], False
        for vid in sorted({v["voice_id"] for v in data.values()}):
            r = self._req("GET", f"/v1/voices/{vid}")
            if r.ok:
                report.append(f"{vid}: in My Voices ({r.json().get('name', '')})")
                continue
            sv = self._req("GET", "/v1/shared-voices", params={"search": vid, "page_size": 10})
            lib = [v for v in (sv.json().get("voices", []) if sv.ok else []) if v.get("voice_id") == vid]
            if not lib:
                report.append(f"{vid}: NOT FOUND in library")
                continue
            v = lib[0]
            add = self._req("POST", f"/v1/voices/add/{v['public_owner_id']}/{vid}", json={"new_name": f"TheScreen - {v.get('name', vid)}"[:100]})
            if not add.ok:
                report.append(f"{vid}: add failed {add.status_code} {add.text[:160]}")
                continue
            new_id = add.json().get("voice_id", vid)
            if new_id != vid:
                for role in data.values():
                    if role["voice_id"] == vid:
                        role["voice_id"] = new_id
                        role["library_id"] = vid
                changed = True
            report.append(f"{vid}: added to My Voices as '{v.get('name', '')}'" + (f" (new id {new_id})" if new_id != vid else ""))
        if changed:
            save_json(VOICES_FILE, data)
        return report, changed

    def ensure_voices(self, roles):
        """Voices are the owner's fixed ElevenLabs voice ids in config/voices.json. Never designs or swaps voices."""
        data = load_json(VOICES_FILE, {}) or {}
        if not getattr(self, "_linked", False):
            try:
                rep, _ = self.link_owner_voices()
                for line in rep:
                    log("voice", line)
                data = load_json(VOICES_FILE, {}) or {}
            except Exception as e:  # noqa
                log("voice linking skipped:", e)
            self._linked = True
        missing = [r for r in roles if not (data.get(r) or {}).get("voice_id")]
        if missing:
            raise RuntimeError(f"no voice id configured for role(s): {', '.join(missing)} — add them to config/voices.json")
        return data

    def tts(self, text, voice_id, settings, prev_text=None, next_text=None, seed=None):
        cfg = self.cfg
        body = {"text": text, "model_id": self.model(), "voice_settings": settings}
        body["language_code"] = "bn"
        if prev_text:
            body["previous_text"] = prev_text
        if next_text:
            body["next_text"] = next_text
        if seed is not None:
            body["seed"] = seed
        path = f"/v1/text-to-speech/{voice_id}/with-timestamps?output_format={cfg.get('output_format', 'mp3_44100_128')}"
        r = self._req("POST", path, json=body)
        if r.status_code in (400, 422):
            # keep model + language locked; only drop optional extras
            log(f"tts {r.status_code}: {r.text[:200]} — retrying without optional fields")
            for k in ("previous_text", "next_text", "seed"):
                body.pop(k, None)
            body["voice_settings"] = {k: v for k, v in settings.items() if k in ("stability", "similarity_boost", "style", "speed", "use_speaker_boost")}
            r = self._req("POST", path, json=body)
        if not r.ok:
            raise RuntimeError(f"tts failed {r.status_code}: {r.text[:300]}")
        j = r.json()
        return base64.b64decode(j["audio_base64"]), (j.get("alignment") or j.get("normalized_alignment"))


# ---------------------------------------------------------------- preview voice (edge)
EDGE = {"narrator": "bn-BD-PradeepNeural", "young_man": "bn-BD-PradeepNeural", "man": "bn-IN-BashkarNeural", "old_man": "bn-IN-BashkarNeural",
        "young_woman": "bn-BD-NabanitaNeural", "woman": "bn-IN-TanishaaNeural", "old_woman": "bn-IN-TanishaaNeural", "teen_boy": "bn-BD-PradeepNeural",
        "teen_girl": "bn-BD-NabanitaNeural", "child_boy": "bn-BD-NabanitaNeural", "child_girl": "bn-BD-NabanitaNeural"}
EDGE_PITCH = {"old_man": "-12Hz", "old_woman": "-6Hz", "teen_boy": "+18Hz", "teen_girl": "+22Hz", "child_boy": "+40Hz", "child_girl": "+45Hz", "man": "-4Hz"}


def edge_tts(text, role):
    import asyncio
    import edge_tts as et
    async def go():
        c = et.Communicate(text, EDGE.get(role, EDGE["narrator"]), rate="-4%", pitch=EDGE_PITCH.get(role, "+0Hz"))
        audio = b""
        async for ch in c.stream():
            if ch["type"] == "audio":
                audio += ch["data"]
        return audio
    for i in range(4):
        try:
            return asyncio.run(go()), None
        except Exception as e:  # noqa
            log("edge retry", e)
            time.sleep(2 + 3 * i)
    raise RuntimeError("edge tts failed")


# ---------------------------------------------------------------- helpers
def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)], capture_output=True, text=True)
    return float(out.stdout.strip())


def trim_silence(src, dst):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ac", "1", "-ar", "44100", "-af",
                    "silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.06,areverse",
                    "-c:a", "pcm_s16le", str(dst)], check=True)


def word_times(say, alignment, dur, lead_trim=0.0):
    """Map caption tokens to (start, end) seconds using ElevenLabs character alignment; fall back to proportional."""
    toks = tokens(say)
    out = []
    if alignment and alignment.get("characters"):
        chars = alignment["characters"]
        st, en = alignment["character_start_times_seconds"], alignment["character_end_times_seconds"]
        text = "".join(chars)
        cur = 0
        for tk in toks:
            core = tk.strip("“”\"'‘’—–-,.!?।…:;()")
            idx = text.find(core, cur) if core else -1
            if idx < 0:
                out.append(None)
                continue
            j = idx + len(core) - 1
            out.append([max(0.0, st[idx] - lead_trim), max(0.0, en[j] - lead_trim)])
            cur = j + 1
    if not out or all(o is None for o in out):
        out = [None] * len(toks)
    # fill gaps proportionally by character length
    lens = [max(1, len(t)) for t in toks]
    total = sum(lens)
    acc = 0
    est = []
    for L in lens:
        est.append([dur * acc / total, dur * (acc + L) / total])
        acc += L
    res = []
    for i, o in enumerate(out):
        res.append({"s": round((o or est[i])[0], 3), "e": round((o or est[i])[1], 3)})
    for i in range(1, len(res)):  # monotonic
        if res[i]["s"] < res[i - 1]["s"]:
            res[i]["s"] = res[i - 1]["s"]
    return res


def tts_text(beat, cfg):
    t = plain(beat.get("say", ""))
    tone = beat.get("tone")
    if tone and cfg["elevenlabs"].get("audio_tags") and tone in cfg["elevenlabs"].get("allowed_tags", []):
        t = f"[{tone}] {t}"
    return t


def role_for(script, voice):
    if voice in (None, "narrator"):
        return "narrator"
    c = (script.get("cast") or {}).get(voice)
    return (c or {}).get("voice") or "narrator"


def generate(script, workdir, provider="elevenlabs"):
    """Create one trimmed WAV per beat. Returns list of {wav, dur, words}."""
    cfg = channel()
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(exist_ok=True)
    beats = script["beats"]
    roles = sorted({role_for(script, b.get("voice")) for b in beats})
    el = None
    voices = {}
    if provider == "elevenlabs":
        el = Eleven()
        voices = el.ensure_voices(roles)
    results = []
    for i, b in enumerate(beats):
        role = role_for(script, b.get("voice"))
        text = tts_text(b, cfg) if provider == "elevenlabs" else plain(b.get("say", ""))
        if provider == "elevenlabs":
            vid = voices[role]["voice_id"]
            settings = dict(cfg["elevenlabs"]["default_settings"])
            settings.update(cfg["voices"].get(role, {}).get("settings", {}))
            prev_t = plain(beats[i - 1]["say"]) if i and role_for(script, beats[i - 1].get("voice")) == role else None
            next_t = plain(beats[i + 1]["say"]) if i + 1 < len(beats) and role_for(script, beats[i + 1].get("voice")) == role else None
            key = hashlib.sha1(json.dumps([text, vid, el.model(), settings, prev_t, next_t], ensure_ascii=False).encode()).hexdigest()[:20]
        else:
            key = hashlib.sha1(json.dumps(["edge", text, role]).encode()).hexdigest()[:20]
        mp3 = CACHE / f"{key}.mp3"
        al_path = CACHE / f"{key}.json"
        if not mp3.exists():
            if provider == "elevenlabs":
                audio, alignment = el.tts(text, vid, settings, prev_t, next_t, seed=int(key[:6], 16))
            else:
                audio, alignment = edge_tts(text, role)
            mp3.write_bytes(audio)
            save_json(al_path, alignment or {})
            log(f"voice {i + 1}/{len(beats)} [{role}] {len(text)} chars")
        alignment = load_json(al_path, {}) or {}
        wav = workdir / f"v_{i:03d}.wav"
        raw_dur = duration(mp3)
        trim_silence(mp3, wav)
        d = duration(wav)
        # estimate how much leading silence was trimmed for alignment offset
        lead = 0.0
        if alignment.get("character_start_times_seconds"):
            first = next((s for s, c in zip(alignment["character_start_times_seconds"], alignment["characters"]) if "\u0980" <= c <= "\u09FF"), 0.0)
            lead = max(0.0, min(first, raw_dur - d))
        results.append({"wav": str(wav), "dur": d, "words": word_times(b.get("say", ""), alignment, d, lead), "role": role})
    return results
