"""Build the beat timeline from voice clips and fit total length into the channel's duration window."""
import subprocess
from pathlib import Path

from common import channel, log

FPS = 30
LEAD_FIRST = 0.35
LEAD = 0.10
LEAD_KIND_CHANGE = 0.30
DEFAULT_PAUSE = 0.28
MIN_BEAT = {"book": 2.4, "statement": 2.0}
OUTRO_HOLD = 3.4  # logo lockup needs time after the last line


class TooLong(Exception):
    pass


class TooShort(Exception):
    pass


def envelope(wav, fps=FPS):
    """Mouth-movement envelope (0..1) at video frame rate."""
    import numpy as np
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(wav), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True).stdout
    a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0
    hop = 16000 // fps
    n = max(1, len(a) // hop)
    rms = np.array([np.sqrt(np.mean(a[i * hop:(i + 1) * hop] ** 2) + 1e-9) for i in range(n)])
    if rms.max() <= 0:
        return [0.0] * n
    v = np.clip((rms / (np.percentile(rms, 95) + 1e-6)) ** 0.8, 0, 1)
    # quantise to a few mouth shapes for a hand-animated feel
    v = np.round(v * 4) / 4
    return [round(float(x), 2) for x in v]


def atempo(src, dst, f):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-filter:a", f"atempo={f:.4f}", "-c:a", "pcm_s16le", str(dst)], check=True)


def build(script, clips, fit=True):
    cfg = channel()
    dmin, dmax = cfg["duration"]["min"], cfg["duration"]["max"]
    beats = script["beats"]
    kinds = [b.get("kind", "story") for b in beats]

    def layout(pause_scale=1.0, extra=0.0, speed=1.0):
        t = 0.0
        rows = []
        for i, (b, c) in enumerate(zip(beats, clips)):
            lead = LEAD_FIRST if i == 0 else (LEAD_KIND_CHANGE if kinds[i] != kinds[i - 1] else LEAD)
            dur = c["dur"] / speed
            pause = b.get("pause", DEFAULT_PAUSE) * pause_scale + extra
            length = lead + dur + pause
            k = kinds[i]
            if k in MIN_BEAT:
                length = max(length, MIN_BEAT[k])
            if k == "outro":
                length = max(length, lead + dur + OUTRO_HOLD)
            rows.append({"start": round(t, 3), "end": round(t + length, 3), "audioStart": lead, "audioDur": dur})
            t += length
        return rows, t

    rows, total = layout()
    speed, pscale, extra = 1.0, 1.0, 0.0
    if fit:
        eps = 0.05
        if total > dmax + eps:
            # keep the emotional pauses as long as possible: first a gentle speed-up, then trim pauses, then more speed
            for sp, ps in ((1.02, 1.0), (1.04, 1.0), (1.04, 0.85), (1.06, 0.85), (1.06, 0.7), (1.08, 0.7), (1.08, 0.55), (1.10, 0.55)):
                rows, total = layout(ps, 0, sp)
                speed, pscale = sp, ps
                if total <= dmax + eps:
                    break
            if total > dmax + eps:
                raise TooLong(f"script runs {total:.1f}s even after tightening (max {dmax}s); trim ~{total - dmax:.0f}s of narration")
        if total < dmin - eps:
            for ex in (0.1, 0.2, 0.3, 0.4, 0.5, 0.6):
                rows, total = layout(1.0, ex)
                extra = ex
                if total >= dmin - eps:
                    break
            if total < dmin - eps:
                raise TooShort(f"script runs only {total:.1f}s (min {dmin}s); add ~{dmin - total:.0f}s of narration")
    log(f"timeline: {total:.1f}s  (speed x{speed:.3f}, pauses x{pscale}, +{extra}s/beat)")
    return rows, total, speed


def finalize(script, clips, rows, total, speed, workdir):
    """Apply speed to clips if needed, compute envelopes, return the renderer timeline."""
    workdir = Path(workdir)
    out_beats = []
    for i, (c, r) in enumerate(zip(clips, rows)):
        wav = c["wav"]
        words = c["words"]
        if abs(speed - 1.0) > 1e-3:
            fast = workdir / f"vf_{i:03d}.wav"
            atempo(wav, fast, speed)
            wav = str(fast)
            words = [{"s": round(w["s"] / speed, 3), "e": round(w["e"] / speed, 3)} for w in words]
        c["wav_final"] = wav
        out_beats.append({**r, "words": words, "env": envelope(wav) if script["beats"][i].get("voice") not in (None, "narrator") else []})
    return {"fps": FPS, "duration": round(total, 3), "script": script, "beats": out_beats}
