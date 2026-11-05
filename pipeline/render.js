// Render a timeline to MP4 (video only). One encoded file per beat, joined with the concat demuxer.
// usage: node pipeline/render.js <timeline.json> <out.mp4> [workers] [--frames t1,t2,...  (png stills instead)]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGE = 'file://' + path.join(ROOT, 'renderer', 'index.html');

function ffmpegSeg(out, fps) {
  return spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'animation', '-crf', '20', '-maxrate', '14M', '-bufsize', '28M', '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
}

async function openPage(browser, tl) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('[page error]', e.message));
  await page.goto(PAGE);
  await page.evaluate(async t => { window.__info = await window.TS.init(t); }, tl);
  return page;
}

async function frame(page, t, type = 'jpeg') {
  await page.evaluate(x => window.TS.renderAt(x), t);
  return page.screenshot(type === 'jpeg' ? { type: 'jpeg', quality: 92 } : { type: 'png' });
}

(async () => {
  const [tlPath, out, w, ...rest] = process.argv.slice(2);
  const tl = JSON.parse(fs.readFileSync(tlPath, 'utf8'));
  const fps = tl.fps || 30;
  const browser = await chromium.launch({ args: ['--disable-gpu', '--font-render-hinting=none'] });
  const ti = rest.indexOf('--thumb');
  if (ti >= 0) {   // thumbnail: the most emotional moment + the title overlay → <out> (png)
    const page = await openPage(browser, tl);
    const t = await page.evaluate(() => { window.THUMB_MODE = true; return window.TS.thumbTime(); });
    fs.writeFileSync(out, await frame(page, t, 'png'));
    console.log(`thumbnail at ${t.toFixed(2)}s`);
    await browser.close();
    return;
  }
  const fi = rest.indexOf('--frames');
  if (fi >= 0) {   // stills mode for QA
    const times = rest[fi + 1].split(',').map(Number);
    const page = await openPage(browser, tl);
    fs.mkdirSync(out, { recursive: true });
    for (const t of times) fs.writeFileSync(path.join(out, `f_${t.toFixed(2)}.png`), await frame(page, t, 'png'));
    await browser.close();
    return;
  }
  const workers = Math.max(1, parseInt(w || '0') || Math.min(4, require('os').cpus().length));
  const segDir = out + '.segs';
  fs.mkdirSync(segDir, { recursive: true });
  const N = Math.round(tl.duration * fps);
  const bounds = tl.beats.map(b => Math.round(b.start * fps)).concat([N]);
  const jobs = [];
  for (let k = 0; k < tl.beats.length; k++) if (bounds[k + 1] > bounds[k]) jobs.push({ k, a: bounds[k], b: bounds[k + 1] });
  // longest jobs first for better packing
  const queue = jobs.slice().sort((x, y) => (y.b - y.a) - (x.b - x.a));
  const t0 = Date.now();
  let done = 0;
  async function worker() {
    const page = await openPage(browser, tl);
    while (queue.length) {
      const j = queue.shift();
      const final = path.join(segDir, `seg_${String(j.k).padStart(3, '0')}.mp4`);
      if (fs.existsSync(final)) { done += j.b - j.a; continue; }
      const tmp = final.slice(0, -4) + '.part.mp4';
      const ff = ffmpegSeg(tmp, fps);
      const closed = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));
      for (let n = j.a; n < j.b; n++) {
        const buf = await frame(page, n / fps);
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      }
      ff.stdin.end();
      await closed;
      fs.renameSync(tmp, final);
      done += j.b - j.a;
      const el = (Date.now() - t0) / 1000;
      process.stdout.write(`\r[render] ${done}/${N} frames  ${(done / el).toFixed(1)} fps  ${el.toFixed(0)}s   `);
    }
    await page.close();
  }
  await Promise.all(Array.from({ length: workers }, worker));
  await browser.close();
  const list = jobs.map(j => `file '${path.join(segDir, `seg_${String(j.k).padStart(3, '0')}.mp4`)}'`).join('\n');
  fs.writeFileSync(path.join(segDir, 'list.txt'), list + '\n');
  await new Promise((res, rej) => spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(segDir, 'list.txt'), '-c', 'copy', out + '.part.mp4'], { stdio: 'inherit' })
    .on('close', c => c === 0 ? res() : rej(new Error('concat failed'))));
  fs.renameSync(out + '.part.mp4', out);
  console.log(`\n[render] done ${out} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
})().catch(e => { console.error(e); process.exit(1); });
