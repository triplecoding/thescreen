# Growth playbook — Facebook + YouTube algorithm (The Screen)

Both platforms rank short vertical video mainly on **how many people watch to the end, rewatch, share and comment**,
and on how clearly they understand *what the video is about and who it is for*. Everything below is built into the
pipeline (`pipeline/seo.py`, renderer, scripts) — the weekly writer must keep scripts compatible with it.

## 1. Retention (the #1 signal) — built into every video
- **0–1.5 s:** title flash on the first frame (`thumbnail.text` + `sub`) over the hook scene — it is also the Shorts thumbnail.
- **0–6 s:** hook = a concrete number + a stalemate ("১২ মাস · ১২ তর্ক · ফল ০"), counting-up widget, a face.
- Something changes on screen every 2–4 s (camera move, widget, card, expression). No dead air: pauses ≤ 1 s.
- Open loop: the turn ("তারপর সাজিদ একটা অদ্ভুত কাজ করল।") lands ~35–45 % in, the payoff before the book reveal.
- Captions with word-by-word reveal (most Facebook views start muted).
- 2:00–2:15 total: long enough for an emotional arc, short enough to finish.
- The ending aphorism + logo lockup invites a rewatch/share.

## 2. Shares ("sends") — Facebook's strongest signal
- Stories about parents, in-laws, siblings, neighbours, money, respect → people send them to family.
- Caption ends with a share prompt ("যাকে এই গল্পটা শোনা দরকার, তাকে পাঠিয়ে দাও 💌" — rotates).
- The outro line is quotable (two halves with "…"), designed to be screenshot and shared.

## 3. Comments
- Facebook caption line 2 = an audience question about *their own* life ("তোমার আব্বার কোন জিনিসটা তুমি কখনো ভুলবে না? 👇").
- The video asks the mirror question ("আমি কি …, নাকি …?").
- After a video goes live, the next run posts that question as the **first comment** from the Page/channel
  (YouTube scope `youtube.force-ssl`, Facebook permission `pages_manage_engagement`).

## 4. Search & topic clarity (SEO)
- **YouTube title** (≤ 70 chars ideal, 100 max): emotional hook first, then `| Book name`. Example:
  `যে সাইকেলের জন্য লজ্জা পেত, সেটাই ছিল তার ভবিষ্যৎ 🚲 | The Psychology of Money`
- **Description line 1–2** (shown in search): hook + `📖 Book — Author | Chapter — বাংলায়, জীবনের গল্পে।`
- **3 hashtags first** (`#Shorts #বাংলাগল্প #BookName`) — YouTube shows them above the title.
- **Tags:** Bangla + Banglish + English for book, author, theme (`48 laws of power bangla`, `টাকার মনস্তত্ত্ব`,
  `bangla motivational story`, `book summary bangla` …) — `seo.py` merges script tags with a per-book keyword bank.
- **Playlists per book** (auto) → session watch time + "series" signal.
- `defaultLanguage`/`defaultAudioLanguage = bn` → shown to Bangla audiences.

## 5. Consistency
- One video every 6 hours (08:00, 14:00, 20:00, 02:00 Dhaka) — steady supply trains the recommender.
- Same brand frame, logo position and outro every time → recognisable in the feed.

## 6. What to review weekly (supervisor)
- YouTube Studio / Meta Business Suite: average % viewed, shares, comments per video.
- Double down on the book + relationship combinations that performed best; note them in `data/used.json` (`"perf": "high"`).
- Kill patterns that underperform (weak hooks, abstract topics).

## Never (hurts reach or the channel)
Clickbait that the video doesn't deliver · reposting the same video · links in Facebook captions · engagement bait like
"like if… / share if…" spam · copyrighted music · misleading thumbnails · mass hashtags (>5 on Facebook).
