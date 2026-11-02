// Facebook photo card (1080x1350): a real scene cut from the episode's video on top, the story's aphorism below,
// a red hook badge, and a "full story in the comments" call to action.
// usage: node pipeline/photo_card.js <script.json> <out.jpg> <scene.jpg> [crop_y=470] [crop_h=960]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const [sp, out, scene, cy = '470', ch = '960'] = process.argv.slice(2);
  const s = JSON.parse(fs.readFileSync(sp, 'utf8'));
  const outro = s.beats.find(b => b.kind === 'outro').card;
  const root = path.resolve(__dirname, '..');
  const hl = t => t.replace(/\*(.+?)\*/g, '<b>$1</b>').replace(/\n/g, ' ');
  const H = 1040;                                       // hero height on the card
  const sc = H / Number(ch);                           // scale the cropped region to fill the hero
  const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="file://${root}/assets/fonts/fonts.css">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1350px;overflow:hidden;background:#141B30;font-family:'Hind Siliguri';position:relative}
.hero{position:absolute;left:0;top:0;width:1080px;height:${H}px;overflow:hidden}
.hero img{position:absolute;left:${(1080 - 1080 * sc) / 2}px;top:${-Number(cy) * sc}px;width:${1080 * sc}px}
.fade{position:absolute;left:0;right:0;top:${H - 360}px;height:362px;background:linear-gradient(180deg,rgba(20,27,48,0) 0%,rgba(20,27,48,.75) 55%,#141B30 100%)}
.topfade{position:absolute;left:0;right:0;top:0;height:260px;background:linear-gradient(180deg,rgba(20,27,48,.85) 0%,rgba(20,27,48,.45) 55%,rgba(20,27,48,0) 100%)}
.logo{position:absolute;left:48px;top:40px;height:96px;filter:drop-shadow(0 3px 6px rgba(0,0,0,.45))}
.badge{position:absolute;left:56px;top:${H - 310}px;display:flex;flex-direction:column;gap:8px}
.badge .t{align-self:flex-start;background:#C4473A;color:#fff;font:700 56px/1.15 'Hind Siliguri';padding:10px 26px 14px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.35);transform:rotate(-1.5deg)}
.badge .s{align-self:flex-start;background:rgba(255,255,255,.92);color:#2A211C;font:600 32px 'Hind Siliguri';padding:6px 18px;border-radius:10px}
.q{position:absolute;left:64px;right:64px;top:${H - 74}px}
.l1{font:500 44px/1.35 'Noto Serif Bengali',serif;color:#C9D1E3}
.l2{font:700 78px/1.18 'Hind Siliguri';color:#F2C14E;margin-top:6px}
.meta{position:absolute;left:64px;right:64px;bottom:44px;display:flex;justify-content:space-between;align-items:center}
.book{font:600 28px 'Hind Siliguri';color:#8F9AB3;max-width:540px}
.cta{background:#C4473A;color:#fff;font:700 32px 'Hind Siliguri';padding:12px 26px;border-radius:40px;white-space:nowrap}
.frame{position:absolute;inset:18px;border:2px solid rgba(242,193,78,.35);border-radius:22px;pointer-events:none}
</style></head><body>
<div class="hero"><img src="file://${path.resolve(scene)}"><div class="topfade"></div><div class="fade"></div></div>
<img class="logo" src="file://${root}/assets/brand/logo.png">
<div class="badge"><div class="t">${s.thumbnail.text}</div><div class="s">${s.thumbnail.sub || ''}</div></div>
<div class="q"><div class="l1">${hl(outro.line1)}</div><div class="l2">${hl(outro.line2)}</div></div>
<div class="meta"><div class="book">📖 ${s.source.book}</div><div class="cta">▶ পুরো গল্প কমেন্টে 👇</div></div>
<div class="frame"></div>
</body></html>`;
  const tmp = path.join(path.dirname(path.resolve(out)), '.card.html');
  fs.writeFileSync(tmp, html);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.goto('file://' + tmp);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.screenshot({ path: out, type: 'jpeg', quality: 92 });
  fs.unlinkSync(tmp);
  await b.close();
})();
