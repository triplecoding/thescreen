# Script format (`scripts/NNN.json`)

The renderer draws everything from this JSON — characters, sets, camera, widgets, cards. Only values listed here exist;
`python pipeline/validate.py` rejects anything else. Copy `scripts/001.json` as a template.

```jsonc
{
  "id": "006",                       // 3 digits, next free number
  "status": "ready",                 // ready | draft (draft is skipped)
  "title_bn": "…",                   // internal Bangla title
  "source": {"book": "…", "author": "…", "author_bn": "…", "chapter": "LAW 9", "chapter_bn": "নয় নম্বর ল",
             "title": "English law/chapter title", "title_bn": "Bangla meaning, short"},
  "cast": { "<id>": {"name": "সাজিদ", "type": "young_man", "skin": "wheat", "outfit": "shirt", "color": "#C4473A",
                     "color2": "#E8A33D", "hair": "short", "beard": "stubble", "glasses": false, "cap": false, "teep": false, "voice": "young_man"} },
  "beats": [ … ],
  "youtube": {"title": "≤100 chars, Bangla hook + emoji + | Book", "description": "…", "tags": ["…"]},
  "facebook": {"caption": "hook line + a question to the audience + 📖 book + hashtags"},
  "thumbnail": {"text": "2–3 words", "sub": "short line"}   // shown big on the first frame (= Shorts thumbnail)
}
```

## Cast values
- `type`: man, young_man, old_man, woman, young_woman, old_woman, teen_boy, teen_girl, child_boy, child_girl
- `outfit`: shirt, tshirt, panjabi, sari, salwar, scrub, uniform  (`color` main, `color2` = sari border / dupatta / uniform trousers / hijab)
- `hair`: short, side, side_grey, curly, bald_grey, long_braid, long_bun, grey_bun, hijab, kid
- `skin`: light, wheat, tan, brown, dark  · `beard`: stubble, short_grey, full_black, moustache (or omit)
- `voice` (ElevenLabs role): narrator, young_man, man, old_man, young_woman, woman, old_woman, teen_boy, teen_girl, child_boy, child_girl

## Beats
Every beat has `say` (spoken + captioned; `*word*` = highlight). Optional: `voice` (cast id; default narrator),
`tone` (see config allowed_tags), `pause` (seconds after the line; default 0.28).

### `kind: "story"` (default)
```jsonc
"scene": {
  "set": "home|shop|kitchen|street|stairs|hospital|balcony",   // a new set resets chars/props/widget
  "light": "day|evening|night",
  "chip": "এক বছর ধরে",                                         // time/place label under the logo
  "props": [ … ],                                               // per set, below
  "chars": [{"id": "abba", "x": 0.3, "pose": "stand|sit|walk", "face": "right|left",
             "mood": "neutral|smile|happy|sad|crying|worried|angry|surprised|thinking",
             "arm": "down|talk|point|cross|hold|phone|call|face|wave|hug",
             "hold": "none|envelope|phone|tea|plate|book|passbook|bag"}],
  "moods": {"abba": "sad"}, "arms": {"abba": "talk"}, "holds": {"abba": "envelope"},   // patch without re-listing chars
  "bubble": {"who": "sajid", "text": "short!"},                 // only this beat
  "widget": {…} | null,                                        // stays until replaced or null
  "cam": "push|wide|static|pan" | {"focus": "abba", "zoom": 1.4} | {"zoom": 1.2},
  "fx": "rain|dust|glow|pulse|bw" | null
}
```
Scene state carries over between beats; only write what changes. Characters keep positions and animate between beats
(arms, moods, walking). The speaking character's mouth moves with the voice automatically.

Props by set — home: window, almirah, sofa, bed, table, door_closed · shop: signboard, signboard_new, cashbox, envelope, envelopes,
`"sign:দোকানের নাম"` (signboard text) · kitchen: stove, pot · street: bicycle, school_gate, car, cng, superstore (`"sign:…"` names it) · balcony: plants, tea · stairs / hospital: none.
(sofa/bed provide the seat; otherwise sitting characters get a chair.)

Widgets (top of screen):
- `{"kind":"stats","items":[{"label":"মাস","value":"১২","from":"১"},{"label":"ফল","value":"০","red":true}]}` (counts up)
- `{"kind":"checklist","title":"…","items":[{"t":"…","mark":"check|x"}]}` (items appear one by one)
- `{"kind":"note","style":"paper|envelope|passbook|notebook|sticky","title":"…","lines":["…"],"strike":false,"sub":"…"}`
- `{"kind":"chat","title":"group name","msgs":[{"who":"…","t":"…"}]}`
- `{"kind":"clock","time":"3:00","label":"রাত ৩টা"}`

Camera tips: open scenes with `push` or `wide`; dialogue lines use `{"focus": speaker, "zoom": 1.3–1.5}`;
emotional silence uses a slow focus on the listener. Use `iris` transitions automatically by changing `set`.

### Cards
- `list`: `{"card":{"title":"সব চেষ্টা…","items":[{"t":"…","mark":"x","tag":"optional"}],"footer":"optional"}}`
- `statement`: `{"card":{"text":"সে তর্ক করা\n*বন্ধ* করে দিল।"}}` (big dark card, no caption)
- `book`: two beats — first plain, second `"reveal": true` (shows chapter + title + title_bn from `source`)
- `concept`: `{"card":{"title":"…","widget":{"type":"flow|compare|iceberg|puzzle|scale", …, "show": n}}}` — repeat the
  same card with increasing `show` to build it up across beats.
  - flow: `nodes:[{icon,t}]`, `loop:true` optional · compare: `left/right:{icon,t,sub,bad}` · iceberg: `top/bottom:[{icon,t}]`
  - puzzle: `known:[…]`, `verdict:"…"`, `missing:[…]` · scale: `left/right:{t}`, `tilt`
  - icons: chat, shield, wall, eye, hand, heart, star, ear, door, car, phone, bank, bulb, x, check, puzzle, clock, film, book, people, brain
- `takeaways`: first beat `"show":0` with `card.items` (3 × `{t, sub, icon}`), then `show` 1, 2, 3
- `ask`: first beat `card.quote: null` (lead-in line), second beat `card.quote` = the question (`\n` allowed)
- `outro`: `card.line1`, `card.line2` — last beat, `pause` ≈ 1.6

### `theme` (since 5 Nov 2026)
Top-level `"theme"` picks the YouTube playlist and the theme hashtag (pipeline/seo.py `THEMES`):
`parents` · `siblings` · `family` · `work` · `money` · `struggle` · `community` · `school` · `probashi` · `honesty`.
If missing, it is guessed from the title/tags. Facebook caption = exactly **2 lines** (hook line + a question to the
viewer ending with 👇) + up to 2 own hashtags; the pipeline completes it to exactly 5 hashtags. YouTube gets 5 hashtags
(#Shorts #বাংলাগল্প #<theme> #জীবনেরগল্প #TheScreen) and theme/story tags — never book-search tags.
