# The Screen — Story Guide (গল্প লেখার নিয়ম)

This is the craft behind every script. It was distilled from studying high-performing Bangla "book lesson" story reels,
then rebuilt with The Screen's own identity. **Content quality is the #1 priority** — a beautiful render of a weak story still fails.

## The promise
Every video = one *touching, specific, Bangladeshi* family/work/neighbourhood story → the book idea behind it → a humane
lesson the viewer can use tonight. Viewers should feel something in the first 5 seconds and want to send it to someone.

## Owner rules (absolute)
- **Never** write a story from *The 48 Laws of Power*. Use the other books in `data/books.json`.
- **Every story and every scenario is original.** The reference videos the owner shared were only to show the style —
  never reuse their plots, situations, turning points, props or lines (e.g. no grandmother-refusing-doctor, no child's
  drawing of a drinking father, no roommate negativity, no suitor + old football photo, no puja-mic complaint + old photo).
- **Story is the main course:** ~70–75 % of narration is story/animation; the lesson part is short (≈ 25–30 s).
- **Length 2:00–2:30** (120–150 s).

## The arc (≈ 26–30 beats, 2:00–2:30)

| # | Part | Share | What it does | Typical beats |
|---|------|-------|--------------|---------------|
| 1 | **Hook** | 0–6 s | A concrete number + a stalemate. | `stats` widget: "১২ মাস · ১২ তর্ক · ফল ০" |
| 2 | **World** | ~15 s | Who, where, what they want. Specific props. | 3–5 story beats + one dialogue each side |
| 3 | **Failed attempts** | ~8 s | The obvious ways all failed. | `list` card with ✕ ✕ ✕ |
| 4 | **The low point** | ~8 s | Silence, distance, a door closed, a night. | night light, `pause` 0.7–1.0 |
| 5 | **The turn** | ~25 s | "তারপর X একটা অদ্ভুত কাজ করল।" A *small, humane, specific* act — a question, a gift, listening, a quiet proof. Never cunning, never cruel. | `statement` card, then the act, then the other person's silence and reply |
| 6 | **Payoff line** | ~5 s | Contrast formula: **"[long effort] যা পারেনি, [small thing] তা পারল।"** | one story beat, `fx: glow` |
| 7 | **Book → idea** | ~10 s | Book card, then chapter reveal (2 short beats). Then ONE `concept` beat with one visual metaphor. | `book` ×2, `concept` ×1 |
| 8 | **Lesson → mirror → aphorism** | ~20 s | `takeaways` show 1, 2, 3 (very short lines; the header is on the card). One `ask` beat with the quote. A 2-part poetic `outro`. | `takeaways` ×3, `ask` ×1, `outro` |

Story ≈ 70–75 %, lesson ≈ 25–30 %. Give the story room: more scenes, more dialogue, a specific emotional detail, a quiet moment, and an after-scene that shows the change.

## Signature lines (The Screen's voice — use every time)
- Book: **"এই গল্পের পেছনের বই— [author_bn]-এর *[book]*।"** then **"[n] নম্বর ল— *[title_bn]*।"**
- Takeaways: the card header reads "পর্দার বাইরে, তোমার জীবনে"; beats are just "এক, …" "দুই, …" "তিন, …" (short).
- Mirror (one beat): **"এবার পর্দাটা তোমার দিকে ঘোরাই— আমি কি …, নাকি …?"**
- Outro: two halves with "…" — e.g. "মানুষ তর্ক ভুলে যায়… *প্রমাণ ভোলে না*।" Under ~14 words. Parallel, rhythmic.

## Humane reinterpretation (very important)
Greene/Machiavelli ideas can be manipulative. Never teach people to deceive or exploit. Show the *insight* in a warm way,
and when the book says something cold, say so and offer the kinder version:
> "বইটা বলে, বন্ধু সেজে খবর জোগাড় করো। কিন্তু পর্দার বাইরের শিক্ষাটা একটু আলাদা— গুপ্তচর নয়, সত্যিকারের আগ্রহী মানুষ হও।"
Takeaway #3 is often the ethical guard-rail: "প্রশংসা হোক সত্যি", "কৃতিত্বটা ওনাকেই দাও", "ছবিটা সত্যি হোক".

## Writing the Bangla
- Narrator: third person, past tense, warm. Sentences 5–14 words. One idea per beat.
- Dialogue: short, spoken Bangla (চলিত), as people really talk. Max ~16 words per line.
- Bangladeshi texture: আব্বা/আম্মা/দাদি/নানু/খালা/মামা/ভাইয়া/আপু, ঢাকা/মিরপুর/মোহাম্মদপুর/ময়মনসিংহ/চট্টগ্রাম, CNG, টিউশন, বিল্ডিং গ্রুপ, শুঁটকি ভর্তা, পাসবই, ঈদের বোনাস… Use West-Bengal words (ঠাকুমা, পুজো) only if the family is intentionally Hindu, respectfully.
- **Specific props carry emotion**: a passbook, seven envelopes, a yellowed recipe notebook, a child's drawing, an old bicycle bell.
- Silence is a beat: "অনেকক্ষণ চুপ করে রইলেন।" with `pause` 0.8–1.0.
- Mark 1–2 key words per beat with `*…*` (they glow red in captions). Don't over-highlight.
- `say` must be written exactly as it should be spoken (numbers as words when natural: "আটশো চল্লিশ টাকা").
- Tone tags (`tone`) sparingly: softly / warmly / tearful / hopeful / annoyed at emotional lines only.
- Length: **~1,750–2,000 characters of narration** total (story ~1,300–1,450, lesson ~420–480). `validate.py` estimates duration; the pipeline auto-fits 120–135 s, but a script that is far off gets parked.

## Variety rules (checked by the weekly writer)
- Never the same book in 3 consecutive scripts; cover all priority-1 books every week.
- Rotate relationships (parent–child, siblings, spouses, in-laws, grandparents, neighbours, colleagues, teacher–student, friends, shopkeeper–customer).
- Rotate sets and lights; alternate male/female protagonists; vary hook types (number, quote, habit, secret, object).
- Use `data/used.json` — never reuse a book item + relationship combination.

## Metadata (algorithm + SEO — see docs/GROWTH.md)
- `youtube.title`: emotional hook first (≤ 70 chars ideal), one emoji, then `| Book name`. Must be true to the story.
- `youtube.description`: line 1 = the hook in 1–2 sentences ending with "…"; then 1 line on the book; then the tagline.
- `youtube.tags`: 6–10 — book in Bangla + Banglish + English, the theme (বাবার গল্প, সঞ্চয়, সম্পর্ক…), relationship.
- `facebook.caption`: line 1 = the payoff/hook line + emoji; line 2 = a question about the viewer's own life + 👇;
  then `📖 Book — Author` and ≤ 4 hashtags. No links. (seo.py adds the share prompt and brand tags.)
- `thumbnail.text`: 2–3 bold words that create curiosity; `sub`: ≤ 5 words.

## Never
Real public figures, brands, political parties or current politics, religion debates, violence/gore, self-harm, romance
manipulation, medical instructions, mocking any group, defamation, copying book text, fake statistics presented as research.
