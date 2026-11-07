"""Prints the first day that 'Produce days ahead' should continue from (blank = nothing to do).
Used by "Publish videos" so production keeps going with no Claude session: from tomorrow up to
config/channel.json → produce_until, the first day with fewer than 6 posts, while ready scripts remain
and YouTube's daily upload limit was not hit in the last 90 min."""
import sys
from datetime import datetime, timedelta, date
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).parent))
from common import STATE, channel, load_json  # noqa: E402
from daily import queue  # noqa: E402

cfg = channel()
until = cfg.get("produce_until")
tz = ZoneInfo(cfg["timezone"])
now = datetime.now(tz)
state = load_json(STATE, {}) or {}
if not until or not queue(state):
    sys.exit(0)
t = state.get("yt_limit_at")
if t and datetime.fromisoformat(t) > now - timedelta(minutes=90):
    sys.exit(0)
count = {}
for p in state.get("posted", []):
    count[p["date"]] = count.get(p["date"], 0) + 1
d, last = now.date() + timedelta(days=1), date.fromisoformat(until)
while d <= last:
    if count.get(str(d), 0) < 6:
        print(f"{d} {last}")
        break
    d += timedelta(days=1)
