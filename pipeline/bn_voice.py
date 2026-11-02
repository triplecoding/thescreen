"""Bangla pronunciation fixes applied ONLY to the text sent to the voice engine (captions stay as written).

Owner's rule: verb words that end in "ল" are voiced with "লো" (বলল → বললো, গেল → গেলো, ছিল → ছিলো),
otherwise the TTS reads them with a dead ending ("bolol"). Nouns/names ending in ল (স্কুল, সাইকেল, জালাল,
আসল, দেয়াল) must NOT change, so we only convert recognised past-tense verb forms.
"""
import re

# verb roots (consonant-final) whose simple past is root + ল
ROOTS = set("""
কর বল দেখ হাস কাঁদ পার ফেল পড় রাখ বুঝ তুল বাড় কম শুন শোন ধর মার ডাক থাক জান আন কিন বেচ জিত হার ছুট লিখ খেল
বাঁচ নাম ঢুক উঠ বস ফির ভাব লাগ থাম চল খুল ছাড় ছড় টান টাঙ নড় জ্বল জ্বাল মিশ শিখ গুন গুণ চিন সর ভর ঝর গড় ভাঙ
কাট বাঁধ পাঠ খোঁজ খুঁজ পুড় ফুট ফোট জুড় জোড় ঘুর ঘোর হাঁট দৌড় লুক লড় চাপ মুছ গুছ সাজ ভিজ নাচ গল ফাট
জাগ ঘাম কাঁপ চেঁচ ছুঁড় বদল সামল আগল পাল্ট উল্ট আটক ঝুল দুল মেল মিল গিল ঠেল ধুক চুক রাঁধ বাজ সয় টিক
""".split())
# causative / -া stems whose past is stem + ল (তাকাল → তাকালো)
CAUS = set("""
তাকা দাঁড়া হারা জানা বানা ঘুমা পালা শেখা দেখা চালা থামা লুকা কাঁপা ফেরা ঘোরা সাজা গোছা ভেজা ডোবা ঝোলা নাড়া
কমা বসা ছড়া টাঙা শোনা বোঝা পড়া রাখা ধরা মেলা খাওয়া পাওয়া ছোঁয়া নামা ওঠা তোলা খোলা জ্বালা পোড়া হাসা কাঁদা
এগো বেরো পৌঁছ পেরো
""".split())
IRREGULAR = set("গেল এল হল দিল নিল পেল খেল রইল চাইল গাইল শুল ধুল বইল ছিল হইল দেখাল".split())
NEVER = set("আসল নকল সকল কেবল ফসল দখল মহল পাগল কাজল আঁচল বোতল পিতল জঙ্গল মঙ্গল বাদল সরল সফল বিফল চঞ্চল".split())

_WORD = re.compile(r"(?<![ঀ-৿])([ঀ-৿]+ল)(?![ঀ-৿])")


def is_past_verb(w):
    if w in NEVER:
        return False
    if w in IRREGULAR or w.endswith("ছিল"):
        return True
    stem = w[:-1]
    return stem in ROOTS or stem in CAUS


def fix_lo(text):
    return _WORD.sub(lambda m: m.group(1) + "ো" if is_past_verb(m.group(1)) else m.group(1), text or "")


if __name__ == "__main__":
    import sys
    print(fix_lo(" ".join(sys.argv[1:])))
