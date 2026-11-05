"""Search + algorithm optimisation for every post (YouTube Shorts + Facebook).

What the platforms reward (2025–26): watch-through/retention, rewatches, shares (Facebook weighs 'sends' heavily),
meaningful comments, and topical clarity (what the video is about, who it is for). So every post gets:
  - a curiosity title that names the topic (book) and an emotion, front-loaded within ~55 chars
  - a description whose first two lines carry the hook + main keywords in Bangla and Banglish
  - 3 hashtags (YouTube shows the first three above the title) + #Shorts
  - tags covering Bangla, Banglish and English searches for the book, the author and the life theme
  - a share prompt ("যাকে এটা শোনা দরকার, তাকে পাঠাও") and a single clear question to spark comments
  - a first comment from the channel/page with the mirror question (pinned on YouTube where allowed)
"""
import re

from common import plain

BOOK_KEYWORDS = {
    "The 48 Laws of Power": ["48 laws of power bangla", "৪৮ লজ অফ পাওয়ার", "ক্ষমতার ৪৮টি সূত্র", "robert greene bangla"],
    "The Laws of Human Nature": ["laws of human nature bangla", "মানব প্রকৃতির সূত্র", "robert greene bangla", "human psychology bangla"],
    "The 33 Strategies of War": ["33 strategies of war bangla", "যুদ্ধের ৩৩ কৌশল", "robert greene bangla"],
    "The Art of Seduction": ["art of seduction bangla", "আকর্ষণের মনস্তত্ত্ব", "charisma bangla"],
    "Mastery": ["mastery robert greene bangla", "দক্ষতা অর্জন", "success story bangla"],
    "The 50th Law": ["50th law bangla", "ভয়কে জয়", "motivation bangla"],
    "The Daily Laws": ["daily laws bangla", "robert greene bangla"],
    "The Prince": ["the prince bangla", "ম্যাকিয়াভেলি", "machiavelli bangla"],
    "The Dictator's Handbook": ["dictators handbook bangla", "ক্ষমতার রাজনীতি"],
    "The Art of Worldly Wisdom": ["art of worldly wisdom bangla", "জীবনের বিচক্ষণতা"],
    "The Open Society and Its Enemies": ["karl popper bangla", "মুক্ত সমাজ"],
    "The Republic": ["plato republic bangla", "প্লেটো"],
    "Influence: The Psychology of Persuasion": ["influence psychology bangla", "মানুষকে রাজি করানোর কৌশল", "cialdini bangla"],
    "Games People Play": ["games people play bangla", "সম্পর্কের মনস্তত্ত্ব", "eric berne bangla"],
    "Thinking, Fast and Slow": ["thinking fast and slow bangla", "চিন্তার ভুল", "kahneman bangla"],
    "The Righteous Mind": ["righteous mind bangla", "দলাদলির মনস্তত্ত্ব"],
    "Propaganda": ["propaganda bernays bangla", "গুজব ও প্রচারণা"],
    "The Art of War": ["art of war bangla", "সান জু", "যুদ্ধের কৌশল বাংলা"],
    "The Book of Five Rings": ["book of five rings bangla", "মুসাশি"],
    "On War": ["clausewitz bangla"],
    "The Social Contract": ["social contract bangla", "রুসো"],
    "Animal Farm": ["animal farm bangla", "এনিমেল ফার্ম", "জর্জ অরওয়েল"],
    "1984": ["1984 bangla", "জর্জ অরওয়েল"],
    "The Wealth of Nations": ["wealth of nations bangla", "অ্যাডাম স্মিথ"],
    "The Communist Manifesto": ["communist manifesto bangla"],
    "The Psychology of Money": ["psychology of money bangla", "টাকার মনস্তত্ত্ব", "সঞ্চয়ের গল্প", "morgan housel bangla"],
}
CORE_TAGS = ["বাংলা গল্প", "জীবনের গল্প", "জীবনমুখী গল্প", "হৃদয়ছোঁয়া গল্প", "bangla golpo", "jiboner golpo", "bangla story",
             "bangla emotional story", "bangla natok golpo", "the screen", "দ্য স্ক্রিন"]

