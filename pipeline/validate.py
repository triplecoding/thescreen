"""Validate story scripts before they enter the queue.  usage: python pipeline/validate.py [scripts/001.json ...]"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import SCRIPTS, channel, plain  # noqa: E402

SETS = {"home", "shop", "kitchen", "street", "stairs", "hospital", "balcony"}
PROPS = {"home": {"window", "almirah", "sofa", "bed", "table", "door_closed"}, "shop": {"signboard", "signboard_new", "cashbox", "envelope", "envelopes"},
         "kitchen": {"stove", "pot"}, "street": {"bicycle", "school_gate", "car", "cng", "superstore"}, "stairs": set(), "hospital": set(), "balcony": {"plants", "tea"}}
LIGHTS = {"day", "evening", "night"}
TYPES = {"man", "young_man", "old_man", "woman", "young_woman", "old_woman", "teen_boy", "teen_girl", "child_boy", "child_girl"}
OUTFITS = {"shirt", "tshirt", "panjabi", "sari", "salwar", "scrub", "uniform"}
HAIRS = {"short", "side", "side_grey", "curly", "bald_grey", "long_braid", "long_bun", "grey_bun", "hijab", "kid"}
SKINS = {"light", "wheat", "tan", "brown", "dark"}
BEARDS = {None, "stubble", "short_grey", "full_black", "moustache"}
POSES = {"stand", "sit", "walk"}
MOODS = {"neutral", "smile", "happy", "sad", "crying", "worried", "angry", "surprised", "thinking"}
ARMS = {"down", "talk", "point", "cross", "hold", "phone", "call", "face", "wave", "hug"}
HOLDS = {None, "none", "envelope", "phone", "tea", "plate", "book", "passbook", "bag"}
WIDGETS = {"stats", "checklist", "note", "chat", "clock"}
KINDS = {"story", "list", "statement", "book", "concept", "takeaways", "ask", "outro"}
CONCEPTS = {"flow", "compare", "iceberg", "puzzle", "scale"}
ICONS = {"chat", "shield", "wall", "eye", "hand", "heart", "star", "ear", "door", "car", "phone", "bank", "bulb", "x", "check", "puzzle", "clock", "film", "book", "people", "brain"}
CHARS_PER_SEC = 13.6  # calibrated: narration incl. natural pauses


def check(path):
    errs, warns = [], []
    s = json.loads(Path(path).read_text(encoding="utf-8"))
    for k in ("id", "title_bn", "source", "cast", "beats", "youtube", "facebook", "thumbnail"):
        if k not in s:
            errs.append(f"missing '{k}'")
    if errs:
        return errs, warns, 0
    cast = s["cast"]
    for cid, c in cast.items():
        if c.get("type") not in TYPES: errs.append(f"cast {cid}: bad type {c.get('type')}")
        if c.get("outfit") not in OUTFITS: errs.append(f"cast {cid}: bad outfit {c.get('outfit')}")
        if c.get("hair") not in HAIRS: errs.append(f"cast {cid}: bad hair {c.get('hair')}")
        if c.get("skin") not in SKINS: errs.append(f"cast {cid}: bad skin {c.get('skin')}")
        if c.get("beard") not in BEARDS: errs.append(f"cast {cid}: bad beard {c.get('beard')}")
        if c.get("voice") not in channel()["voices"]: errs.append(f"cast {cid}: unknown voice role {c.get('voice')}")
        if not c.get("name"): errs.append(f"cast {cid}: needs a Bangla 'name' (shown as speaker tag)")
    kinds = []
    cur_set = None
    chars_total = 0
    for i, b in enumerate(s["beats"]):
        k = b.get("kind", "story"); kinds.append(k)
        where = f"beat {i + 1}"
        if k not in KINDS: errs.append(f"{where}: bad kind {k}")
        say = b.get("say", "")
        if not say.strip(): errs.append(f"{where}: empty 'say'")
        if say.count("*") % 2: errs.append(f"{where}: unbalanced *highlight*")
        if len(plain(say)) > 190: warns.append(f"{where}: long line ({len(plain(say))} chars) — split it for better pacing")
        chars_total += len(plain(say))
        v = b.get("voice")
        if v and v != "narrator" and v not in cast: errs.append(f"{where}: voice '{v}' not in cast")
        if b.get("tone") and b["tone"] not in channel()["elevenlabs"]["allowed_tags"]: warns.append(f"{where}: tone '{b['tone']}' not in allowed_tags (ignored)")
        if k == "story":
            sc = b.get("scene") or {}
            if sc.get("set"):
                if sc["set"] not in SETS: errs.append(f"{where}: unknown set {sc['set']}")
                cur_set = sc["set"]
            if i == 0 and not sc.get("set"): errs.append("first beat must set a scene")
            if sc.get("light") and sc["light"] not in LIGHTS: errs.append(f"{where}: bad light")
            for p in sc.get("props") or []:
                if str(p).startswith("sign:"): continue
                if cur_set and p not in PROPS.get(cur_set, set()): warns.append(f"{where}: prop '{p}' not drawn in set '{cur_set}'")
            for c in sc.get("chars") or []:
                if c.get("id") not in cast: errs.append(f"{where}: char {c.get('id')} not in cast")
                if c.get("pose", "stand") not in POSES: errs.append(f"{where}: bad pose {c.get('pose')}")
                if c.get("mood", "neutral") not in MOODS: errs.append(f"{where}: bad mood {c.get('mood')}")
                if c.get("arm", "down") not in ARMS: errs.append(f"{where}: bad arm {c.get('arm')}")
                if c.get("hold") not in HOLDS: errs.append(f"{where}: bad hold {c.get('hold')}")
                if not (0.08 <= float(c.get("x", 0.5)) <= 0.92): warns.append(f"{where}: char {c.get('id')} x out of safe range")
            for key, allowed in (("moods", MOODS), ("arms", ARMS)):
                for cid, val in (sc.get(key) or {}).items():
                    if val not in allowed: errs.append(f"{where}: {key}.{cid} bad value {val}")
            w = sc.get("widget")
            if w and w.get("kind") not in WIDGETS: errs.append(f"{where}: bad widget {w.get('kind')}")
            cam = sc.get("cam")
            if isinstance(cam, dict) and cam.get("focus") and cam["focus"] not in cast: errs.append(f"{where}: cam focus {cam['focus']} not in cast")
        elif k == "concept":
            wt = ((b.get("card") or {}).get("widget") or {}).get("type")
            if wt not in CONCEPTS: errs.append(f"{where}: bad concept widget {wt}")
        elif k == "takeaways" and b.get("show") is None:
            errs.append(f"{where}: takeaways needs 'show'")
    if s["source"].get("book") == "The 48 Laws of Power":
        errs.append("owner rule: no stories from The 48 Laws of Power")
    story_c = sum(len(plain(b.get("say", ""))) for b in s["beats"] if b.get("kind", "story") in ("story", "list", "statement"))
    if chars_total and story_c / chars_total < 0.66:
        warns.append(f"story is only {story_c / chars_total:.0%} of narration — owner wants ~70–75 % story, short lesson")
    for need in ("book", "takeaways", "ask", "outro"):
        if need not in kinds: errs.append(f"structure: missing '{need}' beat")
    if kinds and kinds[-1] != "outro": errs.append("structure: last beat must be outro")
    est = chars_total / CHARS_PER_SEC + 6
    d = channel()["duration"]
    if est < d["min"] - 10: warns.append(f"estimated {est:.0f}s — probably too short (target {d['min']:.0f}-{d['max']:.0f}s)")
    if est > d["max"] + 12: errs.append(f"estimated {est:.0f}s — too long (target {d['min']:.0f}-{d['max']:.0f}s); cut narration")
    if len(s["youtube"].get("title", "")) > 100: errs.append("youtube title > 100 chars")
    return errs, warns, est


if __name__ == "__main__":
    files = sys.argv[1:] or sorted(str(p) for p in SCRIPTS.glob("*.json"))
    bad = 0
    for f in files:
        e, w, est = check(f)
        status = "OK " if not e else "ERR"
        print(f"{status} {Path(f).name}  ~{est:.0f}s  chars")
        for x in e: print("   ✗", x)
        for x in w: print("   ·", x)
        bad += bool(e)
    sys.exit(1 if bad else 0)
