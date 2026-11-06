"""Write new story scripts with the Anthropic API (runs in GitHub Actions, no Claude session needed).

Keeps the queue full: when fewer than MIN_QUEUE ready scripts remain, writes new ones (at most MAX_NEW per run),
validates each with validate.py (errors go back to the model for a fix, up to 3 rounds) and appends data/used.json.
Needs the GitHub secret ANTHROPIC_API_KEY (console.anthropic.com, pay-as-you-go). Without it: does nothing.

usage: python pipeline/write_scripts.py [--force N]
"""
import argparse
import json
import os
import re
import sys
import time
from collections import Counter
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
from common import ROOT, SCRIPTS, STATE, load_json, log  # noqa: E402
import validate  # noqa: E402

MODEL = os.environ.get("SCRIPT_MODEL", "claude-sonnet-5-5")
MIN_QUEUE = int(os.environ.get("MIN_QUEUE", "60"))     # 10 days of 6 videos
MAX_NEW = int(os.environ.get("MAX_NEW", "12"))
THEMES = ["parents", "siblings", "family", "work", "money", "struggle", "community", "school", "probashi", "honesty"]

RULES = """You write ONE new script for "The Screen" (দ্য স্ক্রিন — গল্পে দেখি জীবন), a Bangla story video channel.
Absolute owner rules:
- STORY ONLY. No `book`, `concept`, `takeaways` or `ask` beats. Never name the book, author or theory anywhere in the
  narration, dialogue, title, caption or thumbnail. No "কী শিখলাম", no lesson voice-over.
- The book idea (pick one from books.json, never The 48 Laws of Power) is only the hidden spine. The story and its
  scenario must be fully original — different from every hook listed under "Already used".
- Ending: the story's own after-scene (show the change), then ONE `outro` beat with a 2-line closing (line1 ending
  "…", line2 3–6 words). Nothing after it.
- Length: the validator estimates speech at chars/12.2 + 0.5 s per spoken beat + 4 s; aim for 128–145 s
  (≈1,400–1,550 spoken characters, 24–32 beats, 8–12 dialogue lines, 2–3 speaking characters).
- Deeply Bangladeshi and realistic (story bible): one inner force + one emotional engine; real places, real BDT
  numbers, real objects; natural code-mixed speech written in Bangla script; correct address terms; a hook (a number +
  a problem) in the first beat; a turn every 15–20 s; no fairy tales, no violence, no politics/religion debate, no
  real people or brands, no children in danger.
- Use ONLY the sets/props/poses/moods/arms/holds/widgets/tones listed in SCRIPT_FORMAT.md (the validator rejects others).
- youtube.title: emotional hook ≤ 85 characters + one emoji (no "| book"). facebook.caption: 2 lines (payoff line +
  a question to the viewer ending with 👇) followed by 2 hashtags; no links. thumbnail.text 2–3 words.
- Set "theme" to the requested theme and "status": "ready".
Output: ONLY the JSON object of the script (same structure as the examples), plus one extra top-level key
"_used": {"relation": "...", "set": "...", "hook": "one-line English summary of the premise"}. No prose, no code fence."""


def api(messages, system):
    key = os.environ["ANTHROPIC_API_KEY"]
    for attempt in range(4):
        r = requests.post("https://api.anthropic.com/v1/messages", timeout=600, headers={
            "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": MODEL, "max_tokens": 24000, "system": system, "messages": messages})
        if r.ok:
            return "".join(b.get("text", "") for b in r.json().get("content", []) if b.get("type") == "text")
        log(f"anthropic api {r.status_code}: {r.text[:200]}")
        if r.status_code in (429, 500, 502, 503, 529):
            time.sleep(30 * (attempt + 1)); continue
        raise RuntimeError(f"anthropic api {r.status_code}")
    raise RuntimeError("anthropic api: retries exhausted")


def parse(text):
    a, b = text.find("{"), text.rfind("}")
    return json.loads(text[a:b + 1])