# Theme playlists + hashtags. Story-only format: viewers find us by the life theme, never by a book.
# key: (playlist title, playlist description, hashtag, search tags, match words)
THEMES = {
    "parents": ("বাবা-মায়ের গল্প | The Screen", "বাবা-মায়ের নীরব ত্যাগ আর ভালোবাসার বাংলা জীবনের গল্প।", "#বাবামায়েরগল্প",
                ["বাবার গল্প", "মায়ের গল্প", "babar golpo", "mayer golpo", "বাবা মায়ের ভালোবাসা"],
                ["বাবা", "আব্বা", "আব্বু", "মা ", "মায়ের", "আম্মা", "আম্মু", "মেয়ে", "ছেলে"]),
    "siblings": ("ভাই-বোনের গল্প | The Screen", "ভাই-বোনের খুনসুটি, ত্যাগ আর টানের গল্প।", "#ভাইবোন",
                 ["ভাই বোনের গল্প", "vai boner golpo", "ভাইয়ের ভালোবাসা", "বোনের গল্প"], ["ভাই", "বোন", "ভাইয়া", "আপু"]),
    "family": ("সংসারের গল্প | The Screen", "স্বামী-স্ত্রী, শ্বশুরবাড়ি, যৌথ পরিবার— সংসারের সত্যি গল্প।", "#সংসারেরগল্প",
               ["সংসারের গল্প", "পরিবারের গল্প", "স্বামী স্ত্রীর গল্প", "sonsar golpo"], ["সংসার", "স্বামী", "স্ত্রী", "জা", "শ্বশুর", "শাশুড়ি", "বউ", "যৌথ", "পরিবার", "দাদু", "নানু"]),
    "work": ("চাকরি ও অফিসের গল্প | The Screen", "অফিস, বস, সহকর্মী আর চাকরির সংগ্রামের গল্প।", "#অফিসেরগল্প",
             ["অফিসের গল্প", "চাকরির গল্প", "office story bangla", "বেকার জীবনের গল্প"], ["অফিস", "বস", "চাকরি", "ইন্টারভিউ", "সহকর্মী", "প্রমোশন", "পিয়ন"]),
    "money": ("টাকা ও সঞ্চয়ের গল্প | The Screen", "টাকা, ঋণ, কিস্তি আর সঞ্চয় নিয়ে জীবনের গল্প।", "#টাকারগল্প",
              ["টাকার গল্প", "সঞ্চয়ের গল্প", "ঋণ", "কিস্তি", "taka poysar golpo"], ["টাকা", "সঞ্চয়", "কিস্তি", "ঋণ", "লাভ", "পাসবই", "বিকাশ"]),
    "struggle": ("ছোট ব্যবসা ও সংগ্রামের গল্প | The Screen", "দোকানি, হকার, রিকশাওয়ালা, গার্মেন্টস কর্মী— খেটে খাওয়া মানুষের সম্মানের গল্প।", "#সংগ্রামেরগল্প",
                 ["সংগ্রামের গল্প", "ছোট ব্যবসার গল্প", "খেটে খাওয়া মানুষের গল্প", "motivational story bangla"], ["দোকান", "ব্যবসা", "হকার", "রিকশা", "গার্মেন্টস", "দর্জি", "টিফিন", "ফুচকা"]),
    "community": ("পাড়া-মহল্লার গল্প | The Screen", "প্রতিবেশী, মহল্লা, গ্রাম— মানুষ একসাথে হলে যা বদলায়।", "#পাড়ারগল্প",
                  ["পাড়ার গল্প", "প্রতিবেশীর গল্প", "গ্রামের গল্প", "মহল্লার গল্প"], ["পাড়া", "প্রতিবেশী", "মহল্লা", "গ্রাম", "বাড়িওয়ালা", "ভাড়াটে", "ক্লাব", "হকার"]),
    "school": ("শিক্ষক ও ছাত্রের গল্প | The Screen", "স্কুল, শিক্ষক, পরীক্ষা আর স্বপ্নের গল্প।", "#শিক্ষকেরগল্প",
               ["শিক্ষকের গল্প", "ছাত্র জীবনের গল্প", "স্কুলের গল্প", "student motivation bangla"], ["স্কুল", "শিক্ষক", "স্যার", "ম্যাডাম", "পরীক্ষা", "কোচিং", "ছাত্র", "রেজাল্ট"]),
    "probashi": ("প্রবাসীর গল্প | The Screen", "দেশে রেখে যাওয়া পরিবার আর প্রবাসী মানুষের গল্প।", "#প্রবাসীরগল্প",
                 ["প্রবাসীর গল্প", "probashi golpo", "দুবাই প্রবাসী", "প্রবাস জীবন"], ["প্রবাস", "দুবাই", "সৌদি", "মালয়েশিয়া", "ওমান", "কাতার"]),
    "honesty": ("সততা ও সচেতনতার গল্প | The Screen", "সৎ থাকার দাম, প্রতারণা থেকে বাঁচার সত্যি গল্প।", "#সততারগল্প",
                ["সততার গল্প", "প্রতারণা", "সচেতনতার গল্প", "honesty story bangla"], ["সৎ", "প্রতারণা", "ঠক", "সাবধান", "গুজব", "ভুল নাম্বার", "ফেরত"]),
}
THEME_ORDER = ["probashi", "school", "work", "siblings", "honesty", "money", "community", "struggle", "family", "parents"]


