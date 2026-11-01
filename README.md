# The Screen — গল্পে দেখি জীবন

Automated Bangla storytelling channel. Book wisdom → touching Bangladeshi life stories → premium 9:16 motion graphics →
YouTube + Facebook, every day, on schedule.

- **How it works / rules for Claude:** [CLAUDE.md](CLAUDE.md)
- **One-time setup (secrets):** [docs/SETUP.md](docs/SETUP.md)
- **Story craft:** [docs/STORY_GUIDE.md](docs/STORY_GUIDE.md) · **Script JSON:** [docs/SCRIPT_FORMAT.md](docs/SCRIPT_FORMAT.md)

```
scripts/ → voice (ElevenLabs v4 Turbo, bn) → timeline (120–135 s) → renderer (HTML/SVG → 1080×1920 @30fps)
        → original score + SFX → QA → thumbnails → YouTube (scheduled) + Facebook (scheduled) → state.json
```

Run one locally: `python pipeline/produce.py 001 --tts edge` (free preview voice, for testing only).
