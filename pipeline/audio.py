"""Soundtrack: voice placement, an original procedural score (no licensing risk), subtle SFX, ducking, loudness."""
import random
import subprocess
from pathlib import Path

import numpy as np

from common import ROOT, channel, log

SR = 44100


def read_wav(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def note_freq(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def piano(freq, dur, vel=0.5):
    t = np.arange(int(SR * dur)) / SR
    env = np.exp(-t * (2.2 + freq / 900)) * (1 - np.exp(-t * 180))
    tone = (np.sin(2 * np.pi * freq * t) + 0.45 * np.sin(2 * np.pi * 2 * freq * t) * np.exp(-t * 3) +
            0.18 * np.sin(2 * np.pi * 3 * freq * t) * np.exp(-t * 5) + 0.06 * np.sin(2 * np.pi * 4.01 * freq * t) * np.exp(-t * 7))
    return (tone * env * vel).astype(np.float32)


def pad(freqs, dur):
    t = np.arange(int(SR * dur)) / SR
    s = np.zeros_like(t)
    for f in freqs:
        for d in (-0.12, 0.0, 0.11):
            s += np.sin(2 * np.pi * (f * (1 + d / 100)) * t + random.random() * 6.28)
            s += 0.3 * np.sin(2 * np.pi * (2 * f * (1 + d / 100)) * t)
    att = np.minimum(1, t / 1.2)
    rel = np.minimum(1, (dur - t) / 1.2)
    return (s * att * np.clip(rel, 0, 1) / (len(freqs) * 3)).astype(np.float32)


def reverb(x, seconds=2.6, mix=0.32):
    n = int(SR * seconds)
    rng = np.random.default_rng(3)
    ir = rng.standard_normal(n).astype(np.float32) * np.exp(-np.arange(n) / SR * 3.2).astype(np.float32)
    ir /= np.sqrt((ir ** 2).sum())
    L = len(x) + n
    nfft = 1 << (L - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[:len(x)].astype(np.float32)
    return (1 - mix) * x + mix * wet * 0.9


PROGRESSIONS = [
    [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],   # Am F C G
    [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]],   # C G Am F
    [[53, 57, 60], [55, 59, 62], [52, 55, 59], [57, 60, 64]],   # F G Em Am
    [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]],   # Dm Bb F C
]


def score(total, seed, lift_at=None):
    """Gentle cinematic piano + pad. 'lift_at' (seconds) adds a brighter arpeggio for the lesson section."""
    random.seed(seed)
    prog = PROGRESSIONS[seed % len(PROGRESSIONS)]
    bpm = 68 + seed % 8
    beat = 60.0 / bpm
    bar = beat * 4
    n = int(SR * (total + 3))
    out = np.zeros(n, np.float32)
    t = 0.0
    k = 0
    while t < total + 1:
        chord = prog[k % 4]
        start = int(t * SR)
        p = pad([note_freq(m - 12) for m in chord], bar + 1.2) * 0.22
        out[start:start + len(p)] += p[:max(0, n - start)]
        bass = piano(note_freq(chord[0] - 24), bar, 0.35)
        out[start:start + len(bass)] += bass[:max(0, n - start)]
        lifted = lift_at is not None and t >= lift_at
        pattern = [0, 1, 2, 1, 2, 1, 0, 2] if lifted else [0, 2, 1, 2]
        step = bar / len(pattern)
        for j, idx in enumerate(pattern):
            m = chord[idx] + (12 if lifted and j % 2 else 0)
            v = 0.16 + 0.05 * random.random()
            s = max(0, int((t + j * step + random.uniform(-0.01, 0.01)) * SR))
            pn = piano(note_freq(m), 2.4, v)
            if s < n:
                out[s:s + len(pn)] += pn[:n - s]
        t += bar
        k += 1
    out = reverb(out, 2.8, 0.35)
    fade = np.ones(n, np.float32)
    fi, fo = int(SR * 1.5), int(SR * 3)
    fade[:fi] = np.linspace(0, 1, fi)
    end = int(SR * total)
    fade[end - fo:end] = np.linspace(1, 0, fo)
    fade[end:] = 0
    out *= fade
    return out[:end] / (np.abs(out).max() + 1e-6) * 0.5


def sfx_whoosh(dur=0.45):
    t = np.arange(int(SR * dur)) / SR
    noise = np.random.default_rng(1).standard_normal(len(t)).astype(np.float32)
    env = np.sin(np.pi * t / dur) ** 2
    # crude band sweep by mixing differently smoothed noise
    k = np.convolve(noise, np.ones(18) / 18, "same")
    return (k * env * 0.35).astype(np.float32)


def sfx_pop():
    t = np.arange(int(SR * 0.09)) / SR
    f = 950 - 4000 * t
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 45) * 0.25).astype(np.float32)


