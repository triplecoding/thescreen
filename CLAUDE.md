# CLAUDE.md — The Screen (owner: triplecoding)

**The Screen** (`দ্য স্ক্রিন` · tagline *গল্পে দেখি জীবন*) is a fully automated Bangla storytelling channel:
touching Bangladeshi life stories built on ideas from 27 books (Robert Greene, Cialdini, Kahneman, Housel, Orwell…),
rendered as premium 9:16 motion-graphics videos (2:00–2:15) with ElevenLabs voices, and published to YouTube + Facebook.

Read this file first in every session. Then `docs/STORY_GUIDE.md` (craft) and `docs/SCRIPT_FORMAT.md` (JSON) before writing scripts.

## How the system runs
```
Claude scheduled task — "The Screen: weekly scripts" (Fri morning, Dhaka)
   → writes 30 new scripts/NNN.json → validate → commit + push

Claude scheduled task — "The Screen: daily supervisor" (every night, Dhaka)
   → gh workflow run daily.yml  →  watches the run  →  fixes & re-runs on failure  →  reviews contact sheets

GitHub Actions — daily.yml (has the secrets; also a backup cron 03:20 Dhaka)
   → pipeline/daily.py: for each of today's slots (config/channel.json)
       produce.py: ElevenLabs voice (eleven_v4_turbo, bn) → timeline (auto-fit 120–135 s)
                   → renderer (HTML/SVG, Playwright, 30 fps) → original score + SFX → mux → QA → thumbnails
       → YouTube (scheduled publishAt) + Facebook Page (scheduled_publish_time)
       → state.json updated + committed after every upload (idempotent; never double-posts)
```

## Repo map
| Path | What |
|---|---|
| `scripts/NNN.json` | story scripts (the queue). Lowest unused `ready` id is produced next. |
| `state.json` | posted / failed / playlists — **source of truth**, written by daily.py only |
| `config/channel.json` | slots, posts/day, duration window, ElevenLabs model + voice designs, music |
| `config/voices.json` | ElevenLabs voice ids per role (auto-created on first run by Voice Design; then locked) |
| `data/books.json`, `data/used.json` | story sources; ideas already used |
| `renderer/` | the motion-graphics engine (`lib/char.js` characters, `sets.js` backgrounds, `ui.js` widgets/cards, `engine.js` timeline) |
| `pipeline/` | `produce.py` (one video), `daily.py` (schedule+publish), `voice.py`, `timeline.py`, `audio.py`, `render.js`, uploaders, `validate.py`, `doctor.py` |
| `assets/brand/logo.png` | official logo (background removed). `logo_white.png` for dark use. Never redraw the logo. |
| `assets/music/*.mp3` | optional licensed tracks; if empty an original score is synthesised |
| `.github/workflows/` | `daily.yml` (production), `preview.yml` (render one script, no upload), `validate.yml` |

## Locked rules (owner must approve changes)
1. Voice: ElevenLabs pay-as-you-go, model `eleven_v4_turbo`, language `bn`. Voice ids in `config/voices.json` stay fixed once created.
2. Format: 1080×1920, 30 fps, **120–135 s**. QA rejects anything else.
3. Logo always from `assets/brand/logo.png`, same header position and the same outro lockup in every video.
4. Never write secrets in code, logs, chat or commits. They live only in GitHub → Settings → Secrets → Actions.
5. Scripts are produced in id order; one video never refers to another episode.
6. Facebook captions contain no website links.
7. Content rules in `docs/STORY_GUIDE.md` ("Never" list) are absolute.
8. Do not touch other repositories or channels from this repo's tasks.
9. Improve quality a little every week (new sets/props/poses, better stories) — but keep the brand identity.

## Weekly script writer — exact procedure
1. `git pull`. Read `docs/STORY_GUIDE.md`, `docs/SCRIPT_FORMAT.md`, `data/books.json`, `data/used.json`, and 2 existing scripts.
2. Write **30** new scripts continuing the numbering. Mix: every priority-1 book at least twice, others once; rotate
   relationships/sets/lights/genders per the variety rules. Each story original, specific, Bangladeshi, touching.
3. `python pipeline/validate.py` — fix every error; keep estimates ~118–135 s.
4. Optional spot-check: `python pipeline/produce.py <id> --tts edge --stills` renders still frames to `out/<id>/stills` (free preview voice) — look at 2–3 of them.
5. Append each new script to `data/used.json`. Commit "scripts: NNN–MMM" and push to `main`.

## Daily supervisor — exact procedure
1. `gh workflow run daily.yml -R triplecoding/thescreen` (skip if a run for today is already in progress/succeeded).
2. Poll `gh run list --workflow daily.yml -R triplecoding/thescreen -L 1` until finished.
3. If failed: `gh run view <id> --log-failed`, fix the cause in code/scripts (small, safe changes), push, re-run. Script
   problems (too long/short/invalid) are parked automatically in `state.json → failed`; repair those scripts and set them
   back by removing their entry from `failed`.
4. Download the artifact (`gh run download <id>`), open `contact.jpg` of each video and check visuals; if a video is broken,
   fix and re-produce; tell the owner what happened.
5. If `state.json → queue_remaining` < 12, write extra scripts (same procedure as weekly).

## Local commands
```bash
npm install && npx playwright install chromium && pip install -r requirements.txt
python pipeline/validate.py                      # check all scripts
python pipeline/produce.py 001 --tts edge         # full local render with free preview voice (never publish this)
python pipeline/produce.py 001 --tts edge --stills  # quick stills for visual review
python pipeline/doctor.py                         # check secrets / API health
```
