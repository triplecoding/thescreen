// The Screen — timeline engine. window.TS.init(timeline) then window.TS.renderAt(t) draws one frame.
(function (g) {
  const U = g.U, CH = g.CHAR, SETS = g.SETS, UI = g.UI, TH = g.THEME;
  const E = U.ease;
  const FLOOR = 1440;
  let TL = null, SCRIPT = null, R = [];
  const STORY = 'story';

  // ---------------- resolve script beats into complete states ----------------
  function resolve(script, tl) {
    const out = [];
    let scene = { set: 'home', light: 'day', props: [], chars: [], chip: null, widget: null, fx: null };
    let cards = {};
    script.beats.forEach((b, i) => {
      const kind = b.kind || STORY;
      const T = tl.beats[i] || {};
      const r = { i, kind, say: b.say || '', voice: b.voice || 'narrator', tone: b.tone, show: b.show, reveal: b.reveal,
        start: T.start, end: T.end, audioStart: T.audioStart || 0, audioDur: T.audioDur || 0, words: T.words || [], env: T.env || [] };
      const castDef = script.cast && script.cast[r.voice];
      r.speakerName = castDef ? castDef.name : null;
      if (kind === STORY) {
        const sc = b.scene || {};
        let s = JSON.parse(JSON.stringify(scene));
        s.bubble = null; s.cam = undefined; s.fresh = false;
        if (sc.set && sc.set !== scene.set) { s = { set: sc.set, light: 'day', props: [], chars: [], chip: null, widget: null, fx: null, bubble: null }; s.fresh = true; }
        ['light', 'chip', 'props', 'fx'].forEach(k => { if (k in sc) s[k] = sc[k]; });
        if ('widget' in sc) s.widget = sc.widget;
        if ('bubble' in sc) s.bubble = sc.bubble;
        if (sc.chars) s.chars = JSON.parse(JSON.stringify(sc.chars));
        const patch = (key, field) => { if (sc[key]) Object.entries(sc[key]).forEach(([id, v]) => { const c = s.chars.find(c => c.id === id); if (c) c[field] = v; }); };
        patch('moods', 'mood'); patch('arms', 'arm'); patch('holds', 'hold'); patch('faces', 'face'); patch('poses', 'pose');
        s.cam = sc.cam || 'static';
        if (sc.light && sc.light !== scene.light) s.fresh = s.fresh || 'light';
        scene = s;
        r.scene = s;
      } else {
        let card = b.card ? JSON.parse(JSON.stringify(b.card)) : null;
        if (!card && cards[kind]) card = JSON.parse(JSON.stringify(cards[kind]));
        if (b.card && cards[kind] && kind === 'takeaways' && !b.card.items) card.items = cards[kind].items;
        if (kind === 'book') card = Object.assign({ source: script.source }, card || {});
        cards[kind] = card;
        r.card = card || {};
      }
      out.push(r);
    });
    return out;
  }

  function transition(prev, cur) {
    if (!prev) return 'none';
    if (prev.kind === STORY && cur.kind === STORY) {
      if (cur.scene.fresh === true) return 'iris';
      if (cur.scene.fresh === 'light') return 'fade';
      return 'none';
    }
    if (prev.kind !== cur.kind) return 'fade';
    return 'none';
  }

  // ---------------- camera ----------------
  function charPos(s, c) { return { x: c.x * 1080, y: FLOOR + 6 }; }
  function camFor(beat, lt) {
    const s = beat.scene, dur = beat.end - beat.start;
    const p = U.clamp(lt / Math.max(1, dur));
    let cam = s.cam;
    let z = 1.03, cx = 540, cy = 760;
    if (cam === 'push') { z = U.lerp(1.0, 1.08, E.inOut(p)); }
    else if (cam === 'wide') { z = U.lerp(1.0, 0.985, p); }
    else if (cam === 'pan') { z = 1.09; cx = U.lerp(500, 580, E.inOut(p)); }
    else if (cam === 'static' || !cam) { z = 1.02 + 0.015 * p; }
    else if (typeof cam === 'object') {
      z = (cam.zoom || 1.3) + 0.04 * p;
      if (cam.focus) {
        const c = s.chars.find(c => c.id === cam.focus);
        const def = SCRIPT.cast[cam.focus];
        if (c && def) {
          const pos = charPos(s, c);
          const hp = CH.headPos(def, { scale: 0.9, x: pos.x, y: pos.y, face: c.face, pose: c.pose });
          cx = hp.x; cy = hp.y + 140 / z + 60;
        }
      }
    }
    if (s.widget) cy -= (s.widget.kind === 'checklist' || s.widget.kind === 'chat' || s.widget.kind === 'note' ? 120 : 70) / z;
    // keep inside the world
    const hw = 540 / z, hTop = 760 / z, hBot = 1160 / z;
    cx = U.clamp(cx, -140 + hw, 1220 - hw);
    cy = U.clamp(cy, -140 + hTop - 140, 2040 - hBot);
    return { z, cx, cy };
  }
  function camAt(i, lt) {
    const b = R[i];
    let c = camFor(b, lt);
    const prev = R[i - 1];
    if (prev && prev.kind === STORY && transition(prev, b) === 'none') {
      const pc = camFor(prev, prev.end - prev.start);
      const k = E.inOut(U.prog(lt, 0, 0.6));
      c = { z: U.lerp(pc.z, c.z, k), cx: U.lerp(pc.cx, c.cx, k), cy: U.lerp(pc.cy, c.cy, k) };
    }
    return c;
  }
  const toScreen = (cam, x, y) => ({ x: 540 + (x - cam.cx) * cam.z, y: 760 + (y - cam.cy) * cam.z });

  // ---------------- characters ----------------
  function charStates(i, lt, t) {
    const b = R[i], s = b.scene;
    const prev = R[i - 1];
    const ps = prev && prev.kind === STORY && transition(prev, b) === 'none' ? prev.scene : null;
    const list = [];
    const fps = TL.fps || 30;
    s.chars.forEach(c => {
      const def = SCRIPT.cast[c.id]; if (!def) return;
      const pc = ps ? ps.chars.find(x => x.id === c.id) : null;
      const k = E.inOut(U.prog(lt, 0, 0.5));
      let x = c.x * 1080, alpha = 1, slide = 0;
      if (pc) x = U.lerp(pc.x * 1080, c.x * 1080, k);
      else { alpha = U.prog(lt, 0, 0.35); slide = (1 - E.out(U.prog(lt, 0, 0.45))) * (c.face === 'left' ? 60 : -60); }
      if (c.pose === 'walk') x += (c.face === 'left' ? -1 : 1) * lt * 14;
      const A = CH.ARMS[c.arm || 'down'] || CH.ARMS.down;
      let armF = A.f, armB = A.b;
      if (pc && pc.arm !== c.arm && !A.crossed && !(CH.ARMS[pc.arm] || {}).crossed) {
        const PA = CH.ARMS[pc.arm || 'down'] || CH.ARMS.down, q = E.inOut(U.prog(lt, 0, 0.35));
        armF = [U.lerp(PA.f[0], A.f[0], q), U.lerp(PA.f[1], A.f[1], q)];
        armB = [U.lerp(PA.b[0], A.b[0], q), U.lerp(PA.b[1], A.b[1], q)];
      }
      let hold = c.hold;
      if (pc && pc.hold !== c.hold && lt < 0.25) hold = pc.hold;
      let talk = 0;
      if (b.voice === c.id && b.env && b.env.length) {
        const idx = Math.floor((lt - b.audioStart) * fps);
        if (idx >= 0 && idx < b.env.length) talk = b.env[idx];
      }
      const ph = U.hash(c.id) * 3, period = 3.2 + U.hash(c.id + 'b') * 1.8;
      const bt = (t + ph) % period;
      const blink = bt < 0.14 ? 1 : 0;
      const pop = pc && pc.mood !== c.mood ? Math.sin(U.prog(lt, 0, 0.3) * Math.PI) : 0;
      list.push({ def, st: { scale: 0.9, x: x + slide, y: FLOOR + 6, face: c.face || 'right', pose: c.pose || 'stand', mood: c.mood || 'neutral', arm: c.arm || 'down', armF, armB, hold, talk, blink, t, pop, alpha, seat: s._seat }, id: c.id });
    });
    if (ps) ps.chars.forEach(pc => {
      if (s.chars.find(c => c.id === pc.id)) return;
      const def = SCRIPT.cast[pc.id]; if (!def) return;
      const a = 1 - U.prog(lt, 0, 0.3); if (a <= 0) return;
      list.unshift({ def, st: { scale: 0.9, x: pc.x * 1080, y: FLOOR + 6, face: pc.face, pose: pc.pose, mood: pc.mood, arm: pc.arm, hold: pc.hold, t, alpha: a, seat: s._seat }, id: pc.id });
    });
    return list;
  }

  // ---------------- fx ----------------
  function fx(kind, t, lt) {
    if (!kind) return '';
    if (kind === 'rain') {
      let s = '<svg style="position:absolute;inset:0" width="1080" height="1920">';
      for (let i = 0; i < 90; i++) {
        const x = U.rand('rx', i) * 1200 - 60, sp = 1600 + U.rand('rs', i) * 900;
        const y = ((U.rand('ry', i) * 2200 + t * sp) % 2200) - 200;
        s += `<line x1="${x}" y1="${y}" x2="${x - 14}" y2="${y + 60}" stroke="#CFE2FF" stroke-width="3" opacity="0.45"/>`;
      }
      return s + '</svg><div style="position:absolute;inset:0;background:rgba(40,60,110,.18)"></div>';
    }
    if (kind === 'dust') {
      let s = '<svg style="position:absolute;inset:0" width="1080" height="1920">';
      for (let i = 0; i < 30; i++) { const x = (U.rand('dx', i) * 1080 + Math.sin(t * 0.5 + i) * 30), y = ((U.rand('dy', i) * 1920 - t * 20 * (0.5 + U.rand('dv', i))) % 1920 + 1920) % 1920; s += `<circle cx="${x}" cy="${y}" r="${2 + U.rand('dr', i) * 4}" fill="#FFE6B0" opacity="${0.25 + 0.35 * Math.abs(Math.sin(t + i))}"/>`; }
      return s + '</svg>';
    }
    if (kind === 'glow') return `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%, rgba(255,214,140,${0.22 + 0.06 * Math.sin(t * 1.5)}) 0%, rgba(255,214,140,0) 65%);mix-blend-mode:screen"></div>`;
    if (kind === 'pulse') return `<div style="position:absolute;inset:0;box-shadow:inset 0 0 ${200 + 80 * Math.abs(Math.sin(t * 3.2))}px rgba(200,20,30,.55)"></div>`;
    return '';
  }

  // ---------------- one layer (world or card) ----------------
  function layer(i, lt, t) {
    const b = R[i];
    const dur = b.end - b.start;
    const prev = R[i - 1];
    if (b.kind === STORY) {
      const s = b.scene;
      const setFn = SETS[s.set] || SETS.home;
      const S = setFn(s.light, s.props, t, 'L' + i);
      s._seat = S.seat;
      const cam = camAt(i, lt);
      const chars = charStates(i, lt, t);
      let world = `<svg style="position:absolute;inset:0" width="1080" height="1920" viewBox="0 0 1080 1920"><g transform="translate(540 760) scale(${cam.z}) translate(${-cam.cx} ${-cam.cy})">${S.back}${chars.map(c => CH.render(c.def, c.st)).join('')}${S.front}</g></svg>`;
      if (s.fx === 'bw') world = `<div style="position:absolute;inset:0;filter:grayscale(1) sepia(.25)">${world}</div>`;
      let h = world + fx(s.fx, t, lt);
      if (s.light === 'night') h += `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 40%, rgba(8,10,30,.35) 100%)"></div>`;
      // widget (entering if different from previous story beat's widget)
      const pw = prev && prev.kind === STORY && !s.fresh ? prev.scene.widget : null;
      const entering = !pw || JSON.stringify(pw) !== JSON.stringify(s.widget);
      h += UI.widget(s.widget, lt, dur, entering);
      // bubble
      if (s.bubble && s.bubble.who) {
        const c = chars.find(c => c.id === s.bubble.who);
        if (c) { const hp = CH.headPos(c.def, c.st); const sp = toScreen(cam, hp.x, hp.y - 120); h += UI.bubble(s.bubble.text, sp.x, sp.y, lt); }
      }
      return h;
    }
    const fn = UI.CARDS[b.kind];
    if (!fn) return '';
    const entering = !prev || prev.kind !== b.kind;
    return fn(b.card, lt, dur, entering, b, prev && prev.kind === b.kind ? prev.card : null, prev && prev.kind === b.kind ? prev : null);
  }

  function isDark(b) {
    if (b.kind === STORY) return b.scene.light === 'night';
    return ['book', 'statement', 'ask', 'outro'].includes(b.kind);
  }

  // ---------------- frame ----------------
  function renderAt(t) {
    let i = R.findIndex(b => t >= b.start && t < b.end);
    if (i < 0) i = t < 0 ? 0 : R.length - 1;
    const b = R[i], lt = t - b.start, prev = R[i - 1];
    const tr = transition(prev, b), TR = tr === 'iris' ? 0.55 : 0.4;
    let html = '';
    const cur = layer(i, lt, t);
    if (tr !== 'none' && lt < TR) {
      const p = E.inOut(U.clamp(lt / TR));
      const old = layer(i - 1, prev.end - prev.start - 0.001, t);
      html += `<div style="position:absolute;inset:0">${old}</div>`;
      if (tr === 'iris') html += `<div style="position:absolute;inset:0;clip-path:circle(${p * 125}% at 50% 42%)">${cur}</div>`;
      else html += `<div style="position:absolute;inset:0;opacity:${p}">${cur}</div>`;
    } else html += `<div style="position:absolute;inset:0">${cur}</div>`;

    // header + chip
    const dark = isDark(b);
    let chip = null, chipAnim = null;
    if (b.kind === STORY && b.scene.chip) {
      chip = b.scene.chip;
      const pchip = prev && prev.kind === STORY ? prev.scene.chip : null;
      if (pchip !== chip) { const q = U.prog(lt, 0.1, 0.4); chipAnim = { o: U.clamp(q * 2), s: 0.85 + 0.15 * E.back(q), y: (1 - E.out(q)) * -14 }; }
    }
    if (b.kind !== 'outro') html += UI.header(dark, chip, chipAnim);
    // caption
    const noCap = b.kind === 'statement' || b.kind === 'outro' || (b.kind === 'ask' && b.card && b.card.quote);
    if (!noCap) html += UI.caption(b, lt, { dark: b.kind !== STORY && dark, top: b.kind === 'takeaways' ? 1490 : 1450 });
    // title flash (first frame doubles as the Shorts thumbnail)
    const th = SCRIPT.thumbnail;
    if (i === 0 && th && lt < 1.9) {
      const a = 1 - U.prog(lt, 1.25, 0.6);
      html += `<div style="position:absolute;inset:0;opacity:${a};background:linear-gradient(180deg, rgba(18,10,14,.82) 0%, rgba(18,10,14,.55) 45%, rgba(18,10,14,0) 75%)"></div>
        <div style="position:absolute;top:330px;left:50px;right:50px;text-align:center;opacity:${a};transform:scale(${1 + U.prog(lt, 0, 1.9) * 0.04})"><div style="display:inline-block;background:${TH.red};color:#fff;font:700 132px/1.15 ${TH.bn};padding:12px 44px 24px;border-radius:26px;box-shadow:0 18px 0 rgba(0,0,0,.25);transform:rotate(-2deg)">${U.esc(th.text)}</div><div style="margin-top:34px;font:700 64px ${TH.bn};color:#fff;text-shadow:0 4px 18px rgba(0,0,0,.6)">${U.esc(th.sub || '')}</div></div>`;
    }
    // finishing: vignette, grain, screen frame
    html += `<div style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,.22) 100%)"></div>`;
    html += `<div style="position:absolute;inset:0;pointer-events:none;background:url(../assets/brand/grain.png);opacity:.035"></div>`;
    html += `<div style="position:absolute;inset:18px;border:2px solid rgba(255,255,255,.28);border-radius:38px;pointer-events:none"></div>`;
    document.getElementById('stage').innerHTML = html;
  }

  async function init(timeline) {
    TL = timeline; SCRIPT = timeline.script;
    R = resolve(SCRIPT, TL);
    const fams = ['600 40px "Hind Siliguri"', '700 40px "Hind Siliguri"', '500 40px "Hind Siliguri"', '700 40px "Noto Serif Bengali"', '500 40px "Noto Serif Bengali"', '700 40px "Playfair Display"', 'italic 500 40px "Playfair Display"', '600 40px "Playfair Display"'];
    await Promise.all(fams.map(f => document.fonts.load(f, 'অআকখ ABC')));
    await document.fonts.ready;
    const imgs = ['../assets/brand/logo.png', '../assets/brand/grain.png'];
    await Promise.all(imgs.map(src => new Promise(res => { const im = new Image(); im.onload = im.onerror = res; im.src = src; })));
    return { duration: TL.duration, beats: R.map(b => [b.start, b.end]) };
  }

  g.TS = { init, renderAt, resolve };
})(window);