def theme_of(script):
    """Explicit `theme` in the script wins; otherwise the best keyword match over title, tags and caption."""
    t = script.get("theme")
    if t in THEMES:
        return t
    text = " ".join([script.get("title_bn", ""), script["youtube"].get("title", ""), script["youtube"].get("description", "")[:300],
                     " ".join(script["youtube"].get("tags", [])), (script.get("facebook") or {}).get("caption", "")]) + " "
    weight = {"probashi": 3, "school": 2, "work": 2, "siblings": 2, "honesty": 2}
    score = {k: weight.get(k, 1) * sum(text.count(w) for w in THEMES[k][4]) for k in THEMES}
    best = max(THEME_ORDER, key=lambda k: (score[k], -THEME_ORDER.index(k)))
    return best if score[best] else "family"


def playlist_for(script):
    k = theme_of(script)
    return "theme:" + k, THEMES[k][0], THEMES[k][1]


SHARE_LINES = ["যাকে এই গল্পটা শোনা দরকার, তাকে পাঠিয়ে দাও 💌", "তোমার পরিবারের কাউকে গল্পটা পাঠাও— হয়তো আজই তার দরকার 🤍",
               "এই গল্পটা কার কথা মনে করিয়ে দিল? তাকে ট্যাগ করো 👇"]


def _ask_quote(script):
    for b in script["beats"]:
        if b.get("kind") == "ask" and (b.get("card") or {}).get("quote"):
            return plain(b["card"]["quote"]).replace("\n", " ")
    return None


def _outro(script):
    for b in script["beats"]:
        if b.get("kind") == "outro":
            c = b.get("card") or {}
            return plain(f"{c.get('line1', '')} {c.get('line2', '')}").replace("\n", " ").strip()
    return ""


def _hashtag(s):
    return "#" + re.sub(r"[^\wঀ-৿]", "", s.replace(" ", ""))


