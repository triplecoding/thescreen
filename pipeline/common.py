"""Shared paths, config and helpers for The Screen pipeline."""
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "config"
SCRIPTS = ROOT / "scripts"
OUT = ROOT / "out"
CACHE = ROOT / ".cache"
STATE = ROOT / "state.json"


def load_json(p, default=None):
    p = Path(p)
    if not p.exists():
        return default
    return json.loads(p.read_text(encoding="utf-8"))


def save_json(p, data):
    p = Path(p)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(p)


def channel():
    return load_json(CONFIG / "channel.json")


def log(*a):
    print(f"[{datetime.now().strftime('%H:%M:%S')}]", *a, flush=True)


def run(cmd, **kw):
    log("$", " ".join(str(c) for c in cmd)[:240])
    r = subprocess.run([str(c) for c in cmd], **kw)
    if r.returncode != 0:
        raise RuntimeError(f"command failed ({r.returncode}): {cmd[0]}")
    return r


def env(name, required=True):
    v = os.environ.get(name, "").strip()
    if required and not v:
        raise RuntimeError(f"missing secret/env: {name}")
    return v


def retry(fn, tries=4, base=4, what="op"):
    last = None
    for i in range(tries):
        try:
            return fn()
        except Exception as e:  # noqa
            last = e
            wait = base * (2 ** i)
            log(f"{what} failed ({e}); retry {i + 1}/{tries} in {wait}s")
            time.sleep(wait)
    raise last


def plain(s):
    return (s or "").replace("*", "")


def tokens(say):
    """Caption tokens exactly as the renderer splits them."""
    return [t for t in plain(say).split() if t]
