// The Screen — screen-space UI: widgets, full-screen cards, captions, header, icons
(function (g) {
  const U = g.U;
  const TH = g.THEME = {
    ink: '#1D1A1F', paper: '#F5EEE2', paper2: '#EBE0CC', red: '#C40F1C', red2: '#E5262F', gold: '#E9A23B',
    night: '#121A2C', night2: '#1D2842', teal: '#24615C', mute: '#8A7C68', line: '#E2D5BF',
    bn: "'Hind Siliguri', sans-serif", serif: "'Noto Serif Bengali', 'Tiro Bangla', serif", en: "'Playfair Display', serif",
  };
  const E = U.ease;

  // ---------- icons (line icons, 100x100 box) ----------
  const ICON = {
    chat: '<path d="M18 26 h64 a8 8 0 0 1 8 8 v32 a8 8 0 0 1 -8 8 H46 L28 88 V74 H18 a8 8 0 0 1 -8 -8 V34 a8 8 0 0 1 8 -8 z"/><path d="M30 46 h40 M30 58 h26"/>',
    shield: '<path d="M50 10 L84 24 V48 C84 70 68 84 50 92 C32 84 16 70 16 48 V24 Z"/><path d="M36 50 L64 50"/>',
    wall: '<rect x="10" y="20" width="80" height="64" rx="4"/><path d="M10 41 H90 M10 62 H90 M36 20 V41 M64 20 V41 M24 41 V62 M50 41 V62 M76 41 V62 M36 62 V84 M64 62 V84"/>',
    eye: '<path d="M6 50 C22 24 78 24 94 50 C78 76 22 76 6 50 Z"/><circle cx="50" cy="50" r="14"/>',
    hand: '<path d="M30 54 V24 a6 6 0 0 1 12 0 V48 M42 46 V16 a6 6 0 0 1 12 0 V46 M54 46 V20 a6 6 0 0 1 12 0 V50 M66 50 V32 a6 6 0 0 1 12 0 V62 C78 80 66 92 50 92 C36 92 28 84 22 72 L14 56 a6 6 0 0 1 10 -6 L30 60"/>',
    heart: '<path d="M50 86 C20 64 8 48 8 32 C8 20 18 12 30 12 C40 12 46 18 50 26 C54 18 60 12 70 12 C82 12 92 20 92 32 C92 48 80 64 50 86 Z"/>',
    star: '<path d="M50 8 L62 36 L92 38 L68 58 L76 88 L50 72 L24 88 L32 58 L8 38 L38 36 Z"/>',
    ear: '<path d="M30 40 C30 20 46 10 60 12 C76 14 86 28 84 44 C82 60 66 62 64 76 C62 90 46 94 38 84"/><path d="M48 42 C48 32 58 30 64 36 C70 44 62 50 58 54"/>',
    door: '<rect x="22" y="8" width="56" height="86" rx="3"/><path d="M22 94 H90"/><circle cx="66" cy="54" r="4"/><path d="M44 30 L60 22 V86 L44 90 Z"/>',
    car: '<path d="M10 66 V52 L20 34 C24 28 30 26 36 26 H64 C70 26 76 28 80 34 L90 52 V66 Z"/><circle cx="28" cy="70" r="10"/><circle cx="72" cy="70" r="10"/><path d="M24 50 H76"/>',
    phone: '<rect x="28" y="8" width="44" height="84" rx="8"/><path d="M44 80 H56"/>',
    bank: '<path d="M10 36 L50 12 L90 36 Z"/><path d="M18 42 V76 M38 42 V76 M62 42 V76 M82 42 V76 M10 86 H90"/>',
    bulb: '<path d="M34 64 C24 56 20 46 20 38 C20 22 34 10 50 10 C66 10 80 22 80 38 C80 46 76 56 66 64 V74 H34 Z"/><path d="M38 84 H62 M42 92 H58"/>',
    x: '<path d="M22 22 L78 78 M78 22 L22 78"/>',
    check: '<path d="M16 52 L40 76 L86 26"/>',
    puzzle: '<path d="M14 30 H38 C34 18 50 12 54 24 C56 28 56 30 54 30 H76 V52 C88 48 92 66 80 66 C78 66 76 66 76 64 V86 H14 Z"/>',
    clock: '<circle cx="50" cy="50" r="40"/><path d="M50 26 V50 L66 60"/>',
    film: '<rect x="10" y="20" width="80" height="60" rx="8"/><path d="M42 36 L62 50 L42 64 Z"/>',
    book: '<path d="M50 24 C40 16 24 14 10 16 V82 C24 80 40 82 50 90 C60 82 76 80 90 82 V16 C76 14 60 16 50 24 Z M50 24 V90"/>',
    people: '<circle cx="34" cy="32" r="12"/><circle cx="68" cy="32" r="12"/><path d="M12 84 C12 62 22 54 34 54 C46 54 56 62 56 84 M46 84 C46 62 56 54 68 54 C80 54 90 62 90 84"/>',
    brain: '<path d="M50 18 C42 8 22 12 22 28 C10 32 10 50 20 56 C14 70 28 84 42 78 C46 86 50 86 50 86 V18 Z M50 18 C58 8 78 12 78 28 C90 32 90 50 80 56 C86 70 72 84 58 78 C54 86 50 86 50 86"/>',
  };
  const icon = (name, size = 60, color = TH.ink, sw = 7) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICON[name] || ICON.star}</svg>`;

  const pop = (lt, delay = 0, dur = 0.45) => { const p = U.prog(lt, delay, dur); return { o: U.clamp(p * 2.2), s: 0.86 + 0.14 * E.back(p), y: (1 - E.out(p)) * 26 }; };
  const tf = a => `opacity:${a.o};transform:translateY(${a.y}px) scale(${a.s})`;
  const mark = (m, size = 46) => m === 'x'
    ? `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${TH.red};display:flex;align-items:center;justify-content:center">${icon('x', size * 0.6, '#fff', 14)}</div>`
    : `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${TH.teal};display:flex;align-items:center;justify-content:center">${icon('check', size * 0.62, '#fff', 14)}</div>`;
  const BN_NUM = ['১', '২', '৩', '৪', '৫', '৬'];

  // ---------- header ----------
  function header(dark, chip, chipAnim) {
    // Logo: top-left, transparent PNG, no box behind it (owner rule). A soft shadow keeps it legible on any scene.
    let h = `<img src="../assets/brand/logo.png" style="position:absolute;top:46px;left:44px;height:100px;display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,${dark ? .55 : .28})) drop-shadow(0 0 14px rgba(${dark ? '0,0,0,.35' : '255,255,255,.55'}))">`;
    if (chip) {
      const a = chipAnim || { o: 1, s: 1, y: 0 };
      h += `<div style="position:absolute;top:70px;right:44px;display:flex;justify-content:flex-end"><div style="${tf(a)};transform-origin:right center;background:${dark ? 'rgba(255,255,255,.92)' : '#FFFFFF'};border-radius:30px;padding:6px 24px 8px;font:600 32px ${TH.bn};color:${TH.ink};box-shadow:0 5px 0 rgba(0,0,0,.08);display:flex;align-items:center;gap:12px;max-width:560px;white-space:nowrap"><span style="width:12px;height:12px;border-radius:50%;background:${TH.red}"></span>${U.esc(chip)}</div></div>`;
    }
    return h;
  }

  // ---------- caption ----------
  // words: [{w, s, e}] relative to beat-local time; hl via *..* in text
  function caption(beat, lt, opts = {}) {
    if (!beat.say) return '';
    const dark = opts.dark;
    const tokens = [];
    let hl = false;
    U.plain(beat.say) && beat.say.split(/\s+/).forEach(raw => {
      let w = raw; const st = w.startsWith('*'); if (st) hl = true;
      const en = /\*[^\wঀ-৿]*$/.test(w) || (w.match(/\*/g) || []).length === 2;
      tokens.push({ w: w.replace(/\*/g, ''), hl: hl || st });
      if (en) hl = false;
    });
    const times = beat.words || [];
    const aStart = beat.audioStart || 0;
    let html = '';
    tokens.forEach((tk, i) => {
      const tm = times[i] ? aStart + times[i].s : aStart + (i / Math.max(1, tokens.length)) * (beat.audioDur || 2);
      const p = U.prog(lt, tm - 0.06, 0.22, E.out);
      const col = tk.hl ? (dark ? TH.gold : TH.red) : (dark ? '#F5EEE2' : TH.ink);
      html += `<span style="display:inline-block;opacity:${0.36 + 0.64 * p};transform:translateY(${(1 - p) * 8}px);color:${col};${tk.hl ? 'font-weight:700' : ''}">${U.esc(tk.w)}</span> `;
    });
    const speaker = beat.speakerName;
    const enter = U.prog(lt, 0, 0.3, E.out);
    const bg = dark ? 'rgba(18,26,44,.78)' : 'rgba(255,252,246,.96)';
    const q1 = speaker ? '<span style="color:' + TH.mute + '">“</span>' : '', q2 = speaker ? '<span style="color:' + TH.mute + '">”</span>' : '';
    const tag = speaker ? `<div style="display:inline-flex;align-items:center;gap:10px;background:${TH.red};color:#fff;font:600 28px ${TH.bn};padding:4px 20px 6px;border-radius:20px;margin-bottom:12px"><span style="width:9px;height:9px;border-radius:50%;background:#fff"></span>${U.esc(speaker)}</div><br>` : '';
    const top = opts.top || 1450;
    return `<div style="position:absolute;left:56px;right:56px;top:${top}px;display:flex;justify-content:center;opacity:${enter};transform:translateY(${(1 - enter) * 14}px)">
      <div style="text-align:center">${tag}<div style="display:inline-block;background:${bg};border-radius:28px;padding:26px 40px 30px;box-shadow:0 14px 0 rgba(0,0,0,.10), 0 18px 40px rgba(0,0,0,.12);font:600 52px/1.42 ${TH.bn};max-width:968px">${q1}${html.trim()}${q2}</div></div></div>`;
  }

  // ---------- story widgets (top overlay) ----------
  function widget(w, lt, dur, entering) {
    if (!w) return '';
    const a = entering ? pop(lt, 0.05) : { o: 1, s: 1, y: 0 };
    const box = (inner, width = 900) => `<div style="position:absolute;top:226px;left:0;right:0;display:flex;justify-content:center"><div style="${tf(a)};width:${width}px;background:#FFFCF6;border-radius:30px;box-shadow:0 14px 0 rgba(0,0,0,.10),0 20px 50px rgba(0,0,0,.12);overflow:hidden">${inner}</div></div>`;
    const P = entering ? U.prog(lt, 0.25, Math.min(1.6, Math.max(0.6, dur - 0.8)), E.inOut) : 1;
    switch (w.kind) {
      case 'stats': {
        const n = w.items.length;
        return box(`<div style="display:flex">${w.items.map((it, i) => `<div style="flex:1;text-align:center;padding:22px 6px 18px;${i < n - 1 ? 'border-right:3px dashed ' + TH.line : ''}"><div style="font:600 30px ${TH.bn};color:${TH.mute}">${U.esc(it.label)}</div><div style="font:700 ${n > 2 ? 88 : 96}px/1.12 ${TH.bn};color:${it.red ? TH.red : TH.ink}">${it.from != null ? U.countUp(it.from, it.value, P) : U.esc(it.value)}</div></div>`).join('')}</div>`, n > 2 ? 900 : 760);
      }
      case 'checklist': {
        const n = w.items.length, step = entering ? Math.min(0.55, Math.max(0.25, (dur - 0.7) / n)) : 0;
        return box(`<div style="padding:18px 30px 12px"><div style="font:700 32px ${TH.bn};color:${TH.ink};margin-bottom:6px">${U.esc(w.title || '')}</div>${w.items.map((it, i) => { const q = entering ? pop(lt, 0.3 + i * step, 0.35) : { o: 1, s: 1, y: 0 }; return `<div style="${tf(q)};display:flex;align-items:center;gap:18px;padding:7px 0;border-top:2px solid ${TH.line}">${mark(it.mark, 38)}<div style="font:600 33px ${TH.bn};color:${TH.ink}">${U.esc(it.t)}</div></div>`; }).join('')}</div>`, 820);
      }
      case 'note': {
        const style = w.style || 'paper';
        const bg = { paper: '#FFFCF4', envelope: '#F7EEDC', passbook: '#EAF3EE', notebook: '#FBF3D9', sticky: '#FFE98A' }[style];
        const lines = (w.lines || []).map((l, i) => { const q = entering ? U.prog(lt, 0.35 + i * 0.35, 0.4, E.out) : 1; return `<div style="opacity:${q};transform:translateX(${(1 - q) * -20}px);font:${style === 'envelope' ? '700 92px' : '600 40px'}/1.4 ${style === 'notebook' || style === 'sticky' ? TH.serif : TH.bn};color:${style === 'envelope' ? TH.red : TH.ink};${style === 'notebook' ? 'border-bottom:2px solid #E3CFA0' : ''};${w.strike && i === 0 ? '' : ''}">${U.esc(l)}</div>`; }).join('');
        const strike = w.strike ? `<div style="height:5px;background:${TH.red};margin:-34px 40px 24px;transform:scaleX(${U.prog(lt, 1.0, 0.4, E.out)});transform-origin:left"></div>` : '';
        const sub = w.sub ? `<div style="opacity:${U.prog(lt, 1.2, 0.5)};margin-top:14px;padding:14px 22px;border-radius:16px;background:${TH.red};color:#fff;font:600 34px ${TH.bn}">${U.esc(w.sub)}</div>` : '';
        const envFlap = style === 'envelope' ? `<svg width="100%" height="70" viewBox="0 0 800 70" preserveAspectRatio="none" style="display:block"><path d="M0 0 L400 66 L800 0" fill="#EFE2C8" stroke="#2A211C" stroke-width="4"/></svg>` : '';
        const rot = style === 'sticky' ? 'rotate(-3deg)' : style === 'envelope' ? 'rotate(-2deg)' : '';
        return `<div style="position:absolute;top:226px;left:0;right:0;display:flex;justify-content:center"><div style="${tf(a)};width:800px;background:${bg};border-radius:${style === 'envelope' ? 14 : 24}px;box-shadow:0 14px 0 rgba(0,0,0,.10),0 20px 50px rgba(0,0,0,.14);overflow:hidden;transform-origin:center;${rot ? 'rotate:' + rot.replace('rotate(', '').replace(')', '') : ''}">${envFlap}<div style="padding:26px 40px 30px;text-align:${style === 'envelope' ? 'center' : 'left'}"><div style="font:700 32px ${TH.bn};color:${TH.mute};margin-bottom:10px">${U.esc(w.title || '')}</div>${lines}${strike}${sub}</div></div></div>`;
      }
      case 'chat': {
        const n = w.msgs.length, step = entering ? Math.min(0.9, Math.max(0.4, (dur - 0.6) / n)) : 0;
        return box(`<div style="background:#24615C;color:#fff;padding:18px 30px;font:700 34px ${TH.bn};display:flex;align-items:center;gap:16px"><div style="width:52px;height:52px;border-radius:50%;background:#E9A23B"></div>${U.esc(w.title)}</div><div style="padding:20px 26px 26px;background:#EFE7DA">${w.msgs.map((m, i) => { const q = entering ? pop(lt, 0.3 + i * step, 0.35) : { o: 1, s: 1, y: 0 }; return `<div style="${tf(q)};background:#fff;border-radius:6px 22px 22px 22px;padding:12px 22px 14px;margin:10px 60px 10px 0;box-shadow:0 3px 0 rgba(0,0,0,.06)"><div style="font:700 26px ${TH.bn};color:${TH.red}">${U.esc(m.who)}</div><div style="font:500 36px/1.35 ${TH.bn};color:${TH.ink}">${U.esc(m.t)}</div></div>`; }).join('')}</div>`, 860);
      }
      case 'clock': {
        const [hh, mm] = (w.time || '3:00').split(':').map(Number);
        const ah = ((hh % 12) + mm / 60) * 30, am = mm * 6 + (entering ? (1 - P) * -360 : 0);
        const hand = (an, l, wd, c) => `<line x1="100" y1="100" x2="${100 + Math.sin(an * Math.PI / 180) * l}" y2="${100 - Math.cos(an * Math.PI / 180) * l}" stroke="${c}" stroke-width="${wd}" stroke-linecap="round"/>`;
        return `<div style="position:absolute;top:226px;left:0;right:0;display:flex;justify-content:center"><div style="${tf(a)};display:flex;align-items:center;gap:26px;background:#FFFCF6;border-radius:30px;padding:18px 40px 18px 24px;box-shadow:0 14px 0 rgba(0,0,0,.10)"><svg width="170" height="170" viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" fill="#fff" stroke="${TH.ink}" stroke-width="10"/>${[0, 90, 180, 270].map(x => `<circle cx="${100 + Math.sin(x * Math.PI / 180) * 72}" cy="${100 - Math.cos(x * Math.PI / 180) * 72}" r="6" fill="${TH.ink}"/>`).join('')}${hand(ah, 46, 12, TH.ink)}${hand(am, 66, 8, TH.red)}<circle cx="100" cy="100" r="9" fill="${TH.red}"/></svg><div style="font:700 72px ${TH.bn};color:${TH.ink}">${U.esc(w.label || '')}</div></div></div>`;
      }
      default: return '';
    }
  }

  // ---------- bubble (screen-space, positioned near a head) ----------
  function bubble(text, sx, sy, lt) {
    const a = pop(lt, 0.15, 0.4);
    const left = U.clamp(sx - 60, 40, 640);
    return `<div style="position:absolute;left:${left}px;top:${sy - 150}px;${tf(a)};transform-origin:${sx - left}px 120px"><div style="position:relative;background:#fff;border:5px solid ${TH.ink};border-radius:30px;padding:14px 30px 18px;font:700 40px ${TH.bn};color:${TH.ink};white-space:nowrap;box-shadow:0 8px 0 rgba(0,0,0,.08)">${U.esc(text)}<div style="position:absolute;bottom:-26px;left:${U.clamp(sx - left - 16, 30, 300)}px;width:0;height:0;border-left:16px solid transparent;border-right:16px solid transparent;border-top:24px solid ${TH.ink}"></div></div></div>`;
  }

  // ---------- full-screen cards ----------
  const paperBg = `background:radial-gradient(ellipse at 50% 30%, #FBF6EC 0%, ${TH.paper} 55%, #E9DDC8 100%)`;
  const nightBg = `background:radial-gradient(ellipse at 50% 38%, #24324F 0%, ${TH.night} 62%, #0B111D 100%)`;
  const title = (t, lt, dark, entering) => { const q = entering ? pop(lt, 0, 0.45) : { o: 1, s: 1, y: 0 }; return `<div style="position:absolute;top:290px;left:60px;right:60px;text-align:center;${tf(q)};font:700 76px/1.3 ${TH.bn};color:${dark ? '#F5EEE2' : TH.ink}">${U.rich(t)}</div>`; };

  const CARDS = {};
  CARDS.list = (c, lt, dur, entering) => {
    const n = c.items.length, step = entering ? Math.min(0.75, Math.max(0.35, (dur - 0.8) / n)) : 0;
    let h = `<div style="position:absolute;inset:0;${paperBg}"></div>` + title(c.title, lt, false, entering);
    h += `<div style="position:absolute;top:520px;left:90px;right:90px">` + c.items.map((it, i) => {
      const q = entering ? pop(lt, 0.35 + i * step, 0.4) : { o: 1, s: 1, y: 0 };
      const mk = entering ? U.prog(lt, 0.6 + i * step, 0.3, E.back) : 1;
      return `<div style="${tf(q)};display:flex;align-items:center;justify-content:space-between;background:#FFFCF6;border-radius:28px;padding:34px 40px;margin-bottom:32px;box-shadow:0 12px 0 rgba(0,0,0,.08)"><div><div style="font:600 56px ${TH.bn};color:${TH.ink}">${U.esc(it.t)}</div>${it.tag ? `<div style="font:600 32px ${TH.bn};color:${TH.red};margin-top:4px">${U.esc(it.tag)}</div>` : ''}</div><div style="transform:scale(${mk})">${mark(it.mark, 78)}</div></div>`;
    }).join('') + `</div>`;
    if (c.footer) h += `<div style="position:absolute;top:${560 + n * 196}px;left:0;right:0;text-align:center;opacity:${U.prog(lt, 0.2, 0.4)};font:700 54px ${TH.bn};color:${TH.red}">${U.esc(c.footer)}</div>`;
    return h;
  };
  CARDS.statement = (c, lt) => {
    const q = pop(lt, 0.1, 0.6);
    return `<div style="position:absolute;inset:0;${nightBg}"></div><div style="position:absolute;top:620px;left:70px;right:70px;text-align:center;${tf(q)};font:700 92px/1.35 ${TH.bn};color:#F5EEE2">${U.rich(c.text).replace(/<em>/g, `<em style="font-style:normal;color:${TH.gold}">`)}</div>`;
  };
  CARDS.book = (c, lt, dur, entering, beat) => {
    const src = c.source || {};
    const q = entering ? pop(lt, 0.05, 0.6) : { o: 1, s: 1, y: 0 };
    const sweep = ((lt * 0.35) % 1.4) - 0.2;
    const rv = beat.reveal ? U.prog(lt, 0.2, 0.6, E.out) : 0;
    const coverCol = c.cover || '#7A1018';
    const book = `<div style="position:relative;width:420px;height:600px;margin:0 auto;transform:perspective(1400px) rotateY(-14deg) rotateX(3deg);transform-style:preserve-3d">
      <div style="position:absolute;inset:0;background:linear-gradient(135deg, ${U.shade(coverCol, 0.18)}, ${coverCol} 60%, ${U.shade(coverCol, -0.25)});border-radius:8px 18px 18px 8px;box-shadow:-18px 30px 60px rgba(0,0,0,.45), inset 14px 0 0 rgba(0,0,0,.22);overflow:hidden">
        <div style="position:absolute;top:44px;left:40px;right:30px;bottom:44px;border:3px solid rgba(233,162,59,.65);border-radius:6px"></div>
        <div style="position:absolute;top:120px;left:56px;right:46px;text-align:center;font:700 ${src.book && src.book.length > 22 ? 46 : 54}px/1.12 ${TH.en};color:#F7EBD3;letter-spacing:1px">${U.esc((src.book || '').toUpperCase())}</div>
        <div style="position:absolute;bottom:90px;left:0;right:0;text-align:center;font:600 28px ${TH.en};color:${TH.gold};letter-spacing:4px">${U.esc((src.author || '').toUpperCase())}</div>
        <div style="position:absolute;top:0;bottom:0;left:${sweep * 100}%;width:90px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);transform:skewX(-18deg)"></div>
      </div></div>`;
    let h = `<div style="position:absolute;inset:0;${nightBg}"></div>`;
    h += `<div style="position:absolute;top:250px;left:0;right:0;text-align:center;font:600 40px ${TH.bn};color:${TH.gold};opacity:${q.o}">এই গল্পের পেছনের বই</div>`;
    h += `<div style="position:absolute;top:${360 - rv * 60}px;left:0;right:0;${tf(q)};transform:translateY(${q.y}px) scale(${q.s * (1 - rv * 0.18)})">${book}</div>`;
    if (beat.reveal) {
      h += `<div style="position:absolute;top:900px;left:70px;right:70px;text-align:center;opacity:${rv};transform:translateY(${(1 - rv) * 30}px)">
        <div style="display:inline-flex;align-items:center;gap:18px;font:700 36px ${TH.en};color:${TH.red2};letter-spacing:6px"><span style="width:70px;height:3px;background:${TH.gold}"></span>${U.esc(src.chapter || '')}<span style="width:70px;height:3px;background:${TH.gold}"></span></div>
        <div style="font:500 italic 50px/1.25 ${TH.en};color:#F5EEE2;margin-top:18px">${U.esc(src.title || '')}</div>
        <div style="display:inline-block;margin-top:26px;background:#F5EEE2;color:${TH.ink};border-radius:20px;padding:12px 30px 16px;font:700 42px ${TH.bn}">${U.esc(src.title_bn || '')}</div></div>`;
    }
    return h;
  };
  CARDS.concept = (c, lt, dur, entering, beat, prevCard) => {
    const w = c.widget || {};
    const show = w.show == null ? 99 : w.show;
    const prevShow = prevCard && prevCard.widget && prevCard.widget.type === w.type ? (prevCard.widget.show == null ? 99 : prevCard.widget.show) : -1;
    const ent = i => (i >= prevShow || entering) ? pop(lt, 0.15 + (i - Math.max(0, prevShow)) * 0.45, 0.45) : { o: 1, s: 1, y: 0 };
    let h = `<div style="position:absolute;inset:0;${paperBg}"></div>` + title(c.title, lt, false, entering && prevShow < 0);
    if (w.type === 'flow') {
      const n = w.nodes.length;
      h += `<div style="position:absolute;top:520px;left:60px;right:60px;display:flex;flex-direction:column;align-items:center;gap:0">` + w.nodes.map((nd, i) => {
        if (i >= show) return `<div style="height:${i ? 270 : 190}px"></div>`;
        const q = ent(i);
        const arrow = i ? `<div style="opacity:${q.o};height:80px;display:flex;align-items:center;justify-content:center"><svg width="40" height="60" viewBox="0 0 40 60"><path d="M20 4 V48 M8 36 L20 50 L32 36" stroke="${TH.red}" stroke-width="7" fill="none" stroke-linecap="round"/></svg></div>` : '';
        return `${arrow}<div style="${tf(q)};display:flex;align-items:center;gap:34px;width:760px;background:${i === n - 1 && show >= n && !w.loop ? TH.ink : '#FFFCF6'};border-radius:32px;padding:30px 42px;box-shadow:0 12px 0 rgba(0,0,0,.08)">${icon(nd.icon, 104, i === n - 1 && show >= n && !w.loop ? TH.gold : TH.red)}<div style="font:700 66px ${TH.bn};color:${i === n - 1 && show >= n && !w.loop ? '#F5EEE2' : TH.ink}">${U.esc(nd.t)}</div></div>`;
      }).join('') + `</div>`;
      if (w.loop && show >= n) { const q = pop(lt, 0.6, 0.5); h += `<svg style="position:absolute;top:600px;left:880px;opacity:${q.o}" width="140" height="520" viewBox="0 0 140 520"><path d="M10 480 C120 470 130 60 20 40" fill="none" stroke="${TH.red}" stroke-width="8" stroke-dasharray="18 14" stroke-dashoffset="${-lt * 60}"/><path d="M40 20 L14 40 L42 60" fill="none" stroke="${TH.red}" stroke-width="8" stroke-linecap="round"/></svg>`; }
    } else if (w.type === 'compare') {
      const side = (d, i) => {
        if (i >= show) return `<div style="width:450px"></div>`;
        const q = ent(i);
        return `<div style="${tf(q)};width:450px;background:#FFFCF6;border-radius:36px;padding:56px 28px 48px;text-align:center;box-shadow:0 12px 0 rgba(0,0,0,.08);border:4px solid ${d.bad ? TH.line : TH.teal}"><div style="display:flex;justify-content:center">${icon(d.icon, 160, d.bad ? TH.mute : TH.teal)}</div><div style="font:700 58px/1.25 ${TH.bn};color:${TH.ink};margin-top:18px">${U.esc(d.t)}</div><div style="font:600 40px/1.3 ${TH.bn};color:${TH.mute};margin-top:12px">${U.esc(d.sub || '')}</div><div style="display:flex;justify-content:center;margin-top:30px">${mark(d.bad ? 'x' : 'check', 76)}</div></div>`;
      };
      h += `<div style="position:absolute;top:560px;left:0;right:0;display:flex;justify-content:center;gap:40px">${side(w.left, 0)}${side(w.right, 1)}</div>`;
    } else if (w.type === 'iceberg') {
      const water = 860;
      h += `<div style="position:absolute;left:0;right:0;top:${water}px;bottom:0;background:linear-gradient(180deg,#5DA9C9 0%, #1F5C7E 60%, #143E58 100%)"></div>`;
      h += `<svg style="position:absolute;left:0;top:0" width="1080" height="1920"><path d="M380 ${water} L470 640 L560 600 L640 680 L700 ${water} Z" fill="#FFFFFF" stroke="${TH.ink}" stroke-width="6"/><path d="M380 ${water} L700 ${water} L860 1060 L780 1300 L540 1380 L280 1280 L210 1060 Z" fill="#CFE8F2" opacity="0.85" stroke="${TH.ink}" stroke-width="6"/><path d="M-20 ${water} Q140 ${water - 14 + Math.sin(lt * 2) * 6} 300 ${water} T620 ${water} T940 ${water} T1260 ${water}" fill="none" stroke="#fff" stroke-width="8" opacity="0.7"/></svg>`;
      const items = (arr, top, start, show2, dark) => `<div style="position:absolute;top:${top}px;left:0;right:0;display:flex;justify-content:center;gap:24px;flex-wrap:wrap">` + arr.map((it, i) => { const q = show2 ? pop(lt, start + i * 0.3, 0.4) : { o: 0, s: 1, y: 0 }; return `<div style="${tf(q)};display:flex;align-items:center;gap:14px;background:${dark ? 'rgba(255,255,255,.95)' : '#FFFCF6'};border-radius:22px;padding:14px 26px;box-shadow:0 8px 0 rgba(0,0,0,.12)">${icon(it.icon, 54, dark ? TH.teal : TH.red)}<div style="font:700 42px ${TH.bn};color:${TH.ink}">${U.esc(it.t)}</div></div>`; }).join('') + `</div>`;
      h += items(w.top, 470, prevShow >= 1 ? -9 : 0.2, show >= 1, false);
      h += items(w.bottom, 1010, prevShow >= 2 ? -9 : 0.25, show >= 2, true);
      h += `<div style="position:absolute;top:${water - 70}px;left:60px;font:600 30px ${TH.bn};color:${TH.mute}">যা দেখা যায়</div><div style="position:absolute;top:${water + 24}px;left:60px;font:600 30px ${TH.bn};color:#CFE8F2">যা দেখা যায় না</div>`;
    } else if (w.type === 'puzzle') {
      const piece = (t, col, q, rot) => `<div style="${tf(q)};rotate:${rot}deg;background:${col};color:#fff;border-radius:22px;padding:18px 28px;font:700 40px ${TH.bn};box-shadow:0 8px 0 rgba(0,0,0,.12)">${U.esc(t)}</div>`;
      h += `<div style="position:absolute;top:460px;left:0;right:0;display:flex;justify-content:center;gap:18px;flex-wrap:wrap;padding:0 60px">` + w.known.map((k, i) => piece(k, TH.ink, prevShow >= 1 ? { o: 1, s: 1, y: 0 } : pop(lt, 0.2 + i * 0.25, 0.4), (i - 1) * 3)).join('') + `</div>`;
      const vq = prevShow >= 1 ? { o: 1, s: 1, y: 0 } : pop(lt, 1.0, 0.5);
      const crossed = show >= 2 ? U.prog(lt, 0.9, 0.4, E.out) : 0;
      h += `<div style="position:absolute;top:640px;left:0;right:0;text-align:center;${tf(vq)}"><svg width="40" height="70" viewBox="0 0 40 70"><path d="M20 4 V56 M8 44 L20 58 L32 44" stroke="${TH.red}" stroke-width="7" fill="none" stroke-linecap="round"/></svg><div style="position:relative;display:inline-block;margin-top:8px;background:#FFFCF6;border:5px dashed ${TH.red};border-radius:26px;padding:20px 40px;font:700 64px ${TH.bn};color:${TH.red}">${U.esc(w.verdict)}<div style="position:absolute;left:20px;right:20px;top:50%;height:7px;background:${TH.ink};transform:scaleX(${crossed});transform-origin:left"></div></div></div>`;
      if (show >= 2) {
        h += `<div style="position:absolute;top:1000px;left:0;right:0;text-align:center;font:600 38px ${TH.bn};color:${TH.mute};opacity:${U.prog(lt, 0.1, 0.3)}">যে টুকরোগুলো চোখে পড়েনি</div><div style="position:absolute;top:1070px;left:0;right:0;display:flex;justify-content:center;gap:18px;flex-wrap:wrap;padding:0 60px">` + w.missing.map((k, i) => piece(k, TH.teal, pop(lt, 0.25 + i * 0.25, 0.4), (1 - i) * 3)).join('') + `</div>`;
      }
    } else if (w.type === 'scale') {
      const tilt = U.lerp(0, w.tilt || -14, U.prog(lt, 0.4, 0.8, E.out));
      h += `<svg style="position:absolute;left:140px;top:520px" width="800" height="600" viewBox="0 0 800 600"><path d="M400 120 V520 M300 540 H500" stroke="${TH.ink}" stroke-width="16" stroke-linecap="round"/><g transform="rotate(${tilt} 400 120)"><path d="M120 120 H680" stroke="${TH.ink}" stroke-width="12" stroke-linecap="round"/><path d="M120 120 L60 300 H180 Z M680 120 L620 300 H740 Z" fill="none" stroke="${TH.ink}" stroke-width="5"/><ellipse cx="120" cy="300" rx="90" ry="20" fill="${TH.mute}"/><ellipse cx="680" cy="300" rx="90" ry="20" fill="${TH.teal}"/></g></svg>` +
        `<div style="position:absolute;top:880px;left:120px;font:700 44px ${TH.bn}">${U.esc((w.left || {}).t || '')}</div><div style="position:absolute;top:880px;right:120px;font:700 44px ${TH.bn};color:${TH.teal}">${U.esc((w.right || {}).t || '')}</div>`;
    }
    return h;
  };
  CARDS.takeaways = (c, lt, dur, entering, beat, prevCard, prevBeat) => {
    const show = beat.show || 0;
    const prevShow = prevBeat && prevBeat.kind === 'takeaways' ? (prevBeat.show || 0) : -1;
    let h = `<div style="position:absolute;inset:0;${paperBg}"></div>`;
    const hq = prevShow < 0 ? pop(lt, 0, 0.5) : { o: 1, s: 1, y: 0 };
    h += `<div style="position:absolute;top:290px;left:0;right:0;text-align:center;${tf(hq)}"><div style="display:inline-flex;align-items:center;gap:16px;background:${TH.ink};color:#F5EEE2;border-radius:40px;padding:12px 34px 16px;font:600 44px ${TH.bn}">${icon('film', 52, TH.gold, 8)}পর্দার বাইরে, তোমার জীবনে</div></div>`;
    h += `<div style="position:absolute;top:460px;left:60px;right:60px">` + (c.items || []).map((it, i) => {
      if (i >= show) return '';
      const isNew = i === show - 1 && show > prevShow;
      const q = isNew ? pop(lt, 0.1, 0.45) : { o: 1, s: 1, y: 0 };
      const active = i === show - 1;
      const dim = active ? 1 : 0.55;
      return `<div style="${tf(q)};opacity:${q.o * dim};display:flex;align-items:center;gap:26px;background:#FFFCF6;border-radius:30px;padding:34px 32px;margin-bottom:30px;box-shadow:0 ${active ? 14 : 6}px 0 rgba(0,0,0,.09);border-left:14px solid ${active ? TH.red : TH.line}">
        <div style="flex:none;width:74px;height:74px;border-radius:50%;background:${active ? TH.red : TH.mute};color:#fff;display:flex;align-items:center;justify-content:center;font:700 44px ${TH.bn}">${BN_NUM[i]}</div>
        <div style="flex:1"><div style="font:700 50px/1.25 ${TH.bn};color:${TH.ink}">${U.esc(it.t)}</div><div style="font:500 36px/1.3 ${TH.bn};color:${TH.mute};margin-top:6px">${U.esc(it.sub || '')}</div></div>
        <div style="flex:none">${icon(it.icon || 'star', 62, active ? TH.red : TH.mute)}</div></div>`;
    }).join('') + `</div>`;
    return h;
  };
  CARDS.ask = (c, lt, dur, entering, beat, prevCard, prevBeat) => {
    const cont = prevBeat && prevBeat.kind === 'ask';
    let h = `<div style="position:absolute;inset:0;${nightBg}"></div>`;
    // turning screen icon
    const turn = cont ? 1 : U.prog(lt, 0.1, 1.0, E.inOut);
    const sx = Math.cos((1 - turn) * Math.PI * 0.9);
    h += `<div style="position:absolute;top:260px;left:0;right:0;display:flex;justify-content:center"><div style="transform:scaleX(${Math.max(0.08, Math.abs(sx))});width:300px;height:190px;border:10px solid #F5EEE2;border-radius:26px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 80px rgba(233,162,59,${0.25 * turn})"><div style="width:160px;height:110px;border-radius:12px;background:radial-gradient(circle at 50% 40%, ${TH.gold}, ${TH.red})"></div></div></div>`;
    h += `<div style="position:absolute;top:510px;left:70px;right:70px;text-align:center;font:600 50px/1.4 ${TH.bn};color:#E8DFD0;opacity:${cont ? 1 : U.prog(lt, 0.3, 0.5)}">এবার পর্দাটা তোমার দিকে…</div>`;
    if (c.quote) {
      const q = pop(lt, 0.15, 0.6);
      h += `<div style="position:absolute;top:720px;left:70px;right:70px;${tf(q)};background:linear-gradient(160deg,#5A0F18,#3A0A10);border:3px solid rgba(233,162,59,.5);border-radius:34px;padding:56px 44px 60px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.4);font:700 66px/1.42 ${TH.serif};color:#F5EEE2">${U.rich(c.quote).replace(/<em>/g, `<em style="font-style:normal;color:${TH.gold}">`)}</div>`;
    }
    return h;
  };
  CARDS.outro = (c, lt) => {
    let h = `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%, #3A0D14 0%, #1A0A0E 60%, #0B0507 100%)"></div>`;
    const q1 = pop(lt, 0.1, 0.6), q2 = pop(lt, 1.1, 0.7);
    h += `<div style="position:absolute;top:470px;left:70px;right:70px;text-align:center;${tf(q1)};font:600 62px/1.45 ${TH.serif};color:#E8DFD0">${U.rich(c.line1)}</div>`;
    h += `<div style="position:absolute;top:${640 + (c.line1.length > 26 ? 70 : 0)}px;left:70px;right:70px;text-align:center;${tf(q2)};font:700 84px/1.35 ${TH.serif};color:${TH.gold}">${U.rich(c.line2)}</div>`;
    const lq = pop(lt, Math.max(2.2, 0.0), 0.7);
    h += `<div style="position:absolute;top:1230px;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:22px;${tf(lq)}"><div style="width:120px;height:3px;background:rgba(233,162,59,.6)"></div><img src="../assets/brand/logo.png" style="height:150px;filter:drop-shadow(0 6px 30px rgba(196,15,28,.45))"><div style="font:600 36px ${TH.bn};color:#E8DFD0;letter-spacing:2px">গল্পে দেখি জীবন</div><div style="margin-top:10px;display:inline-flex;align-items:center;gap:14px;border:3px solid ${TH.gold};border-radius:40px;padding:10px 34px 14px;font:700 38px ${TH.bn};color:#F5EEE2">এমন আরও গল্পের জন্য ফলো করো ▸</div></div>`;
    return h;
  };

  g.UI = { header, caption, widget, bubble, CARDS, icon, TH };
})(window);