def sfx_ding():
    t = np.arange(int(SR * 1.6)) / SR
    s = np.sin(2 * np.pi * 1318.5 * t) + 0.5 * np.sin(2 * np.pi * 2637 * t) * np.exp(-t * 3) + 0.25 * np.sin(2 * np.pi * 1975.5 * t)
    return (s * np.exp(-t * 2.6) * 0.16).astype(np.float32)


def mix(script, timeline, clips, out_wav, seed):
    cfg = channel()
    total = timeline["duration"]
    n = int(SR * total) + SR
    voice = np.zeros(n, np.float32)
    for c, b in zip(clips, timeline["beats"]):
        a = read_wav(c.get("wav_final", c["wav"]))
        s = int((b["start"] + b["audioStart"]) * SR)
        voice[s:s + len(a)] += a[:max(0, n - s)]
    # music
    beats = script["beats"]
    lift = next((b["start"] for b, sb in zip(timeline["beats"], beats) if sb.get("kind") == "takeaways"), None)
    custom = sorted((ROOT / "assets" / "music").glob("*.mp3"))
    if custom:
        track = custom[seed % len(custom)]
        log("music:", track.name)
        m = read_wav(track)
        if len(m) < n:
            m = np.tile(m, int(np.ceil(n / len(m))))
        m = m[:n] / (np.abs(m).max() + 1e-6) * 0.5
        fo = int(SR * 3)
        m[int(SR * total) - fo:int(SR * total)] *= np.linspace(1, 0, fo)
        m[int(SR * total):] = 0
    else:
        m = score(total, seed, lift)
        m = np.pad(m, (0, max(0, n - len(m))))[:n]
    # ducking from smoothed voice envelope
    env = np.abs(voice)
    win = int(SR * 0.25)
    env = np.convolve(env, np.ones(win) / win, "same")
    env = np.clip(env / (np.percentile(env[env > 0], 90) + 1e-6), 0, 1) if env.any() else env
    duck = 1 - cfg["music"].get("duck", 0.55) * env
    vol = 10 ** (cfg["music"].get("volume_db", -21) / 20)
    music = m * duck * vol * 2.0
    # sfx at structure changes
    fx = np.zeros(n, np.float32)
    kinds = [b.get("kind", "story") for b in beats]
    def put(sig, t):
        s = int(t * SR)
        fx[s:s + len(sig)] += sig[:max(0, n - s)]
    for i, (b, tb) in enumerate(zip(beats, timeline["beats"])):
        prev = beats[i - 1] if i else None
        if prev is not None:
            new_set = kinds[i] == "story" and (b.get("scene") or {}).get("set") and (b.get("scene") or {}).get("set") != _set_of(beats, i - 1)
            if kinds[i] != kinds[i - 1] or new_set:
                put(sfx_whoosh(), max(0, tb["start"] - 0.15))
        if kinds[i] == "takeaways" and b.get("show", 0) > 0:
            put(sfx_pop(), tb["start"] + 0.12)
        if kinds[i] == "list" and (not prev or kinds[i - 1] != "list"):
            for j in range(len((b.get("card") or {}).get("items", []))):
                put(sfx_pop(), tb["start"] + 0.6 + j * min(0.75, max(0.35, (tb["end"] - tb["start"] - 0.8) / 3)))
        if kinds[i] == "book" and b.get("reveal"):
            put(sfx_ding(), tb["start"] + 0.2)
    final = voice + music + fx * 0.8
    peak = np.abs(final).max()
    if peak > 0.98:
        final *= 0.98 / peak
    pcm = (np.clip(final, -1, 1) * 32767).astype(np.int16)
    tmp = Path(out_wav).with_suffix(".raw")
    tmp.write_bytes(pcm.tobytes())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", str(tmp), "-t", f"{total:.3f}",
                    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", str(SR), "-ac", "2", str(out_wav)], check=True)
    tmp.unlink()
    return out_wav


def _set_of(beats, i):
    for j in range(i, -1, -1):
        sc = beats[j].get("scene") or {}
        if beats[j].get("kind", "story") == "story" and sc.get("set"):
            return sc["set"]
    return None
