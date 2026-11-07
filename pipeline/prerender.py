"""Render upcoming videos in advance (real ElevenLabs voice) and keep them in the GitHub release 'ready-videos',
so publishing later only uploads. No YouTube/Facebook calls here.

usage: python pipeline/prerender.py --shard 0 --shards 3 [--minutes 300]
Renders the queued scripts (id order) whose index % shards == shard and that are not stored yet. Also removes stored
videos whose script has already been posted."""
import argparse
import os
import shutil
import subprocess
import sys
import tarfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import OUT, ROOT, STATE, load_json, log  # noqa: E402
from daily import queue  # noqa: E402
import produce as P  # noqa: E402


def gh(*a):
    return subprocess.run(["gh", *a], cwd=ROOT, capture_output=True, text=True)


def stored():
    """Asset names of the 'ready-videos' release (REST; created by the workflow's prep job)."""
    repo = os.environ.get("GITHUB_REPOSITORY", "triplecoding/thescreen")
    r = gh("api", f"repos/{repo}/releases/tags/{P.STASH}", "--jq", ".id")
    if r.returncode != 0:
        return set()
    rid, names = r.stdout.strip(), set()
    for page in range(1, 11):
        got = set(gh("api", f"repos/{repo}/releases/{rid}/assets?per_page=100&page={page}", "--jq", ".[].name").stdout.split())
        names |= got
        if len(got) < 100:
            break
    return names


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shard", type=int, default=0)
    ap.add_argument("--shards", type=int, default=1)
    ap.add_argument("--minutes", type=int, default=300)
    ap.add_argument("--max", type=int, default=999)
    a = ap.parse_args()
    t0 = time.time()
    os.environ["NO_STASH"] = "1"
    state = load_json(STATE, {}) or {}
    have = stored()
    posted = {p["id"] for p in state.get("posted", [])}
    if a.shard == 0:
        for name in sorted(have):
            if name.endswith(".tgz") and name[:-4] in posted:
                gh("release", "delete-asset", P.STASH, name, "-y"); log(f"stash: removed {name} (already posted)")
    q = queue(state)
    mine = [sid for i, sid in enumerate(q) if i % a.shards == a.shard and f"{sid}.tgz" not in have]
    log(f"prerender shard {a.shard}/{a.shards}: {len(mine)} to render")
    done = fails = 0
    for sid in mine[:a.max]:
        if time.time() - t0 > a.minutes * 60:
            log("time budget used"); break
        try:
            odir = P.produce(sid, "elevenlabs")
            tgz = OUT / f"{sid}.tgz"
            with tarfile.open(tgz, "w:gz") as t:
                for f in P.STASH_FILES:
                    if (Path(odir) / f).exists():
                        t.add(Path(odir) / f, arcname=f)
            r = gh("release", "upload", P.STASH, str(tgz), "--clobber")
            log(f"stash: stored {sid}" if r.returncode == 0 else f"stash: upload {sid} failed {r.stderr[:200]}")
            done += 1
        except Exception as e:  # noqa
            fails += 1
            log(f"prerender {sid} failed: {str(e)[:300]}")
            if any(w in str(e).lower() for w in ("quota", "credits", "unauthorized", "401")) or fails >= 3:
                log("stopping (voice service problem or repeated failures)"); break
        finally:
            shutil.rmtree(OUT / sid, ignore_errors=True)
            (OUT / f"{sid}.tgz").unlink(missing_ok=True)
    log(f"prerender shard {a.shard}: stored {done}, failed {fails}")
    left = len(mine) - done - fails
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as f:
            f.write(f"left={max(left, 0)}\n")


if __name__ == "__main__":
    main()
