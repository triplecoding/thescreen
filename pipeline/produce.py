"""Produce one finished video from a script.

usage: python pipeline/produce.py 001 [--tts elevenlabs|edge] [--workers N] [--stills]
Outputs into out/<id>/: video.mp4, thumb_9x16.png, thumb_16x9.png, timeline.json, meta.json, captions.srt
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import audio  # noqa: E402
import timeline as TLM  # noqa: E402
import voice  # noqa: E402
from common import OUT, ROOT, SCRIPTS, channel, load_json, log, plain, run, save_json  # noqa: E402
from validate import check  # noqa: E402


def srt(tl):
    def ts(x):
        h, r = divmod(x, 3600); m, s = divmod(r, 60)
        return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int((s - int(s)) * 1000):03d}"
    lines = []
    for i, (b, sb) in enumerate(zip(tl["beats"], tl["script"]["beats"]), 1):
        a = b["start"] + b["audioStart"]
        lines += [str(i), f"{ts(a)} --> {ts(a + b['audioDur'])}", plain(sb.get("say", "")), ""]
    return "\n".join(lines)


def thumbnails(tl_path, odir):
    stills = odir / "stills"
    run(["node", ROOT / "pipeline" / "render.js", tl_path, stills, "1", "--frames", "0.05"])
    src = next(stills.glob("f_0.05.png"))
    from PIL import Image, ImageFilter
    v = Image.open(src).convert("RGB")
    v.save(odir / "thumb_9x16.png")
    # 16:9: blurred fill + sharp vertical frame + logo
    W, H = 1280, 720
    bg = v.resize((W, int(W * 1920 / 1080))).crop((0, 200, W, 200 + H)).filter(ImageFilter.GaussianBlur(28))
    fg = v.resize((int(H * 1080 / 1920), H))
    bg.paste(fg, ((W - fg.width) // 2, 0))
    logo = Image.open(ROOT / "assets" / "brand" / "logo.png").convert("RGBA")
    logo.thumbnail((260, 150))
    bg.paste(logo, (W - logo.width - 24, H - logo.height - 18), logo)
    bg.save(odir / "thumb_16x9.jpg", quality=92)
    v.convert("RGB").save(odir / "thumb_9x16.jpg", quality=92)


def qa(video, tl):
    cfg = channel()
    info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", str(video)], capture_output=True, text=True).stdout)
    dur = float(info["format"]["duration"])
    types = [s["codec_type"] for s in info["streams"]]
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    problems = []
    if "audio" not in types: problems.append("no audio stream")
    if (v["width"], v["height"]) != (1080, 1920): problems.append(f"bad size {v['width']}x{v['height']}")
    if not (cfg["duration"]["min"] - 0.5 <= dur <= cfg["duration"]["max"] + 0.5): problems.append(f"duration {dur:.1f}s outside window")
    # black / frozen detection (cheap)
    bd = subprocess.run(["ffmpeg", "-v", "info", "-i", str(video), "-vf", "blackdetect=d=1.0:pix_th=0.05", "-an", "-f", "null", "-"], capture_output=True, text=True).stderr
    if "black_start" in bd: problems.append("black segment detected")
    return dur, problems


LESSON_KINDS = {"book", "concept", "takeaways", "ask"}


def story_only(script):
    """Owner rule (Nov 2026): no book card, no lesson list, no 'screen turns to you' question in the video —
    only the story and a 2-line closing (the outro). Older scripts that still contain those beats are trimmed here."""
    if channel().get("story_only", True):
        script = dict(script)
        script["beats"] = [b for b in script["beats"] if b.get("kind", "story") not in LESSON_KINDS]
    return script


def produce(sid, tts="elevenlabs", workers=0, stills=False):
    path = SCRIPTS / f"{sid}.json"
    script = story_only(load_json(path))
    errs, warns, est = check(path)
    for w in warns: log("warn:", w)
    if errs:
        raise RuntimeError("script invalid: " + "; ".join(errs))
    odir = OUT / sid
    odir.mkdir(parents=True, exist_ok=True)
    work = odir / "work"
    clips = voice.generate(script, work, tts)
    rows, total, speed = TLM.build(script, clips)
    tl = TLM.finalize(script, clips, rows, total, speed, work)
    tl_path = odir / "timeline.json"
    save_json(tl_path, tl)
    if stills:
        times = [round(b["start"] + 0.9, 2) for b in tl["beats"]]
        run(["node", ROOT / "pipeline" / "render.js", tl_path, odir / "stills", "1", "--frames", ",".join(map(str, times))])
        return odir
    silent = odir / "video_silent.mp4"
    if silent.exists(): silent.unlink()
    run(["node", ROOT / "pipeline" / "render.js", tl_path, silent, str(workers or 0)])
    wav = odir / "mix.wav"
    seed = int(sid) if sid.isdigit() else 7
    audio.mix(script, tl, clips, wav, seed)
    final = odir / "video.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final])
    (odir / "captions.srt").write_text(srt(tl), encoding="utf-8")
    thumbnails(tl_path, odir)
    dur, problems = qa(final, tl)
    meta = {"id": sid, "duration": round(dur, 2), "problems": problems, "tts": tts, "title": script["youtube"]["title"]}
    save_json(odir / "meta.json", meta)
    if problems:
        raise RuntimeError("QA failed: " + "; ".join(problems))
    log(f"✓ produced {final} ({dur:.1f}s)")
    return odir


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("id")
    ap.add_argument("--tts", default="elevenlabs", choices=["elevenlabs", "edge"])
    ap.add_argument("--workers", type=int, default=0)
    ap.add_argument("--stills", action="store_true")
    a = ap.parse_args()
    produce(a.id, a.tts, a.workers, a.stills)
