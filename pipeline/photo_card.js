// Render a 1080x1350 Facebook photo card for a script: the story's aphorism + its two main characters.
// usage: node pipeline/photo_card.js <script.json> <out.jpg>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const [sp, out] = process.argv.slice(2);
  const s = JSON.parse(fs.readFileSync(sp, 'utf8'));
  const outro = s.beats.find(b => b.kind === 'outro').card;
  const ids = Object.keys(s.cast).slice(0, 2);
  const root = path.resolve(__dirname, '..');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.goto('file://' + root + '/renderer/index.html');
  await p.waitForTimeout(300);
  const chars = await p.evaluate(([cast, ids]) => {
    const C = window.CHAR;
    let g = '';
    ids.forEach((id, i) => {
      g += C.render(cast[id], { t: 1.2 + i, x: i ? 700 : 370, y: 1240, face: i ? 'left' : 'right', mood: 'smile', arm: i ? 'down' : 'talk', talk: 0, scale: 0.7, pose: 'stand' });
    });
    return g;
  }, [s.cast, ids]);
  const hl = t => t.replace(/\*(.+?)\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  const logo = 'file://' + root + '/assets/brand/logo.png';
  const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="file://${root}/assets/fonts/fonts.css">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1350px;overflow:hidden;background:#F4EDE1;font-family:'Hind Siliguri';color:#2A211C;position:relative}
.glow{position:absolute;inset:0;background:radial-gradient(900px 700px at 70% 30%,#FFF9EE 0%,rgba(255,249,238,0) 70%)}
.grain{position:absolute;inset:0;background:url(file://${root}/assets/brand/grain.png);opacity:.06}
.logo{position:absolute;left:56px;top:52px;height:92px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.18))}
.tag{position:absolute;right:56px;top:76px;font:600 30px 'Hind Siliguri';color:#8A5A36;letter-spacing:.5px}
.q{position:absolute;left:84px;right:84px;top:210px}
.mark{font:700 160px/1 'Noto Serif Bengali',serif;color:#C4473A;opacity:.18;position:absolute;left:-14px;top:-70px}
.l1{font:500 58px/1.35 'Noto Serif Bengali',serif;color:#5A4A42}
.l2{font:700 84px/1.18 'Hind Siliguri';color:#C4473A;margin-top:18px}
.rule{width:120px;height:6px;border-radius:3px;background:#E8A33D;margin:40px 0 22px}
.book{font:600 32px 'Hind Siliguri';color:#7A6A60}
.scene{position:absolute;left:0;right:0;bottom:0;height:560px}
.floor{position:absolute;left:0;right:0;bottom:0;height:110px;background:#E3D2B4;border-top:5px solid #2A211C}
.cta{position:absolute;left:0;right:0;bottom:30px;text-align:center;font:700 34px 'Hind Siliguri';color:#2A211C}
.cta span{background:#2A211C;color:#F4EDE1;border-radius:40px;padding:10px 30px}
</style></head><body><div class="glow"></div><div class="grain"></div>
<img class="logo" src="${logo}"><div class="tag">গল্পে দেখি জীবন</div>
<div class="q"><div class="mark">“</div><div class="l1">${hl(outro.line1)}</div><div class="l2">${hl(outro.line2)}</div><div class="rule"></div>
<div class="book">📖 ${s.source.book} · ${s.source.author}</div></div>
<div class="scene"><div style="position:absolute;left:190px;bottom:40px;width:700px;height:560px;border-radius:50%;background:radial-gradient(closest-side,#FFE3B0 0%,rgba(255,227,176,0) 100%);opacity:.8"></div><div class="floor"></div><svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;left:0;bottom:0">${chars}</svg></div>
<div class="cta"><span>▶ পুরো গল্পটা আমাদের ভিডিওতে</span></div>
</body></html>`;
  const tmp = path.join(path.dirname(out), '.card.html');
  fs.writeFileSync(tmp, html);
  await p.goto('file://' + path.resolve(tmp));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.screenshot({ path: out, type: 'jpeg', quality: 92 });
  fs.unlinkSync(tmp);
  await b.close();
})();
