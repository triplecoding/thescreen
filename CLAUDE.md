# CLAUDE.md — The Screen (owner: triplecoding)

**The Screen** (`দ্য স্ক্রিন` · tagline *গল্পে দেখি জীবন*) is a fully automated Bangla storytelling channel:
touching, fully original Bangladeshi life stories built on ideas from 26 books (Greene's other books, Sun Tzu, Cialdini, Kahneman, Housel, Orwell… — never The 48 Laws of Power),
rendered as premium 9:16 motion-graphics videos (2:00–2:30) with ElevenLabs voices, and published to YouTube + Facebook.

Read this file first in every session. Then `docs/BANGLADESH_STORY_BIBLE.md` (Bangladeshi people, psychology, realism, dialogue — the story bible), `docs/STORY_GUIDE.md` (craft), `docs/SCRIPT_FORMAT.md` (JSON) and `docs/GROWTH.md` (algorithm/SEO) before writing scripts.

## How the system runs
```
GitHub Actions — .github/workflows/daily.yml  ("Publish videos")   ← runs on GitHub's own cron, no Claude session needed
   cron 6× a day (~35 min before 09:00 · 11:30 · 13:30 · 15:30 · 17:30 · 20:00 Dhaka) + an hourly safety net → 6 videos a day
   → "Plan" step (20 s): is any slot of the next ~26 h unfilled? if not → only first comments/playlists, exit
   → pipeline/daily.py --ahead 6: produces + schedules EVERY unfilled slot of the next ~26 h, so YouTube/Facebook
     publish at the exact slot time themselves even if later GitHub crons are late or dropped
       produce.py: ElevenLabs voice (eleven_v4_turbo ONLY, bn ONLY, owner's voice ids) → timeline (auto-fit 120–150 s)
                   → renderer (HTML/SVG, Playwright, 30 fps) → original score + SFX → mux → QA → thumbnails
       → YouTube (scheduled publishAt) + Facebook Page (scheduled_publish_time)
       → state.json updated + committed after every upload (idempotent; never double-posts)

GitHub Actions — .github/workflows/keeper.yml ("Keeper (timer)") ← self-renewing timer, independent of GitHub cron:
   sleeps until 35 min before each slot → dispatches "Publish videos" → dispatches itself again.
   "Publish videos" restarts the Keeper whenever it is not running (each watches the other).

GitHub Actions — .github/workflows/produce-range.yml ("Produce days ahead") ← manual: makes days start→end in order, self-continuing
GitHub Actions — .github/workflows/write-scripts.yml ("Write scripts (AI)") ← daily 03:17 Dhaka: if < 60 ready scripts, writes up to 12
   with the Anthropic API (secret ANTHROPIC_API_KEY) + validate.py; does nothing without the secret
Facebook catch-up: videos that could not go to Facebook are kept in the GitHub release "fb-queue"; the hourly
   "Publish videos" runs upload one every ~2 h (earliest slot first) once Facebook's posting limit has passed.

Claude scheduled task — "The Screen: scripts (Tue + Fri)" (07:33 Dhaka) → writes 24 new scripts each run → validate → push
Claude scheduled task — "The Screen: daily supervisor" (00:31 Dhaka) → backup trigger (dispatches a run if tomorrow is
   not fully scheduled) + health check: reads the last runs,
   fixes failures, re-runs a missed slot, reviews contact sheets, tops up the queue. Posting never depends on it.
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
1. Voice: ElevenLabs pay-as-you-go, model `eleven_v4_turbo` ONLY, language `bn` ONLY, voices = the owner's ids in `config/voices.json` (never design, swap or fall back).
2. Format: 1080×1920, 30 fps, **120–150 s**, 6 videos a day (09:00, 11:30, 13:30, 15:30, 17:30, 20:00 Dhaka; from 7 Nov 2026 — see config/channel.json slot_schedule). QA rejects anything else. **Story only** (since 5 Nov 2026): no book/concept/takeaways/ask beats, no book named in the video, ending = a 2-line `outro` summary. See STORY_GUIDE "UPDATE 5 Nov 2026".
3. Logo always from `assets/brand/logo.png` (transparent), top-LEFT corner with no box behind it, same outro lockup in every video.
3b. Never write stories from The 48 Laws of Power. Never copy any plot/scenario from the reference videos — every story original.
4. Never write secrets in code, logs, chat or commits. They live only in GitHub → Settings → Secrets → Actions.
5. Scripts are produced in id order; one video never refers to another episode.
6. Facebook captions contain no website links.
6b. Facebook API = video upload only (owner, 6 Nov 2026): no first comments, no photo posts, no custom thumbnail upload, no retry after a 4xx/posting-limit (368) error. Switch: `config/channel.json → facebook.video_only`.
7. Content rules in `docs/STORY_GUIDE.md` ("Never" list) are absolute.
8. Do not touch other repositories or channels from this repo's tasks.
9. Improve quality a little every week (new sets/props/poses, better stories) — but keep the brand identity.

## Weekly script writer — exact procedure
1. `git pull`. Read `docs/STORY_GUIDE.md`, `docs/SCRIPT_FORMAT.md`, `data/books.json`, `data/used.json`, and 2 existing scripts.
2. Write **24** new scripts continuing the numbering (Tue + Fri = 48/week for 6 videos a day), following `docs/BANGLADESH_STORY_BIBLE.md`. Mix: every priority-1 book at least twice, others once; rotate
   relationships/sets/lights/genders per the variety rules. Each story original, specific, Bangladeshi, touching.
3. `python pipeline/validate.py` — fix every error; keep estimates ~125–145 s.
4. Optional spot-check: `python pipeline/produce.py <id> --tts edge --stills` renders still frames to `out/<id>/stills` (free preview voice) — look at 2–3 of them.
5. Append each new script to `data/used.json`. Commit "scripts: NNN–MMM" and push to `main`.

## Daily supervisor — exact procedure
(GraphQL is blocked in Claude sessions — use the REST API through `gh api`.)
1. Check the last runs: `gh api "repos/triplecoding/thescreen/actions/workflows/daily.yml/runs?per_page=3" --jq '.workflow_runs[]|[.id,.status,.conclusion,.created_at]|@tsv'`.
   Compare state.json → posted with the slots of the last 24 h. If a slot was missed because a run failed, fix the cause and
   dispatch a catch-up run (it publishes immediately when the slot time has passed):
   `gh api -X POST repos/triplecoding/thescreen/actions/workflows/daily.yml/dispatches -f ref=main -f "inputs[mode]=now"`
2. Poll the run (`gh api repos/triplecoding/thescreen/actions/runs/<id> --jq '.status,.conclusion'`) every few minutes until completed (~40–80 min).
3. If failed: read logs (`gh api repos/triplecoding/thescreen/actions/runs/<id>/jobs --jq '.jobs[].steps[]|select(.conclusion=="failure")'`,
   then `gh api repos/triplecoding/thescreen/actions/jobs/<job_id>/logs`), fix the cause in code/scripts (small, safe changes), push, re-run. Script
   problems (too long/short/invalid) are parked automatically in `state.json → failed`; repair those scripts and set them
   back by removing their entry from `failed`.
4. Download the artifact (`gh api repos/triplecoding/thescreen/actions/runs/<id>/artifacts`, then the `archive_download_url`), open `contact.jpg` of each video and check visuals; if a video is broken,
   fix and re-produce; tell the owner what happened.
5. If `state.json → queue_remaining` < 18, write extra scripts (same procedure as weekly).

## Local commands
```bash
npm install && npx playwright install chromium && pip install -r requirements.txt
python pipeline/validate.py                      # check all scripts
python pipeline/produce.py 001 --tts edge         # full local render with free preview voice (never publish this)
python pipeline/produce.py 001 --tts edge --stills  # quick stills for visual review
python pipeline/doctor.py                         # check secrets / API health
```
