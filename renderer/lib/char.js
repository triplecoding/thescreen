// The Screen — parametric character rig (flat vector, 3/4 view, facing right by default)
// Origin = feet centre on the floor. Everything is a pure function of (def, state).
(function (g) {
  const U = g.U;
  const OL = '#2A211C';           // outline ink
  const SKIN = { light: '#EBC199', wheat: '#D9A273', tan: '#BE8256', brown: '#9C6239', dark: '#7A4A2C' };
  const HAIR = { black: '#231C19', grey: '#BDB6AC', salt: '#6E6862', brown: '#4A3226' };
  const TYPES = {
    man: { h: 1.0, head: 1.0, sh: 92, hip: 84, fem: false },
    young_man: { h: 1.0, head: 1.0, sh: 94, hip: 82, fem: false },
    old_man: { h: 0.95, head: 1.02, sh: 88, hip: 86, fem: false, old: true },
    woman: { h: 0.94, head: 0.98, sh: 80, hip: 90, fem: true },
    young_woman: { h: 0.93, head: 0.98, sh: 78, hip: 88, fem: true },
    old_woman: { h: 0.9, head: 1.0, sh: 82, hip: 92, fem: true, old: true },
    teen_boy: { h: 0.86, head: 1.08, sh: 80, hip: 74, fem: false },
    teen_girl: { h: 0.84, head: 1.08, sh: 72, hip: 78, fem: true },
    child_boy: { h: 0.64, head: 1.28, sh: 70, hip: 66, fem: false, kid: true },
    child_girl: { h: 0.62, head: 1.28, sh: 66, hip: 68, fem: true, kid: true },
  };
  // arm poses: absolute angles in degrees (0 = straight down, +90 = forward toward facing)
  const ARMS = {
    down: { f: [8, 4], b: [-7, -3] },
    talk: { f: [30, 98], b: [-7, -3] },
    point: { f: [80, 86], b: [-7, -1] },
    cross: { f: [14, -92], b: [-14, 96], crossed: true },
    hold: { f: [16, 92], b: [-7, -3] },
    phone: { f: [18, 152], b: [-7, -3] },
    call: { f: [8, 4], b: [-112, 118] },
    face: { f: [-8, 174], b: [-7, -3] },
    wave: { f: [150, 172], b: [-7, -3] },
    hug: { f: [58, 100], b: [-7, -3] },
  };
  const L1 = 150, L2 = 138;

  function armPts(sx, sy, a1, a2) {
    const r = Math.PI / 180;
    const ex = sx + L1 * Math.sin(a1 * r), ey = sy + L1 * Math.cos(a1 * r);
    const hx = ex + L2 * Math.sin(a2 * r), hy = ey + L2 * Math.cos(a2 * r);
    return { ex, ey, hx, hy };
  }

  function limb(path, w, color) {
    return `<path d="${path}" fill="none" stroke="${OL}" stroke-width="${w + 10}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${path}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  function item(kind, x, y, def) {
    switch (kind) {
      case 'envelope': return `<g transform="translate(${x},${y}) rotate(-8)"><rect x="-44" y="-30" width="88" height="58" rx="5" fill="#F7EEDC" stroke="${OL}" stroke-width="5"/><path d="M-44 -30 L0 6 L44 -30" fill="none" stroke="${OL}" stroke-width="4"/><circle cx="0" cy="6" r="7" fill="#C4473A"/></g>`;
      case 'phone': return `<g transform="translate(${x},${y - 18}) rotate(-12)"><rect x="-21" y="-38" width="42" height="76" rx="8" fill="#1E2430" stroke="${OL}" stroke-width="5"/><rect x="-15" y="-30" width="30" height="56" rx="4" fill="#7FB2D9"/><rect x="-15" y="-30" width="30" height="18" fill="#A9CDEB"/></g>`;
      case 'tea': return `<g transform="translate(${x + 8},${y - 14})"><path d="M-26 -22 L26 -22 L20 18 Q0 26 -20 18 Z" fill="#FFFFFF" stroke="${OL}" stroke-width="5" stroke-linejoin="round"/><path d="M24 -12 Q42 -10 36 6 Q30 14 20 10" fill="none" stroke="${OL}" stroke-width="5"/><ellipse cx="0" cy="-22" rx="24" ry="6" fill="#B5652E" stroke="${OL}" stroke-width="4"/></g>`;
      case 'plate': return `<g transform="translate(${x + 10},${y - 6})"><ellipse cx="0" cy="0" rx="62" ry="17" fill="#FFFFFF" stroke="${OL}" stroke-width="5"/><ellipse cx="0" cy="-8" rx="38" ry="14" fill="#F2C14E" stroke="${OL}" stroke-width="4"/><circle cx="-12" cy="-14" r="6" fill="#C4473A"/><circle cx="12" cy="-12" r="5" fill="#2F7D6D"/></g>`;
      case 'book': return `<g transform="translate(${x + 4},${y - 10}) rotate(-6)"><rect x="-38" y="-50" width="76" height="98" rx="6" fill="#E3B95F" stroke="${OL}" stroke-width="5"/><rect x="-38" y="-50" width="14" height="98" fill="#B98A35" stroke="${OL}" stroke-width="4"/><path d="M-14 -24 H26 M-14 -8 H22 M-14 8 H24" stroke="#8C6A2A" stroke-width="5" stroke-linecap="round"/></g>`;
      case 'passbook': return `<g transform="translate(${x + 4},${y - 10}) rotate(-6)"><rect x="-34" y="-46" width="68" height="90" rx="6" fill="#2F7D6D" stroke="${OL}" stroke-width="5"/><rect x="-22" y="-30" width="44" height="12" rx="3" fill="#E8A33D"/><path d="M-20 0 H20 M-20 14 H14" stroke="#CFE6DE" stroke-width="5" stroke-linecap="round"/></g>`;
      case 'bag': return `<g transform="translate(${x},${y + 20})"><path d="M-20 -26 Q0 -52 20 -26" fill="none" stroke="${OL}" stroke-width="6"/><path d="M-40 -26 L40 -26 L34 52 Q0 60 -34 52 Z" fill="#C9A26B" stroke="${OL}" stroke-width="5" stroke-linejoin="round"/><path d="M-28 -6 H28" stroke="#A9814B" stroke-width="5"/><path d="M-12 -40 L-4 -60 M8 -40 L14 -62" stroke="#3E8E4E" stroke-width="7" stroke-linecap="round"/></g>`;
      default: return '';
    }
  }

  // ---------- face ----------
  function face(def, st, skin) {
    const mood = st.mood || 'neutral';
    const fx = 12;
    const talk = st.talk || 0;
    const blink = st.blink || 0; // 0..1 closed
    let o = '';
    // eyes
    const eye = (x, scale) => {
      let lid = 0, look = 3, lookY = 0;
      if (mood === 'sad' || mood === 'crying') lid = 0.38;
      if (mood === 'angry') lid = 0.42;
      if (mood === 'thinking') { look = 5; lookY = -5; lid = 0.15; }
      if (mood === 'worried') lid = 0.12;
      const open = mood === 'surprised' ? 1.22 : 1;
      const rx = 13 * scale, ry = 13 * open;
      if (blink > 0.55 || mood === 'happy') {
        // closed / happy arc
        const curve = mood === 'happy' ? -9 : 3;
        return `<path d="M${x - rx} -1 Q${x} ${-1 + curve} ${x + rx} -1" fill="none" stroke="${OL}" stroke-width="5" stroke-linecap="round"/>`;
      }
      let s = `<ellipse cx="${x}" cy="0" rx="${rx}" ry="${ry}" fill="#FFFDF8" stroke="${OL}" stroke-width="3.5"/>` +
        `<circle cx="${x + look * scale}" cy="${2 + lookY}" r="${8.5 * scale}" fill="#2B1A12"/>` +
        `<circle cx="${x + look * scale + 3}" cy="${-2 + lookY}" r="2.6" fill="#FFFFFF"/>`;
      if (lid > 0) {
        const ly = -ry + 2 * ry * lid;
        s += `<path d="M${x - rx - 2} ${-ry - 2} L${x + rx + 2} ${-ry - 2} L${x + rx + 2} ${ly} Q${x} ${ly + 3} ${x - rx - 2} ${ly} Z" fill="${skin}"/>` +
          `<path d="M${x - rx} ${ly} Q${x} ${ly + 3} ${x + rx} ${ly}" fill="none" stroke="${OL}" stroke-width="4" stroke-linecap="round"/>`;
      }
      return s;
    };
    o += `<g transform="translate(0,-4)">${eye(fx - 22, 0.86)}${eye(fx + 27, 1)}</g>`;
    // brows
    const browCol = def.hair && /grey/.test(def.hair) || /bald/.test(def.hair || '') ? '#8E877E' : '#231C19';
    const br = {
      neutral: [[-6, 0], [6, 0]], smile: [[-6, -2], [6, -2]], happy: [[-6, -4], [6, -4]],
      sad: [[-4, 6], [8, -4]], crying: [[-4, 7], [8, -5]], worried: [[-4, 6], [8, -4]],
      angry: [[-6, -6], [6, 8]], surprised: [[-6, -9], [6, -9]], thinking: [[-6, -6], [6, 2]],
    }[mood] || [[-6, 0], [6, 0]];
    const brow = (x, w, k) => {
      const [a, b] = br; // a: inner offsets
      // inner end is toward the nose (between the eyes)
      const inner = k === 'far' ? x + w : x - w;
      const outer = k === 'far' ? x - w : x + w;
      const yi = -30 + (k === 'far' ? a[1] : a[1]);
      const yo = -30 + (k === 'far' ? b[1] : b[1]);
      return `<path d="M${outer} ${yo - 2} Q${x} ${(yi + yo) / 2 - 5} ${inner} ${yi}" fill="none" stroke="${browCol}" stroke-width="7" stroke-linecap="round"/>`;
    };
    o += brow(fx - 22, 12, 'far') + brow(fx + 27, 14, 'near');
    // nose
    o += `<path d="M${fx + 44} 2 Q${fx + 56} 18 ${fx + 44} 22" fill="none" stroke="${U.shade(skin, -0.35)}" stroke-width="4.5" stroke-linecap="round"/>`;
    // cheeks
    if (['happy', 'smile', 'crying'].includes(mood) || def.fem) o += `<ellipse cx="${fx + 40}" cy="26" rx="13" ry="7" fill="#E07A6A" opacity="${def.fem ? 0.28 : 0.22}"/><ellipse cx="${fx - 26}" cy="26" rx="10" ry="6" fill="#E07A6A" opacity="0.18"/>`;
    // mouth
    const mx = fx + 18, my = 44;
    const m = mood;
    if (talk > 0.08) {
      const h = 4 + talk * 18, w = 14 + talk * 3;
      o += `<path d="M${mx - w} ${my - 2} Q${mx} ${my - 5} ${mx + w} ${my - 2} Q${mx + w * 0.7} ${my + h} ${mx} ${my + h} Q${mx - w * 0.7} ${my + h} ${mx - w} ${my - 2} Z" fill="#5A2421" stroke="${OL}" stroke-width="4" stroke-linejoin="round"/>` +
        (h > 10 ? `<ellipse cx="${mx}" cy="${my + h - 4}" rx="${w * 0.45}" ry="3.5" fill="#D7685F"/>` : '');
    } else if (m === 'happy') {
      o += `<path d="M${mx - 18} ${my - 4} Q${mx} ${my - 6} ${mx + 18} ${my - 4} Q${mx + 14} ${my + 16} ${mx} ${my + 16} Q${mx - 14} ${my + 16} ${mx - 18} ${my - 4} Z" fill="#5A2421" stroke="${OL}" stroke-width="4" stroke-linejoin="round"/><path d="M${mx - 13} ${my - 2} H${mx + 13}" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>`;
    } else if (m === 'smile') {
      o += `<path d="M${mx - 15} ${my - 2} Q${mx} ${my + 11} ${mx + 15} ${my - 2}" fill="none" stroke="${OL}" stroke-width="5" stroke-linecap="round"/>`;
    } else if (m === 'sad' || m === 'crying' || m === 'worried') {
      o += `<path d="M${mx - 13} ${my + 6} Q${mx} ${my - 4} ${mx + 13} ${my + 6}" fill="none" stroke="${OL}" stroke-width="5" stroke-linecap="round"/>`;
    } else if (m === 'angry') {
      o += `<path d="M${mx - 14} ${my + 4} Q${mx} ${my - 3} ${mx + 14} ${my + 4}" fill="none" stroke="${OL}" stroke-width="6" stroke-linecap="round"/>`;
    } else if (m === 'surprised') {
      o += `<ellipse cx="${mx}" cy="${my + 4}" rx="9" ry="11" fill="#5A2421" stroke="${OL}" stroke-width="4"/>`;
    } else if (m === 'thinking') {
      o += `<path d="M${mx - 10} ${my + 2} Q${mx + 4} ${my - 2} ${mx + 12} ${my + 3}" fill="none" stroke="${OL}" stroke-width="5" stroke-linecap="round"/>`;
    } else {
      o += `<path d="M${mx - 12} ${my} Q${mx} ${my + 4} ${mx + 12} ${my}" fill="none" stroke="${OL}" stroke-width="5" stroke-linecap="round"/>`;
    }
    if (m === 'crying') {
      const ty = 14 + ((st.t || 0) * 30 % 28);
      o += `<path d="M${fx + 30} 14 Q${fx + 34} ${ty + 10} ${fx + 30} ${ty + 22}" fill="none" stroke="#7FC0E8" stroke-width="5" stroke-linecap="round" opacity="0.9"/>` +
        `<circle cx="${fx + 31}" cy="${ty + 24}" r="5" fill="#9AD0EF"/>`;
    }
    return o;
  }

  // ---------- hair ----------
  function hairBack(def) {
    const hc = def.hair && def.hair.includes('grey') ? HAIR.grey : HAIR.black;
    switch (def.hair) {
      case 'long_braid': return `<path d="M-60 -10 Q-70 70 -54 150 Q-48 210 -60 280" fill="none" stroke="${OL}" stroke-width="34" stroke-linecap="round"/><path d="M-60 -10 Q-70 70 -54 150 Q-48 210 -60 280" fill="none" stroke="${hc}" stroke-width="24" stroke-linecap="round"/><path d="M-66 120 l14 10 M-62 160 l14 10 M-60 200 l14 10 M-62 240 l14 10" stroke="#3A302B" stroke-width="4"/><circle cx="-60" cy="284" r="9" fill="#C4473A" stroke="${OL}" stroke-width="4"/>`;
      case 'long_bun': case 'grey_bun': return `<circle cx="-58" cy="-30" r="34" fill="${hc}" stroke="${OL}" stroke-width="5"/>`;
      default: return '';
    }
  }
  function hairFront(def) {
    const grey = def.hair && (def.hair.includes('grey'));
    const hc = grey ? (def.hair === 'side_grey' ? HAIR.salt : HAIR.grey) : HAIR.black;
    const s = `stroke="${OL}" stroke-width="5" stroke-linejoin="round"`;
    switch (def.hair) {
      case 'short': return `<path d="M-72 4 C-80 -60 -40 -92 8 -90 C52 -90 78 -62 74 -22 C66 -44 44 -56 20 -54 C-6 -52 -28 -46 -42 -36 C-50 -20 -56 -6 -60 10 Z" fill="${hc}" ${s}/><path d="M-20 -78 Q10 -84 40 -74" fill="none" stroke="#4A3F3A" stroke-width="4" stroke-linecap="round"/>`;
      case 'side': case 'side_grey': return `<path d="M-72 8 C-84 -64 -36 -98 14 -94 C58 -92 82 -60 76 -16 C70 -34 58 -48 38 -54 C30 -40 6 -40 -18 -44 C-36 -40 -50 -20 -58 12 Z" fill="${hc}" ${s}/><path d="M38 -54 C26 -70 4 -78 -24 -76" fill="none" stroke="${grey ? '#4E4944' : '#4A3F3A'}" stroke-width="4" stroke-linecap="round"/>`;
      case 'curly': {
        let p = ''; const pts = [[-66, -10], [-62, -44], [-40, -72], [-8, -86], [26, -84], [54, -66], [70, -38]];
        pts.forEach(([x, y]) => { p += `<circle cx="${x}" cy="${y}" r="24" fill="${hc}" ${s}/>`; });
        return p + `<path d="M-60 0 C-60 -50 -20 -70 20 -66 C50 -62 66 -46 70 -28 L60 -30 C40 -44 0 -46 -40 -30 Z" fill="${hc}"/>`;
      }
      case 'bald_grey': return `<path d="M-70 14 C-74 -14 -66 -36 -54 -48 L-46 -30 C-54 -16 -58 0 -58 16 Z" fill="${HAIR.grey}" ${s}/><path d="M60 -46 C68 -36 72 -24 72 -14 L64 -20 Z" fill="${HAIR.grey}" ${s}/>`;
      case 'long_braid': case 'long_bun': case 'grey_bun':
        return `<path d="M-72 30 C-86 -60 -36 -100 14 -94 C60 -90 84 -58 74 -10 C62 -40 40 -60 4 -60 C-30 -58 -52 -30 -58 30 Z" fill="${hc}" ${s}/><path d="M4 -60 C-10 -76 -30 -84 -50 -80" fill="none" stroke="${grey ? '#9C958B' : '#4A3F3A'}" stroke-width="4" stroke-linecap="round"/>`;
      case 'kid': return `<path d="M-70 0 C-78 -60 -36 -94 12 -90 C56 -88 80 -58 72 -20 C60 -46 30 -58 0 -54 C-30 -50 -52 -30 -60 6 Z" fill="${hc}" ${s}/><path d="M6 -90 q10 -22 26 -16" fill="none" stroke="${OL}" stroke-width="6" stroke-linecap="round"/>`;
      default: return '';
    }
  }
  function hijab(def, skin) {
    const c = def.color2 || '#E9E2D2';
    return `<path d="M-84 30 C-96 -70 -44 -110 10 -106 C66 -104 98 -64 92 -6 C90 40 70 80 40 104 L-40 120 C-70 100 -80 70 -84 30 Z" fill="${c}" stroke="${OL}" stroke-width="5"/>` +
      `<path d="M66 -24 C70 30 52 66 12 78 C-30 84 -54 54 -56 6 C-56 -40 -26 -64 10 -66 C44 -66 64 -50 66 -24 Z" fill="${skin}" stroke="${OL}" stroke-width="4"/>`;
  }

  // ---------- body ----------
  function render(def, st) {
    const T = TYPES[def.type] || TYPES.man;
    const skin = SKIN[def.skin] || SKIN.wheat;
    const col = def.color || '#C4473A';
    const col2 = def.color2 || U.shade(col, -0.25);
    const outfit = def.outfit || 'shirt';
    const t = st.t || 0;
    const phase = U.hash(def.name || def.type) * 6.28;
    const breathe = Math.sin(t * 1.7 + phase) * 3;
    const sitting = st.pose === 'sit';
    const walking = st.pose === 'walk';
    const dy = sitting ? 130 : 0;               // torso drop when sitting
    const hunch = T.old ? 4 : 0;
    const sh = T.sh, hip = T.hip;
    let pants = '#33405A';
    if (outfit === 'panjabi') pants = '#EFE9DD';
    if (outfit === 'uniform') pants = col2;
    if (outfit === 'salwar') pants = U.mix(col, '#FFFFFF', 0.55);
    if (outfit === 'scrub') pants = col;
    if (outfit === 'tshirt') pants = '#3B4252';
    const shoe = '#3A2C25';
    let back = '', legs = '', torso = '', front = '';
    const legW = T.fem ? 54 : 60;

    // ---- legs ----
    const hipY = -380 + dy;
    if (outfit === 'sari') {
      // skirt covers legs
      if (sitting) {
        legs += `<path d="M${-hip} ${hipY - 20} L${hip + 10} ${hipY - 20} Q${hip + 170} ${hipY - 10} ${hip + 170} ${hipY + 40} L${hip + 175} -6 L${hip + 40} -6 L${hip + 40} ${hipY + 50} L${-hip} ${hipY + 60} Z" fill="${col}" stroke="${OL}" stroke-width="5" stroke-linejoin="round"/>` +
          `<path d="M${hip + 40} -26 L${hip + 175} -26" stroke="${col2}" stroke-width="16"/>` +
          `<ellipse cx="${hip + 150}" cy="-4" rx="34" ry="12" fill="${shoe}" stroke="${OL}" stroke-width="4"/>`;
      } else {
        const sw = walking ? Math.sin(t * 9) * 8 : 0;
        legs += `<path d="M${-hip} ${hipY - 30} L${hip} ${hipY - 30} L${hip + 20 + sw} -8 L${-hip - 18 + sw} -8 Z" fill="${col}" stroke="${OL}" stroke-width="5" stroke-linejoin="round"/>` +
          `<path d="M${-hip + 6} ${hipY + 10} L${-hip - 8 + sw} -30 M${-hip / 3} ${hipY + 20} L${-hip / 3 - 4 + sw} -30 M${hip / 3} ${hipY + 20} L${hip / 3 + 6 + sw} -30" stroke="${U.shade(col, -0.18)}" stroke-width="5"/>` +
          `<path d="M${-hip - 16 + sw} -30 L${hip + 18 + sw} -30" stroke="${col2}" stroke-width="18"/>` +
          `<ellipse cx="${30 + sw}" cy="-4" rx="34" ry="12" fill="${shoe}" stroke="${OL}" stroke-width="4"/>`;
      }
    } else {
      const lx = [-hip * 0.45, hip * 0.45];
      lx.forEach((x, i) => {
        const isFront = i === 1;
        if (sitting) {
          const kx = x + 165, ky = hipY + 10;
          legs += limb(`M${x} ${hipY} L${kx} ${ky} L${kx + 6} -40`, legW, isFront ? pants : U.shade(pants, -0.12));
          legs += `<path d="M${kx - 20} -18 Q${kx + 6} -40 ${kx + 50} -24 Q${kx + 60} -6 ${kx + 34} -2 L${kx - 20} -2 Z" fill="${shoe}" stroke="${OL}" stroke-width="4"/>`;
        } else {
          const a = walking ? Math.sin(t * 9 + i * Math.PI) * 18 : (i ? 3 : -3);
          const r = Math.PI / 180;
          const fx = x + Math.sin(a * r) * 360, fy = hipY + Math.cos(a * r) * 360;
          legs += limb(`M${x} ${hipY} L${fx} ${Math.min(fy, -40)}`, legW, isFront ? pants : U.shade(pants, -0.12));
          legs += `<path d="M${fx - 26} -16 Q${fx} -40 ${fx + 44} -22 Q${fx + 54} -4 ${fx + 30} 0 L${fx - 26} 0 Z" fill="${shoe}" stroke="${OL}" stroke-width="4"/>`;
        }
        if (outfit === 'panjabi' || outfit === 'uniform' || outfit === 'salwar' || outfit === 'shirt' || outfit === 'tshirt' || outfit === 'scrub') { /* plain */ }
      });
    }

    // ---- torso ----
    const sy = -625 + dy + breathe * 0.5;  // shoulder line
    let bottom = -372 + dy;
    let flare = 0;
    if (outfit === 'panjabi') { bottom = -185 + dy; flare = 18; }
    if (outfit === 'salwar') { bottom = -205 + dy; flare = 22; }
    if (outfit === 'sari') { bottom = -420 + dy; }
    if (sitting && (outfit === 'panjabi' || outfit === 'salwar')) bottom = Math.min(bottom, -250 + dy);
    const tw = sh, bw = hip + flare;
    const body = `M${-tw + 6} ${sy + 6} C${-tw - 10} ${sy + 40} ${-tw - 6} ${sy + 150} ${-hip - 4} ${-380 + dy} L${-bw} ${bottom} Q0 ${bottom + 8} ${bw} ${bottom} L${hip + 4} ${-380 + dy} C${tw + 6} ${sy + 150} ${tw + 10} ${sy + 40} ${tw - 6} ${sy + 6} Q0 ${sy - 14} ${-tw + 6} ${sy + 6} Z`;
    const tcol = outfit === 'sari' ? col2 : col;
    torso += `<path d="${body}" fill="${tcol}" stroke="${OL}" stroke-width="5" stroke-linejoin="round"/>`;
    // shading on back side
    torso += `<path d="M${-tw + 6} ${sy + 6} C${-tw - 10} ${sy + 40} ${-tw - 6} ${sy + 150} ${-hip - 4} ${-380 + dy} L${-bw} ${bottom} L${-bw + 34} ${bottom} C${-tw + 30} ${sy + 150} ${-tw + 26} ${sy + 60} ${-tw + 30} ${sy + 4} Z" fill="#000" opacity="0.09"/>`;
    // outfit details
    if (outfit === 'shirt' || outfit === 'uniform') {
      torso += `<path d="M-30 ${sy - 2} L0 ${sy + 34} L30 ${sy - 2}" fill="${U.shade(tcol, 0.18)}" stroke="${OL}" stroke-width="4" stroke-linejoin="round"/>` +
        `<path d="M6 ${sy + 34} L8 ${bottom - 6}" stroke="${U.shade(tcol, -0.2)}" stroke-width="4"/>` +
        [70, 130, 190].map(o => `<circle cx="16" cy="${sy + o}" r="4.5" fill="${U.shade(tcol, -0.3)}"/>`).join('') +
        `<path d="M40 ${sy + 70} h34 v32 h-34 z" fill="none" stroke="${U.shade(tcol, -0.18)}" stroke-width="4"/>`;
      if (outfit === 'uniform') torso += `<path d="M-6 ${sy + 30} l10 70 l10 -70 z" fill="${col2}" stroke="${OL}" stroke-width="3"/>`;
    } else if (outfit === 'tshirt') {
      torso += `<path d="M-30 ${sy - 4} Q0 ${sy + 22} 30 ${sy - 4}" fill="none" stroke="${OL}" stroke-width="5"/>` +
        `<path d="M-20 ${sy + 80} h70" stroke="${U.shade(tcol, 0.25)}" stroke-width="10" stroke-linecap="round" opacity="0.7"/>`;
    } else if (outfit === 'panjabi' || outfit === 'salwar') {
      torso += `<path d="M-18 ${sy - 6} Q0 ${sy + 6} 22 ${sy - 6}" fill="none" stroke="${OL}" stroke-width="4"/>` +
        `<path d="M12 ${sy + 2} L12 ${sy + 120}" stroke="${U.shade(tcol, -0.22)}" stroke-width="4"/>` +
        (outfit === 'panjabi' ? [30, 62, 94].map(o => `<circle cx="12" cy="${sy + o}" r="4.5" fill="${U.shade(tcol, -0.35)}"/>`).join('') : '') +
        `<path d="M${-bw + 10} ${bottom - 8} Q0 ${bottom} ${bw - 10} ${bottom - 8}" fill="none" stroke="${U.shade(tcol, -0.18)}" stroke-width="5"/>`;
      if (outfit === 'salwar') {
        // dupatta over shoulders
        torso += `<path d="M${-tw + 4} ${sy + 10} Q${-tw + 30} ${sy + 60} 10 ${sy + 70} Q${tw - 10} ${sy + 60} ${tw} ${sy + 4} L${tw + 8} ${sy + 40} Q${tw - 20} ${sy + 110} 10 ${sy + 118} Q${-tw + 20} ${sy + 110} ${-tw - 6} ${sy + 50} Z" fill="${col2}" stroke="${OL}" stroke-width="4" opacity="0.96"/>` +
          `<path d="M${-tw - 4} ${sy + 20} L${-tw - 22} ${sy + 300}" stroke="${OL}" stroke-width="40" stroke-linecap="round"/><path d="M${-tw - 4} ${sy + 20} L${-tw - 22} ${sy + 300}" stroke="${col2}" stroke-width="30" stroke-linecap="round"/>`;
      }
    } else if (outfit === 'sari') {
      // anchal: diagonal drape from right hip over left shoulder
      torso += `<path d="M${-tw + 2} ${sy + 4} L${-tw + 46} ${sy - 4} L${hip + 14} ${-372 + dy} L${hip - 40} ${-360 + dy} Z" fill="${col}" stroke="${OL}" stroke-width="4" stroke-linejoin="round"/>` +
        `<path d="M${-tw + 30} ${sy} L${hip - 6} ${-366 + dy}" stroke="${col2}" stroke-width="10"/>` +
        `<path d="M${-tw + 2} ${sy + 4} L${-tw - 18} ${sy + 330}" stroke="${OL}" stroke-width="48" stroke-linecap="round"/><path d="M${-tw + 2} ${sy + 4} L${-tw - 18} ${sy + 330}" stroke="${col}" stroke-width="38" stroke-linecap="round"/><path d="M${-tw - 14} ${sy + 300} L${-tw - 22} ${sy + 330}" stroke="${col2}" stroke-width="30"/>`;
    } else if (outfit === 'scrub') {
      torso += `<path d="M-30 ${sy - 4} L0 ${sy + 46} L30 ${sy - 4}" fill="none" stroke="${OL}" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M30 ${sy + 120} h40 v34 h-40 z" fill="none" stroke="${U.shade(tcol, -0.2)}" stroke-width="4"/><path d="M-50 ${sy + 4} Q-60 ${sy + 120} -20 ${sy + 150}" fill="none" stroke="#3A4651" stroke-width="5"/><circle cx="-20" cy="${sy + 156}" r="9" fill="#9AA6B2" stroke="${OL}" stroke-width="3"/>`;
    }
    // neck
    const neck = `<path d="M-20 ${sy - 6} L-20 ${sy - 40} L22 ${sy - 40} L22 ${sy - 6} Q0 ${sy + 4} -20 ${sy - 6} Z" fill="${skin}" stroke="${OL}" stroke-width="5"/><path d="M-20 ${sy - 30} Q0 ${sy - 18} 22 ${sy - 30}" fill="none" stroke="${U.shade(skin, -0.25)}" stroke-width="5" opacity="0.6"/>`;

    // ---- arms ----
    const A = ARMS[st.arm] || ARMS.down;
    const aF = st.armF || A.f, aB = st.armB || A.b;
    const sleeveLong = !['tshirt', 'scrub'].includes(outfit);
    const sleeve = outfit === 'sari' ? col2 : col;
    const armW = T.fem ? 40 : 46;
    const drawArm = (sx, a, isFront) => {
      const p = armPts(sx, sy + 18, a[0], a[1]);
      const c = isFront ? sleeve : U.shade(sleeve, -0.12);
      let s = '';
      if (sleeveLong) s += limb(`M${sx} ${sy + 18} L${p.ex} ${p.ey} L${p.hx} ${p.hy}`, armW, c);
      else {
        const mx = sx + (p.ex - sx) * 0.55, my = sy + 18 + (p.ey - sy - 18) * 0.55;
        s += limb(`M${sx} ${sy + 18} L${p.ex} ${p.ey} L${p.hx} ${p.hy}`, armW - 6, isFront ? skin : U.shade(skin, -0.1));
        s += limb(`M${sx} ${sy + 18} L${mx} ${my}`, armW + 4, c);
      }
      s += `<circle cx="${p.hx}" cy="${p.hy}" r="${T.fem ? 19 : 22}" fill="${isFront ? skin : U.shade(skin, -0.1)}" stroke="${OL}" stroke-width="5"/>`;
      return { s, p };
    };
    const bArm = drawArm(-sh + 26, aB, false);
    const fArm = drawArm(sh - 26, aF, true);
    let held = '';
    if (st.hold && st.hold !== 'none') {
      const useBack = st.arm === 'call';
      const p = useBack ? bArm.p : fArm.p;
      held = item(st.hold === 'phone' && st.arm === 'call' ? 'phone' : st.hold, p.hx, p.hy, def);
    }

    // ---- head ----
    const hs = T.head * 1.2;
    const headY = sy - 124 - (T.kid ? 8 : 0);
    const tilt = (st.tilt || 0) + Math.sin(t * 1.1 + phase) * 1.2 + (st.talk || 0) * 2.5;
    let head = '';
    if (def.hair === 'hijab') {
      head += hijab(def, skin);
    } else {
      head += hairBack(def);
      head += `<ellipse cx="-56" cy="6" rx="15" ry="21" fill="${skin}" stroke="${OL}" stroke-width="5"/><path d="M-58 0 q-6 8 0 14" fill="none" stroke="${U.shade(skin, -0.3)}" stroke-width="4"/>`;
      head += `<path d="M2 -82 C50 -82 74 -48 74 -6 C74 42 52 80 10 84 C-40 86 -70 52 -70 0 C-70 -50 -46 -82 2 -82 Z" fill="${skin}" stroke="${OL}" stroke-width="5"/>`;
      head += `<path d="M-70 0 C-70 52 -40 86 10 84 C-24 76 -46 46 -50 6 C-52 -30 -40 -58 -20 -76 C-50 -66 -70 -40 -70 0 Z" fill="#000" opacity="0.07"/>`;
    }
    // beard (under features)
    if (def.beard === 'stubble') head += `<path d="M-48 30 C-40 66 -10 84 14 84 C46 82 66 58 72 30 C60 52 40 64 14 66 C-12 66 -34 52 -48 30 Z" fill="#2A211C" opacity="0.16"/>`;
    if (def.beard === 'short_grey' || def.beard === 'full_black') {
      const bc = def.beard === 'short_grey' ? '#D8D2C8' : '#231C19';
      head += `<path d="M-52 24 C-44 74 -10 96 16 96 C52 94 72 64 74 26 C64 52 50 60 40 58 C30 52 0 52 -10 58 C-24 56 -40 46 -52 24 Z" fill="${bc}" stroke="${OL}" stroke-width="4"/>`;
    }
    head += face(Object.assign({ fem: T.fem }, def), st, skin);
    if (def.beard === 'moustache' || def.beard === 'short_grey' || def.beard === 'full_black') {
      const mc = def.beard === 'full_black' ? '#231C19' : (/grey|bald/.test(def.hair || '') ? '#D8D2C8' : '#231C19');
      head += `<path d="M10 36 Q30 26 50 36 Q46 46 30 40 Q16 46 10 36 Z" fill="${mc}" stroke="${OL}" stroke-width="3.5"/>`;
    }
    if (def.hair !== 'hijab') head += hairFront(def);
    if (def.glasses) head += `<g fill="none" stroke="${OL}" stroke-width="4.5"><rect x="-26" y="-20" width="34" height="28" rx="10"/><rect x="20" y="-22" width="40" height="30" rx="11"/><path d="M8 -8 Q14 -12 20 -8 M-26 -8 L-54 -4"/></g><g fill="#FFFFFF" opacity="0.25"><rect x="24" y="-18" width="10" height="8" rx="3"/></g>`;
    if (def.cap) head += `<path d="M-60 -48 C-50 -96 52 -100 66 -46 Q2 -64 -60 -48 Z" fill="#FBF8F1" stroke="${OL}" stroke-width="5"/><path d="M-40 -66 Q4 -78 50 -64" fill="none" stroke="#D9D2C2" stroke-width="3"/>`;
    if (def.teep) head += `<circle cx="20" cy="-36" r="5" fill="#C4473A"/>`;
    const headG = `<g transform="translate(${hunch * 4},${headY + breathe}) rotate(${tilt}) scale(${hs})">${head}</g>`;

    // ---- assemble (facing right) ----
    const shadow = `<ellipse cx="${sitting ? 60 : 4}" cy="0" rx="${sitting ? 150 : 108}" ry="16" fill="#000" opacity="0.16"/>`;
    let inner = shadow;
    if (sitting && st.seat !== 'none') {
      const wc = '#8A5A36', wd = '#6B4326', seatY = hipY + 24;
      inner += `<g stroke="${OL}" stroke-width="5" stroke-linejoin="round">` +
        `<rect x="${-hip - 44}" y="${seatY - 300}" width="30" height="${300 - seatY + seatY}" rx="8" fill="${wd}"/>` +
        `<rect x="${hip + 96}" y="${seatY}" width="24" height="${-seatY}" rx="6" fill="${wd}"/>` +
        `<rect x="${-hip - 36}" y="${seatY}" width="24" height="${-seatY}" rx="6" fill="${wd}"/>` +
        `<rect x="${-hip - 50}" y="${seatY}" width="${hip * 2 + 180}" height="30" rx="8" fill="${wc}"/></g>`;
    }
    if (A.crossed) {
      inner += legs + torso + neck + headG + bArm.s + fArm.s;
    } else {
      inner += bArm.s + legs + torso + neck + headG + fArm.s + held;
    }
    if (A.crossed && held) inner += held;
    const flip = st.face === 'left' ? -1 : 1;
    const s = (st.scale || 1) * T.h;
    const pop = st.pop || 0;
    const sc = s * (1 + pop * 0.03);
    return `<g transform="translate(${st.x},${st.y}) scale(${sc * flip},${sc}) rotate(${hunch * 0.6})" opacity="${st.alpha == null ? 1 : st.alpha}">${inner}</g>`;
  }

  // world-space head position (for camera focus / bubbles)
  function headPos(def, st) {
    const T = TYPES[def.type] || TYPES.man;
    const s = (st.scale || 1) * T.h;
    const dy = st.pose === 'sit' ? 130 : 0;
    return { x: st.x + (st.face === 'left' ? -1 : 1) * 10 * s, y: st.y + (-737 + dy) * s, s };
  }

  g.CHAR = { render, headPos, ARMS, TYPES, SKIN };
})(window);
