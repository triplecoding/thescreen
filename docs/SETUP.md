# সেটআপ গাইড — শুধু একবার করতে হবে

সব key আর token রাখতে হবে **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**-এ।
কোডে বা চ্যাটে কখনো key লিখবে না।

| Secret নাম | কোথা থেকে |
|---|---|
| `ELEVENLABS_API_KEY` | ElevenLabs |
| `YT_CLIENT_ID` | Google Cloud OAuth client |
| `YT_CLIENT_SECRET` | Google Cloud OAuth client |
| `YT_REFRESH_TOKEN` | OAuth Playground |
| `FB_PAGE_ID` | The Screen Facebook পেজের ID |
| `FB_PAGE_TOKEN` | Long-lived Page access token |

সব দেওয়ার পর **Actions → Publish videos → Run workflow → mode = dry-run** চালাও। প্রথম ধাপ "Check secrets"-এ দেখা যাবে কোনটা ঠিক আছে আর কোনটা নেই।

---

## ১. ElevenLabs (pay-as-you-go)
1. elevenlabs.io → Profile → **API Keys** → Create API key।
2. Permission দাও: Text to Speech, Voices (read + write), Voice Generation, Models (read), User (read)।
3. Key টা `ELEVENLABS_API_KEY` নামে secret-এ রাখো।
4. প্রথম রানে সিস্টেম নিজেই Voice Design দিয়ে ন্যারেটর, বাবা, মা, দাদি, কিশোর-কিশোরী, শিশু, মোট ১১টা বাংলা কণ্ঠ বানিয়ে `config/voices.json`-এ লক করে রাখবে। ভিডিও প্রতি খরচ মোটামুটি ১,৭০০–২,০০০ অক্ষর।

## ২. YouTube
1. console.cloud.google.com → নতুন project (নাম: The Screen) → **APIs & Services → Library → YouTube Data API v3 → Enable**।
2. **OAuth consent screen** → External → অ্যাপের নাম The Screen → নিজের ইমেইল দাও → Scopes-এ `youtube.upload` আর `youtube` যোগ করো।
   ⚠️ এরপর **Publish app → In production** করে দাও। "Testing" মোডে রাখলে refresh token ৭ দিন পর বাতিল হয়ে যায়।
3. **Credentials → Create credentials → OAuth client ID → Web application**।
   Authorized redirect URI: `https://developers.google.com/oauthplayground`
   এখান থেকে Client ID আর Client secret পাবে, এ দুটোই `YT_CLIENT_ID` আর `YT_CLIENT_SECRET`।
4. developers.google.com/oauthplayground খোলো → ডান পাশের ⚙️ → "Use your own OAuth credentials"-এ টিক দিয়ে Client ID আর Secret বসাও।
   বাম পাশে এই দুটো scope লিখে দাও: `https://www.googleapis.com/auth/youtube.upload` আর `https://www.googleapis.com/auth/youtube` →
   Authorize → **The Screen চ্যানেলের Google অ্যাকাউন্ট** দিয়ে লগইন করো → "Exchange authorization code for tokens" →
   **Refresh token** কপি করে `YT_REFRESH_TOKEN`-এ রাখো।
5. ⚠️ জরুরি: নতুন বা যাচাই না হওয়া API project দিয়ে আপলোড করা ভিডিও YouTube **private** করে রাখে, যতক্ষণ না project-টা অডিট পাস করে।
   তাই শুরুতেই "YouTube API Services — Audit and Quota Extension" ফর্ম জমা দাও।
   অডিট পাস হওয়ার আগ পর্যন্ত ভিডিও আপলোড হবে কিন্তু private থাকবে। চাইলে YouTube Studio থেকে হাতে public করতে পারবে।
6. চ্যানেলে Shorts ২ মিনিটের বেশি লম্বা হলে **long uploads** (ফোন নম্বর দিয়ে চ্যানেল verify) চালু থাকা লাগে। কাস্টম থাম্বনেইলের জন্যও verify লাগে।

## ৩. Facebook পেজ
1. developers.facebook.com → **My Apps → Create App** → Business টাইপ।
2. **Graph API Explorer** খোলো → তোমার অ্যাপ সিলেক্ট করো → User token নাও এই permission দিয়ে:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `publish_video`।
3. Access Token Debugger-এ গিয়ে "Extend Access Token" চাপো, তাহলে long-lived user token পাবে।
4. Graph API Explorer-এ সেই token দিয়ে `me/accounts` চালাও → The Screen পেজের `id` হলো `FB_PAGE_ID`, আর সেখানকার `access_token` হলো `FB_PAGE_TOKEN`।
   Long-lived user token থেকে নেওয়া এই Page token-এর মেয়াদ সাধারণত শেষ হয় না।

## ৪. সময়সূচি বদলাতে চাইলে
`config/channel.json`:
- `posts_per_day` — দিনে কয়টা ভিডিও যাবে (এখন ৪টা, প্রতি ৬ ঘণ্টায় একটা)।
- `slots` — ঢাকার সময় অনুযায়ী প্রকাশের সময় (এখন ০৮:০০, ১৪:০০, ২০:০০, ০২:০০)।
  সময় বদলালে `.github/workflows/daily.yml`-এর cron-ও বদলাতে হবে, প্রতিটা স্লটের ~৩৫ মিনিট আগে (UTC = ঢাকা − ৬ ঘণ্টা)।
- `publish_mode` — `scheduled` দিলে রাতে বানিয়ে সময়মতো প্রকাশ হবে, `immediate` দিলে বানানোর সঙ্গে সঙ্গেই প্রকাশ হবে।

## ৫. নিজের মিউজিক দিতে চাইলে
লাইসেন্স করা বা রয়্যালটি-ফ্রি mp3 `assets/music/` ফোল্ডারে রাখো। ফোল্ডার খালি থাকলে সিস্টেম নিজেই একটা মৌলিক পিয়ানো স্কোর বানিয়ে নেয়, তাই কপিরাইটের কোনো ঝুঁকি নেই।