def context():
    docs = ROOT / "docs"
    parts = [f"=== {n} ===\n" + (docs / n).read_text(encoding="utf-8")
             for n in ("BANGLADESH_STORY_BIBLE.md", "STORY_GUIDE.md", "SCRIPT_FORMAT.md")]
    parts.append("=== data/books.json ===\n" + (ROOT / "data/books.json").read_text(encoding="utf-8"))
    ex = sorted(SCRIPTS.glob("*.json"))[-2:]
    for p in ex:
        parts.append(f"=== example script {p.name} ===\n" + p.read_text(encoding="utf-8"))
    return "\n\n".join(parts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", type=int, default=0, help="write N scripts regardless of the queue size")
    a = ap.parse_args()
    if not os.environ.get("ANTHROPIC_API_KEY"):
        log("write_scripts: no ANTHROPIC_API_KEY secret — skipping (add it in GitHub → Settings → Secrets → Actions)")
        return
    import daily
    state = load_json(STATE, {}) or {}
    q = daily.queue(state)
    n = a.force or max(0, min(MAX_NEW, MIN_QUEUE - len(q)))
    log(f"write_scripts: queue {len(q)} ready, writing {n}")
    if not n:
        return
    used_doc = load_json(ROOT / "data/used.json", {"used": []})
    system = [{"type": "text", "text": RULES}, {"type": "text", "text": context(), "cache_control": {"type": "ephemeral"}}]
    recent = [json.loads(p.read_text(encoding="utf-8")) for p in sorted(SCRIPTS.glob("*.json"))[-30:]]
    theme_count = Counter(s.get("theme") for s in recent)
    book_count = Counter((s.get("source") or {}).get("book") for s in recent)
    written = []
    nxt = int(sorted(SCRIPTS.glob("*.json"))[-1].stem) + 1
    for k in range(n):
        sid = f"{nxt:03d}"
        theme = min(THEMES, key=lambda t: (theme_count[t], THEMES.index(t)))
        hooks = "\n".join(f"- {u.get('hook', '')}" for u in used_doc["used"][-120:])
        user = (f"Write script id \"{sid}\". Theme: {theme}. Books used most in the last 30 scripts (prefer others): "
                f"{', '.join(b for b, _ in book_count.most_common(6) if b)}.\nAlready used (never repeat these premises):\n{hooks}")
        msgs = [{"role": "user", "content": user}]
        ok = False
        for rnd in range(4):
            try:
                text = api(msgs, system)
                s = parse(text)
            except Exception as e:  # noqa
                log(f"{sid}: generation failed ({e})"); msgs = msgs[:1]; continue
            meta = s.pop("_used", {}) or {}
            s["id"], s["status"], s["theme"] = sid, "ready", s.get("theme") or theme
            path = SCRIPTS / f"{sid}.json"
            path.write_text(json.dumps(s, ensure_ascii=False, indent=1), encoding="utf-8")
            errs, warns, est = validate.check(str(path))
            if "48 laws" in json.dumps(s.get("source", {})).lower():
                errs = errs + ["source: The 48 Laws of Power is forbidden — choose another book from books.json"]
            if not errs and 124 <= est <= 148:
                ok = True; break
            problems = errs + ([f"estimated {est:.0f}s — adjust narration to land at 128–145 s"] if not errs else [])
            log(f"{sid}: round {rnd + 1} needs fixes: {problems[:4]}")
            msgs = [msgs[0], {"role": "assistant", "content": json.dumps({**s, "_used": meta}, ensure_ascii=False)},
                    {"role": "user", "content": "The validator reported:\n- " + "\n- ".join(problems) +
                     "\nReturn the full corrected JSON only (keep the story, fix exactly these problems)."}]
        if not ok:
            (SCRIPTS / f"{sid}.json").unlink(missing_ok=True)
            log(f"{sid}: dropped after 4 rounds")
            continue
        src = s.get("source") or {}
        used_doc["used"].append({"id": sid, "book": src.get("book", ""), "item": src.get("title", ""),
                                 "relation": meta.get("relation", ""), "set": meta.get("set", ""), "hook": meta.get("hook", "")})
        theme_count[s["theme"]] += 1; book_count[src.get("book")] += 1
        written.append(sid); nxt += 1
        log(f"{sid}: OK ~{est:.0f}s — {s.get('youtube', {}).get('title', '')}")
    (ROOT / "data/used.json").write_text(json.dumps(used_doc, ensure_ascii=False, indent=1), encoding="utf-8")
    log(f"write_scripts: wrote {len(written)}: {', '.join(written)}")
    if os.environ.get("GITHUB_OUTPUT") and written:
        with open(os.environ["GITHUB_OUTPUT"], "a") as f:
            f.write(f"range={written[0]}–{written[-1]}\n")


if __name__ == "__main__":
    main()
