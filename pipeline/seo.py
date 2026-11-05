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
CORE_TAGS = ["বাংলা গল্প", "জীবনের গল্প", "শিক্ষণীয় গল্প", "bangla story", "bangla motivational story", "book summary bangla",
             "বাংলা মোটিভেশন", "life lesson bangla", "the screen", "দ্য স্ক্রিন"]
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
    book_tag = _hashtag(src["book"].split(":")[0])
    tags3 = ["#Shorts", "#বাংলাগল্প", book_tag]
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
        " ".join(["#Shorts", "#বাংলাগল্প", "#জীবনেরগল্প", "#TheScreen", "#গল্প"]),
    ]
    desc = "\n".join(l for l in lines if l is not None)
    desc = re.sub(r"\n{3,}", "\n\n", desc).strip()
    tags, total = [], 0
    for t in yt.get("tags", []) + BOOK_KEYWORDS.get(src["book"], []) + [src["book"], src["author"], src.get("title", "")] + CORE_TAGS:
        t = (t or "").strip()
        if t and t.lower() not in [x.lower() for x in tags] and total + len(t) + 3 <= 480:
            tags.append(t)
            total += len(t) + 3
    return {"title": title, "description": desc[:4900], "tags": tags}


def facebook_caption(script, seed=0):
    """Hook line → audience question → share prompt → book credit → max 5 hashtags at the end. No links."""
    fb = script.get("facebook", {})
    src = script["source"]
    base = (fb.get("caption") or script["youtube"]["title"]).strip()
    base = re.sub(r"https?://\S+", "", base)
    own_tags = re.findall(r"#[\w\u0980-\u09FF]+", base)
    body = re.sub(r"#[\w\u0980-\u09FF]+", "", base)
    body = "\n".join(l.rstrip() for l in body.split("\n") if not l.strip().startswith("📖")).strip()
    body = re.sub(r"\n{3,}", "\n\n", body)
    tags = []
    for t in own_tags + ["#TheScreen", "#বাংলাগল্প", "#জীবনেরগল্প", "#গল্প"]:
        norm = lambda x: re.sub(r"^#the", "#", x.lower())
        if norm(t) not in [norm(x) for x in tags]:
            tags.append(t)
    return f"{body}\n\n{SHARE_LINES[(seed + 1) % len(SHARE_LINES)]}\n\n{' '.join(tags[:5])}".strip()


def first_comment(script):
    q = _ask_quote(script)
    if not q:
        return None
    return f"💭 {q}\n\nতোমার উত্তরটা কমেন্টে লিখো— আমরা পড়ি 🤍"