def youtube_meta(script, seed=0):
    yt = script["youtube"]
    src = script["source"]
    title = re.sub(r"\s*\|\s*[^|]*$", "", yt["title"].strip()) if "|" in yt["title"] else yt["title"].strip()
    title = (title + " | বাংলা গল্প") if len(title) < 80 else title
    if len(title) > 100:
        title = title[:97].rstrip() + "…"
    th = THEMES[theme_of(script)]
    hashtags = ["#Shorts", "#বাংলাগল্প", th[2], "#জীবনেরগল্প", "#TheScreen"]   # first 3 show above the title
    q = _ask_quote(script)
    lines = [
        yt["description"].strip().split("\n")[0],                       # line 1 = hook (shown in search)
        "🎬 একটি মৌলিক বাংলা জীবনের গল্প — The Screen",
        "",
        "\n".join(yt["description"].strip().split("\n")[1:]).strip(),
        "",
        f"💭 {q}" if q else "",
        f"✨ {_outro(script)}",
        "",
        SHARE_LINES[seed % len(SHARE_LINES)],
        "🔔 প্রতিদিন নতুন গল্প — The Screen ফলো করো।",
        "",
        f"✍️ সব চরিত্র ও ঘটনা কাল্পনিক। ভাবনার অনুপ্রেরণা: {src['book']} ({src['author']})।",
        "",
        " ".join(hashtags),
    ]
    desc = "\n".join(l for l in lines if l is not None)
    desc = re.sub(r"\n{3,}", "\n\n", desc).strip()
    tags, total = [], 0
    bookish = [w.lower() for b in BOOK_KEYWORDS for w in BOOK_KEYWORDS[b]] + [src["book"].lower(), src["author"].lower()]
    for t in yt.get("tags", []) + th[3] + CORE_TAGS:
        t = (t or "").strip()
        if any(w in t.lower() or t.lower() in w for w in bookish) or re.search(r"(?i)book|summary|greene|orwell|cialdini|kahneman|housel", t):
            continue                                       # story-only channel: no book searches
        if t and t.lower() not in [x.lower() for x in tags] and total + len(t) + 3 <= 480:
            tags.append(t)
            total += len(t) + 3
    return {"title": title, "description": desc[:4900], "tags": tags}


def facebook_caption(script, seed=0):
    """Facebook: exactly two lines (hook · question to the viewer) + exactly 5 hashtags. No links, no book.
    Short captions keep the video in focus; the question drives comments, which the feed ranks highly."""
    fb = script.get("facebook", {})
    base = (fb.get("caption") or script["youtube"]["title"]).strip()
    base = re.sub(r"https?://\S+", "", base)
    own_tags = re.findall(r"#[\w\u0980-\u09FF]+", base)
    body = re.sub(r"#[\w\u0980-\u09FF]+", "", base)
    lines = [l.strip() for l in body.split("\n") if l.strip() and not l.strip().startswith("📖")]
    q = next((l for l in reversed(lines) if "?" in l or "👇" in l), None)
    hook = next((l for l in lines if l != q), None) or plain(script["youtube"]["title"])
    if not q:
        q = (_ask_quote(script) or "তোমার জীবনে এমন কেউ আছে? কমেন্টে লিখো") + " 👇"
    elif "👇" not in q:
        q += " 👇"
    th = THEMES[theme_of(script)]
    tags, norm = [], lambda x: re.sub(r"^#the", "#", x.lower())
    for t in own_tags + [th[2], "#বাংলাগল্প", "#জীবনেরগল্প", "#TheScreen", "#গল্প", "#reels"]:
        if norm(t) not in [norm(x) for x in tags]:
            tags.append(t)
    return f"{hook}\n{q}\n\n{' '.join(tags[:5])}".strip()


def question(script):
    """The viewer question: the old ask-card, else the question line of the Facebook caption."""
    q = _ask_quote(script)
    if q:
        return q
    cap = re.sub(r"#[\w\u0980-\u09FF]+", "", (script.get("facebook") or {}).get("caption", ""))
    for l in reversed([x.strip() for x in cap.split("\n") if x.strip()]):
        if "?" in l:
            return l.replace("👇", "").strip()
    return None


def first_comment(script):
    q = question(script)
    if not q:
        return None
    return f"💭 {q}\n\nতোমার উত্তরটা কমেন্টে লিখো— আমরা সব পড়ি 🤍"
