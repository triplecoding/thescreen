// The Screen — scene backgrounds. World = 1080 x 1920, floor line at y = 1440.
// SETS[name](light, props, t, k) -> { back: svg (behind characters), front: svg (in front), seat: 'chair'|'none' }
(function (g) {
  const U = g.U;
  const OL = '#2A211C';
  const FLOOR = 1440;
  const SW = `stroke="${OL}" stroke-width="5" stroke-linejoin="round"`;
  const has = (props, p) => (props || []).includes(p);

  const PAL = {
    day: { wallT: '#EEDFC4', wallB: '#E3CDA8', floor: '#C59D74', floor2: '#B88F66', skyT: '#9ED0EE', skyB: '#DDF0F8', glow: 0 },
    evening: { wallT: '#EBC79D', wallB: '#D9A878', floor: '#B98858', floor2: '#A9784A', skyT: '#F2995C', skyB: '#F9D79A', glow: 0.35 },
    night: { wallT: '#4E4A6B', wallB: '#3B3856', floor: '#3E3A52', floor2: '#35314A', skyT: '#141B33', skyB: '#2B3460', glow: 0.8 },
  };
  const pal = l => PAL[l] || PAL.day;

  function grad(id, top, bot) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient>`;
  }
  function radial(id, c, a) {
    return `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${a}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  }
  function floor(P, k, tiles = true) {
    let s = `<rect x="-200" y="${FLOOR}" width="1480" height="700" fill="${P.floor}"/>`;
    if (tiles) {
      for (let i = -6; i <= 14; i++) s += `<path d="M${540 + (i - 4) * 70} ${FLOOR} L${540 + (i - 4) * 210} 2000" stroke="${P.floor2}" stroke-width="4"/>`;
      [1490, 1560, 1660, 1800].forEach(y => { s += `<path d="M-200 ${y} H1280" stroke="${P.floor2}" stroke-width="4"/>`; });
    }
    s += `<rect x="-200" y="${FLOOR - 34}" width="1480" height="34" fill="${U.shade(P.wallB, -0.25)}"/><path d="M-200 ${FLOOR} H1280" stroke="${OL}" stroke-width="5"/>`;
    return s;
  }
  function sky(P, light, k, x, y, w, h, t) {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sky${k})"/>`;
    if (light === 'night') {
      s += `<circle cx="${x + w * 0.72}" cy="${y + h * 0.22}" r="34" fill="#F4EBC8"/><circle cx="${x + w * 0.72 + 14}" cy="${y + h * 0.22 - 8}" r="30" fill="${P.skyT}"/>`;
      for (let i = 0; i < 14; i++) { const sx = x + U.rand('st' + k, i) * w, sy = y + U.rand('sy', i) * h * 0.5; s += `<circle cx="${sx}" cy="${sy}" r="${1.5 + (i % 3)}" fill="#FFF" opacity="${0.4 + 0.5 * Math.abs(Math.sin(t * 2 + i))}"/>`; }
    } else if (light === 'evening') {
      s += `<circle cx="${x + w * 0.3}" cy="${y + h * 0.62}" r="60" fill="#FFE0A0" opacity="0.9"/>`;
    } else {
      const cx = ((t * 8) % (w + 300)) - 150;
      s += `<g fill="#FFFFFF" opacity="0.85"><ellipse cx="${x + cx}" cy="${y + h * 0.25}" rx="70" ry="22"/><ellipse cx="${x + cx + 40}" cy="${y + h * 0.22}" rx="44" ry="26"/></g>`;
    }
    // building silhouettes
    const bcol = light === 'night' ? '#222A4A' : light === 'evening' ? '#B9705A' : '#A9BCCB';
    let bx = x - 10;
    for (let i = 0; bx < x + w; i++) {
      const bw = 70 + U.rand('bw' + k, i) * 90, bh = h * (0.28 + U.rand('bh' + k, i) * 0.35);
      s += `<rect x="${bx}" y="${y + h - bh}" width="${bw}" height="${bh}" fill="${bcol}"/>`;
      for (let wy = y + h - bh + 18; wy < y + h - 10; wy += 34) for (let wx = bx + 12; wx < bx + bw - 14; wx += 26) {
        const lit = light === 'night' ? U.rand('lw', wx * 7 + wy) > 0.45 : false;
        s += `<rect x="${wx}" y="${wy}" width="12" height="16" fill="${lit ? '#FFD27A' : (light === 'night' ? '#2E375C' : U.shade(bcol, 0.2))}"/>`;
      }
      bx += bw + 6;
    }
    return s;
  }
  function windowFrame(P, light, k, x, y, w, h, t, curtain = '#7A2E3A') {
    let s = `<defs>${grad('sky' + k, P.skyT, P.skyB)}</defs>`;
    s += `<rect x="${x - 18}" y="${y - 18}" width="${w + 36}" height="${h + 36}" rx="6" fill="#F4EEE2" ${SW}/>`;
    s += `<clipPath id="wc${k}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath><g clip-path="url(#wc${k})">${sky(P, light, k, x, y, w, h, t)}</g>`;
    // grille
    s += `<g stroke="#2F5D50" stroke-width="7" fill="none">`;
    for (let i = 1; i < 4; i++) s += `<path d="M${x + (w * i) / 4} ${y} V${y + h}"/>`;
    for (let i = 1; i < 5; i++) s += `<path d="M${x} ${y + (h * i) / 5} H${x + w}"/>`;
    s += `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${w / 6}"/></g>`;
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${SW}/>`;
    // curtains
    const sway = Math.sin(t * 0.8) * 6;
    s += `<path d="M${x - 40} ${y - 40} L${x + 60} ${y - 40} Q${x + 40 + sway} ${y + h / 2} ${x + 70} ${y + h + 40} L${x - 40} ${y + h + 40} Z" fill="${curtain}" ${SW}/>`;
    s += `<path d="M${x + w + 40} ${y - 40} L${x + w - 60} ${y - 40} Q${x + w - 40 - sway} ${y + h / 2} ${x + w - 70} ${y + h + 40} L${x + w + 40} ${y + h + 40} Z" fill="${curtain}" ${SW}/>`;
    s += `<path d="M${x - 10} ${y - 40} q10 ${h / 2} 40 ${h + 60} M${x + w + 10} ${y - 40} q-10 ${h / 2} -40 ${h + 60}" stroke="${U.shade(curtain, -0.25)}" stroke-width="5" fill="none"/>`;
    s += `<rect x="${x - 70}" y="${y - 58}" width="${w + 140}" height="20" rx="10" fill="#6B4326" ${SW}/>`;
    return s;
  }
  function clock(x, y, t, r = 46) {
    const a1 = t * 6, a2 = t * 0.5 + 300;
    const hand = (a, l, w) => `<path d="M${x} ${y} L${x + Math.sin(a * Math.PI / 180) * l} ${y - Math.cos(a * Math.PI / 180) * l}" stroke="${OL}" stroke-width="${w}" stroke-linecap="round"/>`;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#FBF8F1" ${SW}/>` + [0, 90, 180, 270].map(a => `<circle cx="${x + Math.sin(a * Math.PI / 180) * (r - 12)}" cy="${y - Math.cos(a * Math.PI / 180) * (r - 12)}" r="4" fill="${OL}"/>`).join('') + hand(a2, r * 0.5, 7) + hand(a1, r * 0.75, 5) + `<circle cx="${x}" cy="${y}" r="6" fill="#C4473A"/>`;
  }
  function frame(x, y, w, h, inner = '#9DB8A8') {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#8A5A36" ${SW}/><rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="${h - 28}" fill="${inner}" stroke="${OL}" stroke-width="3"/><path d="M${x + 14} ${y + h - 30} l${w * 0.3} -${h * 0.35} l${w * 0.2} ${h * 0.2} l${w * 0.2} -${h * 0.25} L${x + w - 14} ${y + h - 30} Z" fill="${U.shade(inner, -0.25)}"/>`;
  }
  function lampGlow(k, x, y, r, a) { return `<defs>${radial('lg' + k + x, '#FFD58A', a)}</defs><circle cx="${x}" cy="${y}" r="${r}" fill="url(#lg${k}${x})"/>`; }
  function plant(x, y, s = 1) {
    return `<g transform="translate(${x},${y}) scale(${s})"><path d="M0 -40 Q-60 -120 -40 -180 M0 -40 Q10 -150 40 -200 M0 -40 Q50 -100 80 -130" stroke="#2E6B45" stroke-width="10" fill="none" stroke-linecap="round"/>` +
      [[-40, -180], [40, -200], [80, -130], [-20, -120], [30, -110]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="26" ry="14" transform="rotate(${a} ${a} ${b})" fill="#3E8E5A" ${SW}/>`).join('') +
      `<path d="M-50 -46 L50 -46 L38 40 L-38 40 Z" fill="#C4673A" ${SW}/></g>`;
  }

  const SETS = {};

  // ---------------- HOME ----------------
  SETS.home = (light, props, t, k) => {
    const P = pal(light);
    let b = `<defs>${grad('wall' + k, P.wallT, P.wallB)}</defs><rect x="-200" y="-200" width="1480" height="1700" fill="url(#wall${k})"/>`;
    // subtle wall texture stripes
    b += `<g opacity="0.05">${Array.from({ length: 16 }, (_, i) => `<rect x="${-200 + i * 100}" y="0" width="50" height="1440" fill="#000"/>`).join('')}</g>`;
    if (has(props, 'window') || !props || !props.length) b += windowFrame(P, light, k, 600, 380, 300, 470, t);
    if (has(props, 'almirah')) {
      b += `<g><rect x="90" y="560" width="300" height="880" rx="10" fill="#7E93A3" ${SW}/><path d="M240 570 V1430" stroke="${OL}" stroke-width="5"/><rect x="200" y="940" width="14" height="70" rx="5" fill="#D6DEE4" ${SW}/><rect x="266" y="940" width="14" height="70" rx="5" fill="#D6DEE4" ${SW}/><rect x="104" y="574" width="120" height="840" fill="#FFF" opacity="0.08"/></g>`;
    } else {
      b += frame(150, 470, 170, 200);
    }
    if (!has(props, 'almirah') && !has(props, 'door_closed')) b += clock(470, 470, t);
    if (has(props, 'door_closed')) b += `<g><rect x="80" y="520" width="300" height="920" rx="6" fill="#8A5A36" ${SW}/><rect x="112" y="560" width="236" height="380" rx="6" fill="none" stroke="#6B4326" stroke-width="6"/><rect x="112" y="980" width="236" height="400" rx="6" fill="none" stroke="#6B4326" stroke-width="6"/><circle cx="344" cy="990" r="14" fill="#E8C66A" ${SW}/>${(() => { const n = (props || []).find(x => typeof x === 'string' && x.startsWith('door:')); return n ? `<rect x="150" y="700" width="160" height="50" rx="8" fill="#E7B6C8" ${SW}/><text x="230" y="736" text-anchor="middle" font-family="Hind Siliguri" font-weight="700" font-size="28" fill="${OL}">${U.esc(n.slice(5))}</text>` : ''; })()}</g>`;
    if (light !== 'day') b += lampGlow(k, 900, 980, 520, light === 'night' ? 0.55 : 0.3);
    b += floor(P, k);
    if (has(props, 'sofa')) b += `<g><rect x="80" y="1010" width="920" height="210" rx="40" fill="#5C6E8C" ${SW}/><rect x="60" y="1150" width="960" height="130" rx="30" fill="#6E81A0" ${SW}/><rect x="40" y="1080" width="90" height="230" rx="30" fill="#5C6E8C" ${SW}/><rect x="950" y="1080" width="90" height="230" rx="30" fill="#5C6E8C" ${SW}/><rect x="90" y="1290" width="20" height="150" fill="#3A2C25"/><rect x="970" y="1290" width="20" height="150" fill="#3A2C25"/><rect x="230" y="1050" width="140" height="100" rx="24" fill="#E8A33D" ${SW}/></g>`;
    if (has(props, 'bed')) b += `<g><rect x="40" y="900" width="60" height="540" rx="10" fill="#6B4326" ${SW}/><rect x="60" y="1150" width="980" height="130" rx="12" fill="#8A5A36" ${SW}/><rect x="70" y="1100" width="960" height="80" rx="20" fill="#F2E9DA" ${SW}/><rect x="100" y="1040" width="210" height="80" rx="30" fill="#FFFFFF" ${SW}/><path d="M400 1110 Q600 1150 1020 1110 L1020 1180 L400 1180 Z" fill="#B7464F" ${SW}/><rect x="80" y="1280" width="20" height="160" fill="#3A2C25"/><rect x="1000" y="1280" width="20" height="160" fill="#3A2C25"/></g>`;
    if (has(props, 'table')) b += `<g><rect x="300" y="1150" width="480" height="40" rx="8" fill="#8A5A36" ${SW}/><rect x="330" y="1190" width="26" height="250" fill="#6B4326" ${SW}/><rect x="724" y="1190" width="26" height="250" fill="#6B4326" ${SW}/><ellipse cx="460" cy="1146" rx="60" ry="14" fill="#FFF" ${SW}/><ellipse cx="460" cy="1138" rx="34" ry="10" fill="#F2E6C8"/><ellipse cx="640" cy="1146" rx="60" ry="14" fill="#FFF" ${SW}/><rect x="540" y="1090" width="30" height="58" rx="6" fill="#BFE3F2" opacity="0.9" ${SW}/></g>`;
    const seat = has(props, 'sofa') || has(props, 'bed') ? 'none' : 'chair';
    return { back: b, front: '', seat, floor: FLOOR };
  };

  // ---------------- SHOP ----------------
  const signOf = (props, dflt) => { const p = (props || []).find(x => typeof x === 'string' && x.startsWith('sign:')); return p ? p.slice(5) : dflt; };
  SETS.shop = (light, props, t, k) => {
    const P = light === 'night' ? pal('night') : { ...pal(light), wallT: '#E9DCC6', wallB: '#DCCBB0' };
    let b = `<defs>${grad('wall' + k, P.wallT, P.wallB)}</defs><rect x="-200" y="-200" width="1480" height="1700" fill="url(#wall${k})"/>`;
    // signboard
    b += `<g><rect x="150" y="300" width="780" height="110" rx="12" fill="#24615C" ${SW}/><rect x="166" y="316" width="748" height="78" rx="8" fill="none" stroke="#E8A33D" stroke-width="4"/><text x="540" y="374" text-anchor="middle" font-family="Hind Siliguri" font-weight="700" font-size="54" fill="#F4EDE1">${U.esc(signOf(props, 'মা-বাবা স্টোর'))}</text></g>`;
    // shelves
    b += `<rect x="50" y="460" width="980" height="760" rx="10" fill="#7A4C2C" ${SW}/><rect x="70" y="480" width="940" height="720" fill="#5E3A22"/>`;
    [690, 930].forEach(y => { b += `<rect x="62" y="${y}" width="956" height="24" fill="#8A5A36" ${SW}/>`; });
    const prod = (x, y, i) => {
      const c = ['#E8A33D', '#C4473A', '#2F7D6D', '#F4EDE1', '#4A6FA5', '#E7B6C8', '#9BC26B'][i % 7];
      const kind = i % 4;
      if (kind === 0) return `<rect x="${x}" y="${y - 130}" width="58" height="130" rx="10" fill="${c}" ${SW}/><rect x="${x + 8}" y="${y - 90}" width="42" height="34" fill="#FFF" opacity="0.7"/>`;
      if (kind === 1) return `<path d="M${x} ${y} L${x + 6} ${y - 100} Q${x + 30} ${y - 120} ${x + 54} ${y - 100} L${x + 60} ${y} Z" fill="${c}" ${SW}/>`;
      if (kind === 2) return `<rect x="${x}" y="${y - 90}" width="80" height="90" rx="6" fill="${c}" ${SW}/><path d="M${x + 10} ${y - 60} h60" stroke="#FFF" stroke-width="8" opacity="0.6"/>`;
      return `<rect x="${x + 8}" y="${y - 120}" width="40" height="120" rx="14" fill="${c}" ${SW}/><rect x="${x + 18}" y="${y - 140}" width="20" height="22" fill="${OL}"/>`;
    };
    let i = 0;
    [686, 926].forEach(y => { for (let x = 90; x < 980; x += 92) b += prod(x, y, i++); });
    // rice sacks on the lowest shelf
    for (let x = 90; x < 1000; x += 150) b += `<path d="M${x} 1200 Q${x - 6} 1060 ${x + 20} 1010 Q${x + 65} 990 ${x + 110} 1010 Q${x + 136} 1060 ${x + 130} 1200 Z" fill="#E3D2AE" ${SW}/><path d="M${x + 20} 1080 h90" stroke="#C4473A" stroke-width="10"/>`;
    if (has(props, 'signboard_new')) {
      const p = U.ease.back(U.clamp(t / 0.6));
      b += `<g transform="translate(540,450) scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * -6})" opacity="${U.clamp(t / 0.3)}"><rect x="-300" y="-36" width="600" height="76" rx="38" fill="#E8A33D" ${SW}/><text x="0" y="16" text-anchor="middle" font-family="Hind Siliguri" font-weight="700" font-size="42" fill="${OL}">📞 ফোনে অর্ডার নেওয়া হয়</text></g>`;
    }
    if (light === 'night') {
      b += `<g><rect x="-20" y="200" width="1120" height="120" fill="#7D8794" ${SW}/>${Array.from({ length: 6 }, (_, j) => `<path d="M-20 ${214 + j * 18} H1100" stroke="#5F6875" stroke-width="5"/>`).join('')}</g>`;
      b += `<path d="M540 320 V420" stroke="${OL}" stroke-width="4"/><circle cx="540" cy="440" r="22" fill="#FFE7A8" ${SW}/>` + lampGlow(k, 540, 460, 620, 0.55);
    }
    b += floor(P, k, false);
    // counter (front left)
    let f = '';
    f += `<g><rect x="-20" y="1210" width="470" height="36" rx="6" fill="#A9784A" ${SW}/><rect x="0" y="1246" width="430" height="200" fill="#8A5A36" ${SW}/><path d="M0 1310 H430 M0 1380 H430" stroke="#6B4326" stroke-width="5"/>`;
    f += `<g><rect x="40" y="1110" width="70" height="100" rx="14" fill="#DDEFF2" opacity="0.85" ${SW}/><circle cx="62" cy="1170" r="10" fill="#C4473A"/><circle cx="86" cy="1180" r="10" fill="#E8A33D"/><circle cx="72" cy="1150" r="10" fill="#2F7D6D"/></g>`;
    if (has(props, 'cashbox')) f += `<g><rect x="150" y="1140" width="190" height="72" rx="10" fill="#2F7D6D" ${SW}/><rect x="216" y="1166" width="58" height="12" rx="6" fill="${OL}"/><path d="M150 1160 H340" stroke="#24615C" stroke-width="4"/></g>`;
    const env = has(props, 'envelopes') ? 6 : has(props, 'envelope') ? 1 : 0;
    for (let j = 0; j < env; j++) {
      const ap = U.clamp((t - j * 0.18) / 0.3);
      f += `<g transform="translate(${190 + j * 6},${1128 - j * 9 - (1 - ap) * 40}) rotate(${-6 + j * 2.5})" opacity="${ap}"><rect x="-40" y="-26" width="80" height="50" rx="4" fill="#F7EEDC" ${SW}/><path d="M-40 -26 L0 4 L40 -26" fill="none" stroke="${OL}" stroke-width="4"/></g>`;
    }
    f += `</g>`;
    return { back: b, front: f, seat: 'chair', floor: FLOOR };
  };

  // ---------------- KITCHEN ----------------
  SETS.kitchen = (light, props, t, k) => {
    const P = pal(light);
    let b = `<rect x="-200" y="-200" width="1480" height="1700" fill="${light === 'night' ? '#4D5266' : '#EDE6D8'}"/>`;
    // tiles
    for (let y = 560; y < 1120; y += 70) for (let x = -20; x < 1100; x += 70) b += `<rect x="${x}" y="${y}" width="66" height="66" fill="${y === 840 ? '#5FA8A0' : (light === 'night' ? '#5C6178' : '#FAF7F0')}" stroke="${light === 'night' ? '#464A5E' : '#DCD3C3'}" stroke-width="3"/>`;
    b += windowFrame(P, light, k, 150, 240, 280, 260, t, '#2F7D6D');
    // shelf + jars
    b += `<rect x="560" y="420" width="440" height="22" fill="#8A5A36" ${SW}/>`;
    ['#C4473A', '#E8A33D', '#9BC26B', '#7A3B5E', '#E3D2AE'].forEach((c, i) => { b += `<rect x="${580 + i * 82}" y="330" width="62" height="90" rx="12" fill="#F4EEE2" ${SW}/><rect x="${588 + i * 82}" y="360" width="46" height="52" rx="6" fill="${c}"/><rect x="${580 + i * 82}" y="318" width="62" height="18" rx="6" fill="#8A5A36" ${SW}/>`; });
    // hanging utensils
    b += `<path d="M600 470 H980" stroke="${OL}" stroke-width="6"/>` + [640, 740, 860].map((x, i) => `<path d="M${x} 470 v30" stroke="${OL}" stroke-width="4"/><circle cx="${x}" cy="${540 + i * 6}" r="${36 - i * 4}" fill="#B9C2CB" ${SW}/>`).join('');
    // counter slab
    b += `<rect x="-20" y="1110" width="1120" height="40" fill="#5E6670" ${SW}/><rect x="0" y="1150" width="1080" height="290" fill="#A9784A" ${SW}/>` + [180, 540, 900].map(x => `<rect x="${x - 150}" y="1180" width="300" height="230" rx="8" fill="none" stroke="#8A5A36" stroke-width="6"/><circle cx="${x + 110}" cy="1290" r="9" fill="#E8C66A" ${SW}/>`).join('');
    if (has(props, 'stove') || has(props, 'pot')) {
      b += `<rect x="600" y="1060" width="320" height="52" rx="10" fill="#2E3440" ${SW}/><ellipse cx="680" cy="1062" rx="46" ry="10" fill="#3B4252"/><ellipse cx="840" cy="1062" rx="46" ry="10" fill="#3B4252"/>`;
      b += `<g opacity="${0.6 + 0.4 * Math.sin(t * 12)}"><path d="M650 1060 q8 -14 14 0 q8 -16 16 0 q8 -14 14 0" fill="#5DA9F2"/></g>`;
    }
    if (has(props, 'pot')) {
      b += `<path d="M610 960 L750 960 L740 1056 Q680 1068 620 1056 Z" fill="#9AA4AE" ${SW}/><rect x="596" y="946" width="168" height="20" rx="8" fill="#7E8892" ${SW}/>`;
      for (let i = 0; i < 3; i++) { const ph = (t * 0.6 + i / 3) % 1; b += `<path d="M${650 + i * 30} ${930 - ph * 160} q-20 -30 0 -60 q20 -30 0 -60" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" opacity="${(1 - ph) * 0.6}"/>`; }
    }
    b += floor(P, k);
    return { back: b, front: '', seat: 'chair', floor: FLOOR };
  };

  // ---------------- STREET ----------------
  SETS.street = (light, props, t, k) => {
    const P = pal(light);
    let b = `<defs>${grad('sky' + k, P.skyT, P.skyB)}</defs>` + sky(P, light, k + 'a', -200, -200, 1480, 1000, t);
    // foreground buildings (Dhaka look)
    const bl = [[-60, 380, 360, '#D9B98E'], [300, 300, 300, '#C9D3C6'], [600, 420, 330, '#E3A986'], [930, 340, 260, '#BFC8D6']];
    bl.forEach(([x, y, w, c], i) => {
      const cc = light === 'night' ? U.shade(c, -0.6) : light === 'evening' ? U.mix(c, '#E07A4E', 0.25) : c;
      b += `<rect x="${x}" y="${y}" width="${w}" height="${1300 - y}" fill="${cc}" ${SW}/>`;
      for (let wy = y + 50; wy < 1180; wy += 150) {
        b += `<rect x="${x + 20}" y="${wy}" width="${w - 40}" height="96" fill="${U.shade(cc, -0.12)}" ${SW}/>`;
        for (let wx = x + 40; wx < x + w - 70; wx += 90) {
          const lit = light !== 'day' && U.rand('sw' + i, wx + wy) > 0.4;
          b += `<rect x="${wx}" y="${wy + 14}" width="56" height="62" fill="${lit ? '#FFD27A' : (light === 'night' ? '#2A3352' : '#8FB7CF')}" stroke="${OL}" stroke-width="3"/>`;
        }
        b += `<path d="M${x + 20} ${wy + 96} h${w - 40}" stroke="${OL}" stroke-width="6"/>` + Array.from({ length: Math.floor((w - 40) / 22) }, (_, j) => `<path d="M${x + 30 + j * 22} ${wy + 70} v26" stroke="${OL}" stroke-width="3"/>`).join('');
      }
      if (i === 1) b += `<rect x="${x + 30}" y="${y + 20}" width="${w - 60}" height="0"/>`;
    });
    // shop signs
    b += `<rect x="20" y="1180" width="300" height="70" rx="6" fill="#C4473A" ${SW}/><text x="170" y="1228" text-anchor="middle" font-family="Hind Siliguri" font-weight="700" font-size="36" fill="#FFF">ফার্মেসি</text>`;
    b += `<rect x="640" y="1190" width="280" height="64" rx="6" fill="#24615C" ${SW}/><text x="780" y="1234" text-anchor="middle" font-family="Hind Siliguri" font-weight="700" font-size="34" fill="#FFF">চা ঘর</text>`;
    // wires
    b += `<g fill="none" stroke="#1E1A18" stroke-width="3" opacity="0.8"><path d="M-200 520 Q300 620 1280 500"/><path d="M-200 560 Q400 680 1280 540"/><path d="M-200 600 Q500 700 1280 590"/></g>`;
    // electric pole + lamp
    b += `<rect x="900" y="440" width="26" height="1000" fill="#7A7F86" ${SW}/><path d="M913 520 Q980 500 1010 540" stroke="${OL}" stroke-width="8" fill="none"/><path d="M990 540 h50 l-12 22 h-26 z" fill="#3B4252" ${SW}/>`;
    if (light !== 'day') b += lampGlow(k, 1015, 600, 420, light === 'night' ? 0.6 : 0.3);
    // footpath + road
    b += `<rect x="-200" y="1300" width="1480" height="140" fill="${light === 'night' ? '#4A4A5A' : '#B8B0A2'}"/>` + Array.from({ length: 16 }, (_, j) => `<path d="M${-200 + j * 100} 1300 v140" stroke="${light === 'night' ? '#3D3D4C' : '#A39B8E'}" stroke-width="4"/>`).join('');
    b += `<rect x="-200" y="1440" width="1480" height="600" fill="${light === 'night' ? '#2C2C38' : '#6E6A66'}"/><path d="M-200 1440 H1280" stroke="${OL}" stroke-width="6"/>` + Array.from({ length: 6 }, (_, j) => `<rect x="${-100 + j * 240 - ((t * 60) % 240)}" y="1640" width="120" height="14" fill="#E8E2D2" opacity="0.7"/>`).join('');
    if (light === 'night' && has(props, 'cng')) b += `<rect x="-200" y="1440" width="1480" height="600" fill="#6C8FB8" opacity="0.08"/>`;
    let f = '';
    if (has(props, 'school_gate')) {
      b += `<g><rect x="700" y="760" width="40" height="680" fill="#3E5E80" ${SW}/><rect x="1040" y="760" width="40" height="680" fill="#3E5E80" ${SW}/><path d="M700 780 Q890 640 1080 780" fill="none" stroke="#3E5E80" stroke-width="30"/><rect x="730" y="700" width="330" height="80" rx="10" fill="#F4EDE1" ${SW}/><text x="895" y="752" text-anchor="middle" font-family="Hind Siliguri" font-weight="700" font-size="34" fill="#24415E">আদর্শ উচ্চ বিদ্যালয়</text>${Array.from({ length: 8 }, (_, j) => `<path d="M${760 + j * 36} 900 V1440" stroke="#3E5E80" stroke-width="10"/>`).join('')}<path d="M740 920 H1040 M740 1300 H1040" stroke="#3E5E80" stroke-width="12"/></g>`;
    }
    if (has(props, 'superstore')) {
      const glow = light !== 'day';
      b += `<g><rect x="520" y="820" width="560" height="560" fill="#E9EEF2" ${SW}/><rect x="520" y="820" width="560" height="120" fill="#C40F1C" ${SW}/>` +
        `<text x="800" y="900" text-anchor="middle" font-family="Hind Siliguri" font-weight="700" font-size="64" fill="#FFF">${U.esc(signOf(props, 'মেগা মার্ট'))}</text>` +
        `<rect x="560" y="980" width="480" height="400" fill="${glow ? '#FFF4C8' : '#BFE3F2'}" ${SW}/>` +
        [0, 1, 2].map(i => `<rect x="${590 + i * 150}" y="1020" width="120" height="70" rx="6" fill="#E8A33D" opacity="0.8"/><rect x="${590 + i * 150}" y="1120" width="120" height="70" rx="6" fill="#2F7D6D" opacity="0.8"/>`).join('') +
        `<rect x="640" y="1240" width="320" height="140" fill="#9FC7DA" opacity="0.6" ${SW}/><rect x="560" y="940" width="480" height="40" fill="#E8A33D"/><text x="800" y="970" text-anchor="middle" font-family="Hind Siliguri" font-weight="700" font-size="30" fill="${OL}">৩০% ছাড় · এসি · সব এক ছাদে</text></g>` +
        (glow ? lampGlow(k + 's', 800, 1100, 520, 0.35) : '');
    }
    if (has(props, 'car')) {
      b += `<g transform="translate(560,1330)"><path d="M-40 0 L-30 -70 Q-10 -130 80 -136 L250 -136 Q320 -130 350 -70 L420 -60 Q450 -50 450 0 Z" fill="#F2F2EE" ${SW}/><path d="M20 -72 Q30 -118 90 -120 L160 -120 L160 -72 Z M180 -72 L180 -120 L240 -120 Q300 -116 320 -72 Z" fill="#8FB7CF" ${SW}/><circle cx="60" cy="0" r="36" fill="#2E3440" ${SW}/><circle cx="350" cy="0" r="36" fill="#2E3440" ${SW}/><circle cx="60" cy="0" r="14" fill="#B9C2CB"/><circle cx="350" cy="0" r="14" fill="#B9C2CB"/></g>`;
    }
    if (has(props, 'bicycle')) {
      const bx = has(props, 'school_gate') ? 120 : 380;
      f += `<g transform="translate(${bx},1350)" fill="none" stroke="${OL}" stroke-linecap="round" stroke-linejoin="round">` +
        `<circle cx="0" cy="0" r="78" stroke-width="9"/><circle cx="250" cy="0" r="78" stroke-width="9"/><circle cx="0" cy="0" r="70" stroke="#5E5E66" stroke-width="3"/><circle cx="250" cy="0" r="70" stroke="#5E5E66" stroke-width="3"/>` +
        `<path d="M0 0 L90 -120 L210 -120 L250 0 M90 -120 L120 0 L0 0 M210 -120 L230 -170 M120 0 L210 -120" stroke="#2F5D50" stroke-width="12"/>` +
        `<path d="M70 -146 h50" stroke="#3A2C25" stroke-width="18"/><path d="M200 -176 q30 -6 46 6" stroke="#3A2C25" stroke-width="10"/>` +
        `<path d="M230 -160 h70 v50 h-70 z" fill="#C9A26B" stroke-width="6"/><circle cx="120" cy="0" r="16" fill="#B9C2CB" stroke-width="5"/></g>`;
    }
    if (has(props, 'cng')) {
      const cx = 380 + Math.sin(t * 2) * 4;
      f += `<g transform="translate(${cx},1420)"><path d="M0 0 L0 -220 Q10 -300 120 -306 L300 -306 Q360 -300 380 -230 L400 -120 L420 0 Z" fill="#2E8B57" ${SW}/><path d="M30 -150 L40 -270 Q60 -290 120 -290 L160 -290 L160 -150 Z M190 -150 L190 -290 L290 -290 Q340 -286 356 -230 L370 -150 Z" fill="#1E2430" opacity="0.85" ${SW}/><rect x="-10" y="-120" width="440" height="30" fill="#E8C66A" ${SW}/><circle cx="70" cy="0" r="44" fill="#2E3440" ${SW}/><circle cx="340" cy="0" r="44" fill="#2E3440" ${SW}/><circle cx="420" cy="-150" r="18" fill="#FFF1B8" ${SW}/></g>` + (light === 'night' ? lampGlow(k + 'c', cx + 440, 1270, 300, 0.5) : '');
    }
    return { back: b, front: f, seat: 'chair', floor: FLOOR };
  };

  // ---------------- STAIRS ----------------
  SETS.stairs = (light, props, t, k) => {
    const night = light === 'night';
    const wall = night ? '#4E5A58' : '#D8E0CF', wall2 = night ? '#3F4A48' : '#C6D0BC';
    let b = `<rect x="-200" y="-200" width="1480" height="1700" fill="${wall}"/><rect x="-200" y="900" width="1480" height="540" fill="${wall2}"/><path d="M-200 900 H1280" stroke="${OL}" stroke-width="4"/>`;
    // ascending stairs (background, right to left)
    for (let i = 0; i < 8; i++) {
      const x = 1080 - i * 90, y = 1440 - i * 70;
      b += `<rect x="${x - 90}" y="${y - 70}" width="${1280 - x + 90}" height="70" fill="${night ? '#5D6664' : '#B8B2A6'}" ${SW}/>`;
    }
    b += `<path d="M1180 1180 L380 620" stroke="#6B4326" stroke-width="18" stroke-linecap="round"/>` + Array.from({ length: 9 }, (_, i) => `<path d="M${1150 - i * 90} ${1160 - i * 63} v190" stroke="${OL}" stroke-width="7"/>`).join('');
    // door
    b += `<g><rect x="70" y="560" width="300" height="880" rx="6" fill="#7A4C2C" ${SW}/><rect x="100" y="600" width="240" height="360" rx="6" fill="none" stroke="#5E3A22" stroke-width="6"/><rect x="100" y="1000" width="240" height="380" rx="6" fill="none" stroke="#5E3A22" stroke-width="6"/><circle cx="340" cy="1000" r="13" fill="#E8C66A" ${SW}/><rect x="160" y="500" width="120" height="50" rx="6" fill="#F4EDE1" ${SW}/><text x="220" y="536" text-anchor="middle" font-family="Hind Siliguri" font-weight="700" font-size="32" fill="${OL}">৪-এ</text></g>`;
    // shoe rack
    b += `<rect x="390" y="1330" width="140" height="110" fill="#8A5A36" ${SW}/><ellipse cx="430" cy="1326" rx="26" ry="10" fill="#3A2C25"/><ellipse cx="490" cy="1326" rx="26" ry="10" fill="#C4473A"/>`;
    // tube light
    const flick = night ? (Math.sin(t * 37) > 0.97 ? 0.4 : 1) : 0.4;
    b += `<rect x="420" y="300" width="300" height="26" rx="13" fill="#F7FBFF" ${SW} opacity="${0.6 + 0.4 * flick}"/>`;
    if (night) b += lampGlow(k, 570, 330, 620, 0.45 * flick);
    b += plant(980, 1440, 0.9).replace('translate(980,1440)', 'translate(620,1440)');
    b += `<rect x="-200" y="${FLOOR}" width="1480" height="600" fill="${night ? '#3A403F' : '#A8A196'}"/><path d="M-200 ${FLOOR} H1280" stroke="${OL}" stroke-width="5"/>`;
    return { back: b, front: '', seat: 'chair', floor: FLOOR };
  };

  // ---------------- HOSPITAL ----------------
  SETS.hospital = (light, props, t, k) => {
    let b = `<rect x="-200" y="-200" width="1480" height="1700" fill="#D6EBE6"/><rect x="-200" y="980" width="1480" height="460" fill="#BFDCD5"/><path d="M-200 980 H1280" stroke="#8FB8AE" stroke-width="8"/>`;
    b += `<rect x="-200" y="-200" width="1480" height="330" fill="#EEF5F3"/>`;
    [140, 540, 940].forEach(x => { b += `<rect x="${x - 120}" y="150" width="240" height="40" rx="8" fill="#FFFFFF" ${SW}/>`; });
    b += lampGlow(k, 540, 220, 700, 0.18);
    b += `<g><rect x="250" y="300" width="580" height="110" rx="12" fill="#C4473A" ${SW}/><text x="540" y="372" text-anchor="middle" font-family="Hind Siliguri" font-weight="700" font-size="52" fill="#FFF">জরুরি বিভাগ  ✚</text></g>`;
    // doors with round windows
    [[60, '#7FA9C9'], [760, '#7FA9C9']].forEach(([x, c]) => { b += `<rect x="${x}" y="540" width="260" height="900" rx="6" fill="${c}" ${SW}/><circle cx="${x + 130}" cy="720" r="50" fill="#DDF0F8" ${SW}/><rect x="${x + 110}" y="980" width="40" height="12" rx="6" fill="${OL}"/>`; });
    // stretcher
    b += `<g><rect x="360" y="1180" width="380" height="40" rx="10" fill="#E9EEF2" ${SW}/><rect x="370" y="1150" width="140" height="40" rx="16" fill="#FFFFFF" ${SW}/><path d="M390 1220 L370 1400 M710 1220 L730 1400" stroke="${OL}" stroke-width="10"/><circle cx="370" cy="1410" r="18" fill="#3B4252"/><circle cx="730" cy="1410" r="18" fill="#3B4252"/></g>`;
    b += `<path d="M330 820 V1430" stroke="#9AA6B2" stroke-width="10"/><path d="M300 820 h60" stroke="#9AA6B2" stroke-width="10"/><rect x="330" y="830" width="44" height="74" rx="12" fill="#DDF0F8" opacity="0.9" ${SW}/>`;
    b += `<rect x="-200" y="${FLOOR}" width="1480" height="600" fill="#C9D6D3"/><path d="M-200 ${FLOOR} H1280" stroke="${OL}" stroke-width="5"/><rect x="200" y="1470" width="680" height="60" rx="30" fill="#FFFFFF" opacity="0.35"/>`;
    return { back: b, front: '', seat: 'chair', floor: FLOOR };
  };

  // ---------------- BALCONY ----------------
  SETS.balcony = (light, props, t, k) => {
    const P = pal(light === 'day' ? 'day' : light);
    let b = `<defs>${grad('sky' + k, P.skyT, P.skyB)}</defs>` + sky(P, light, k + 'b', -200, -200, 1480, 1300, t);
    // string lights
    b += `<path d="M-40 220 Q270 320 540 250 Q810 180 1120 280" fill="none" stroke="${OL}" stroke-width="3"/>`;
    for (let i = 0; i < 12; i++) { const x = -20 + i * 100, y = 220 + Math.sin(i * 0.9) * 40 + 30; b += `<circle cx="${x}" cy="${y}" r="12" fill="#FFD27A" opacity="${0.7 + 0.3 * Math.sin(t * 3 + i)}"/>` + (light !== 'day' ? `<circle cx="${x}" cy="${y}" r="34" fill="#FFD27A" opacity="0.18"/>` : ''); }
    // walls side pillars
    b += `<rect x="-200" y="-200" width="240" height="1700" fill="${light === 'night' ? '#4E4A6B' : '#E3CDA8'}" ${SW}/><rect x="1040" y="-200" width="240" height="1700" fill="${light === 'night' ? '#4E4A6B' : '#E3CDA8'}" ${SW}/>`;
    // railing
    b += `<rect x="40" y="1010" width="1000" height="26" rx="8" fill="#2F3B45" ${SW}/>`;
    for (let x = 60; x < 1040; x += 60) b += `<path d="M${x} 1036 V1400" stroke="#2F3B45" stroke-width="10"/><circle cx="${x + 30}" cy="1180" r="22" fill="none" stroke="#2F3B45" stroke-width="7"/>`;
    b += `<rect x="40" y="1390" width="1000" height="50" fill="#C9B79B" ${SW}/>`;
    b += plant(120, 1440, 1.1) + plant(980, 1440, 0.95);
    b += `<rect x="-200" y="${FLOOR}" width="1480" height="600" fill="${light === 'night' ? '#3E3A52' : '#C59D74'}"/><path d="M-200 ${FLOOR} H1280" stroke="${OL}" stroke-width="5"/>`;
    b += Array.from({ length: 8 }, (_, j) => `<path d="M${-60 + j * 170} ${FLOOR} L${-300 + j * 240} 2000" stroke="${light === 'night' ? '#35314A' : '#B88F66'}" stroke-width="4"/>`).join('');
    if (has(props, 'tea')) b += `<g><rect x="460" y="1300" width="160" height="22" rx="8" fill="#8A5A36" ${SW}/><rect x="480" y="1322" width="16" height="118" fill="#6B4326"/><rect x="584" y="1322" width="16" height="118" fill="#6B4326"/></g>`;
    return { back: b, front: '', seat: 'chair', floor: FLOOR };
  };

  g.SETS = SETS;
  g.SETS_FLOOR = FLOOR;
})(window);
