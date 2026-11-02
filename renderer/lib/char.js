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
      const rx = 11.5 * scale, ry = 12 * open;
      if (blink > 0.55 || mood === 'happy') {
        // closed / happy arc
        const curve = mood === 'happy' ? -9 : 3;
        return `<path d="M${x - rx} -1 Q${x} ${-1 + curve} ${x + rx} -1" fill="none" stroke="${OL}" stroke-width="5" stroke-linecap="round"/>`;
      }
      let s = `<ellipse cx="${x}" cy="0" rx="${rx}" ry="${ry}" fill="#FFFDF8" stroke="${OL}" stroke-width="3.5"/>` +
        `<circle cx="${x + look * scale}" cy="${2 + lookY}" r="${7.2 * scale}" fill="#2B1A12"/>` +
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

  // ---------- body (v2: tapered limbs, real hands/feet, tailored clothes, natural motion) ----------
  const LW = 4.5;                       // outline width
  function cap(ax, ay, bx, by, wa, wb) { // tapered capsule between two joints
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, ra = wa / 2, rb = wb / 2;
    return `M${ax + nx * ra} ${ay + ny * ra} L${bx + nx * rb} ${by + ny * rb} A${rb} ${rb} 0 0 0 ${bx - nx * rb} ${by - ny * rb} L${ax - nx * ra} ${ay - ny * ra} A${ra} ${ra} 0 0 0 ${ax + nx * ra} ${ay + ny * ra} Z`;
  }
  const P = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" stroke="${OL}" stroke-width="${LW}" stroke-linejoin="round" ${extra}/>`;
  function hand(x, y, ang, r, skin) {   // mitten hand pointing along the forearm, thumb toward the facing side
    return `<g transform="translate(${x},${y}) rotate(${-ang})">` +
      `<path d="M${-r * 0.78} ${-r * 0.2} C${-r * 0.95} ${r * 0.9} ${-r * 0.55} ${r * 1.75} 0 ${r * 1.75} C${r * 0.6} ${r * 1.75} ${r * 0.9} ${r * 0.95} ${r * 0.74} ${-r * 0.2} Z" fill="${skin}" stroke="${OL}" stroke-width="${LW}" stroke-linejoin="round"/>` +
      `<path d="M${r * 0.55} ${r * 0.15} C${r * 1.25} ${r * 0.25} ${r * 1.3} ${r * 0.9} ${r * 0.85} ${r * 1.05}" fill="${skin}" stroke="${OL}" stroke-width="${LW - 0.5}" stroke-linecap="round"/>` +
      `<path d="M${-r * 0.3} ${r * 1.15} V${r * 1.55} M${r * 0.1} ${r * 1.2} V${r * 1.62}" stroke="${U.shade(skin, -0.3)}" stroke-width="2.5" stroke-linecap="round"/></g>`;
  }
  function foot(x, y, kind, skin, col) {  // y = ankle; sole sits on the floor (y = 0 when standing)
    const g0 = y + 30;
    if (kind === 'sandal') {
      return `<path d="M${x - 18} ${y - 4} Q${x - 26} ${g0 - 4} ${x - 10} ${g0 - 4} L${x + 50} ${g0 - 6} Q${x + 60} ${g0 - 10} ${x + 48} ${g0 - 18} Q${x + 20} ${y + 6} ${x + 10} ${y - 6} Z" fill="${skin}" stroke="${OL}" stroke-width="${LW}" stroke-linejoin="round"/>` +
        `<path d="M${x - 22} ${g0 - 2} H${x + 58}" stroke="#4A3226" stroke-width="7" stroke-linecap="round"/><path d="M${x + 12} ${g0 - 22} Q${x + 30} ${g0 - 8} ${x + 44} ${g0 - 20}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round"/>`;
    }
    const c = kind === 'sneaker' ? '#F4F1EA' : '#2E2420';
    return `<path d="M${x - 22} ${y - 8} Q${x - 28} ${g0} ${x - 8} ${g0} L${x + 54} ${g0} Q${x + 66} ${g0 - 4} ${x + 58} ${g0 - 16} Q${x + 36} ${y + 2} ${x + 12} ${y - 10} Z" fill="${c}" stroke="${OL}" stroke-width="${LW}" stroke-linejoin="round"/>` +
      (kind === 'sneaker' ? `<path d="M${x - 10} ${g0 - 8} H${x + 56}" stroke="${col}" stroke-width="6"/>` : `<path d="M${x + 30} ${g0 - 14} Q${x + 46} ${g0 - 18} ${x + 54} ${g0 - 12}" stroke="#5A4A42" stroke-width="3" fill="none"/>`);
  }

  function render(def, st) {
    const T = TYPES[def.type] || TYPES.man;
    const skin = SKIN[def.skin] || SKIN.wheat;
    const col = def.color || '#C4473A';
    const col2 = def.color2 || U.shade(col, -0.25);
    const outfit = def.outfit || 'shirt';
    const t = st.t || 0;
    const phase = U.hash(def.name || def.type) * 6.28;
    const talk = st.talk || 0, talking = talk > 0.05;
    const breathe = Math.sin(t * 1.6 + phase) * 2.5;
    const sitting = st.pose === 'sit', walking = st.pose === 'walk';
    const dy = sitting ? 130 : 0;
    const sh = T.sh * 0.94, hip = T.hip * 0.96;
    const fem = T.fem, kid = T.kid;
    const tucked = (outfit === 'shirt' && (def.type === 'man' || def.type === 'old_man')) || outfit === 'uniform';
    // trousers / leg colours
    let pants = '#36435C';
    if (outfit === 'panjabi') pants = '#F1ECE2';
    if (outfit === 'uniform') pants = col2;
    if (outfit === 'salwar') pants = U.mix(col, '#FFFFFF', 0.5);
    if (outfit === 'scrub') pants = col;
    if (outfit === 'tshirt') pants = kid ? '#3E5C8A' : '#3B4A63';
    if (outfit === 'shirt' && def.type === 'old_man') pants = '#5B5A55';
    const footKind = (outfit === 'panjabi' || outfit === 'sari' || outfit === 'salwar' || T.old) ? 'sandal' : (kid || outfit === 'tshirt' || outfit === 'uniform') ? 'sneaker' : 'shoe';
    const strap = fem ? U.shade(col, -0.2) : '#5A3A28';

    // ---- legs (two-bone, walk cycle with knee bend; feet stay on the floor) ----
    const hipY0 = -380 + dy, Lt = 172, Ls = 172;
    const w = t * 7 + phase;
    const legsGeo = [-hip * 0.42, hip * 0.42].map((x, i) => {
      if (sitting) { const kx = x + 160, ky = hipY0 + 12; return { x, k: [kx, ky], a: [kx + 6, -30] }; }
      const ph = w + i * Math.PI;
      const a = walking ? Math.sin(ph) * 21 : (i ? 2.5 : -2.5);
      const kb = walking ? Math.max(0, Math.cos(ph)) * 34 : 0;
      const r = Math.PI / 180;
      const kx = x + Math.sin(a * r) * Lt, ky = hipY0 + Math.cos(a * r) * Lt;
      const a2 = a - kb;
      return { x, k: [kx, ky], a: [kx + Math.sin(a2 * r) * Ls, ky + Math.cos(a2 * r) * Ls] };
    });
    // drop the body so the lowest foot touches the floor
    const drop = sitting ? 0 : (-30 - Math.max(...legsGeo.map(l => l.a[1])));
    legsGeo.forEach(l => { if (!sitting) { l.k[1] += drop; l.a[1] += drop; } });
    const hipY = hipY0 + drop;
    let legs = '', back = '';
    const lw = fem ? [64, 52, 40] : kid ? [58, 50, 42] : [66, 56, 46];
    if (outfit === 'sari') {
      const sw = walking ? Math.sin(w) * 10 : 0;
      const top = hipY - 30, hem = sitting ? -6 : -14;
      if (sitting) {
        legs += P(`M${-hip} ${top} L${hip + 10} ${top} Q${hip + 175} ${top + 6} ${hip + 178} ${top + 46} L${hip + 182} ${hem} L${hip + 30} ${hem} L${hip + 30} ${top + 60} L${-hip} ${top + 70} Z`, col);
        legs += `<path d="M${hip + 34} ${hem - 22} L${hip + 182} ${hem - 22}" stroke="${col2}" stroke-width="18"/><path d="M${hip + 34} ${hem - 33} L${hip + 182} ${hem - 33}" stroke="#E8C66A" stroke-width="4"/>`;
        legs += foot(hip + 150, -30, 'sandal', skin, strap);
      } else {
        legsGeo.forEach(l => { legs += foot(l.a[0] - 6, l.a[1], 'sandal', skin, strap); });
        legs += P(`M${-hip - 4} ${top} C${-hip - 10} ${top + 120} ${-hip - 24 + sw} ${hem - 90} ${-hip - 30 + sw} ${hem} L${hip + 34 + sw} ${hem} C${hip + 26 + sw} ${hem - 90} ${hip + 12} ${top + 120} ${hip + 6} ${top} Z`, col);
        // front pleats fanning out
        for (let j = 0; j < 5; j++) legs += `<path d="M${6 + j * 9} ${top + 40} Q${10 + j * 14 + sw * 0.5} ${top + 200} ${2 + j * 20 + sw} ${hem - 4}" fill="none" stroke="${U.shade(col, -0.22)}" stroke-width="3.5"/>`;
        legs += `<path d="M${-hip - 28 + sw} ${hem - 22} L${hip + 32 + sw} ${hem - 22}" stroke="${col2}" stroke-width="20"/><path d="M${-hip - 26 + sw} ${hem - 35} L${hip + 30 + sw} ${hem - 35}" stroke="#E8C66A" stroke-width="4"/>`;
      }
    } else {
      legsGeo.forEach((l, i) => {
        const c = i === 1 ? pants : U.shade(pants, -0.12);
        legs += P(cap(l.x, hipY, l.k[0], l.k[1], lw[0], lw[1]), c) + P(cap(l.k[0], l.k[1], l.a[0], l.a[1], lw[1], lw[2]), c);
        if (outfit === 'salwar') legs += `<path d="M${l.a[0] - lw[2] / 2} ${l.a[1] - 18} h${lw[2]}" stroke="${col2}" stroke-width="6"/>`;
        else if (!sitting) legs += `<path d="M${l.x + 8} ${hipY + 40} L${l.k[0] + 8} ${l.k[1]}" stroke="${U.shade(c, -0.18)}" stroke-width="2.5" opacity="0.7"/>`;
        legs += foot(l.a[0] - 4, l.a[1], footKind, skin, footKind === 'sneaker' ? (kid ? '#C4473A' : '#2F7A6B') : strap);
      });
    }

    // ---- torso ----
    const sy = -620 + dy + drop + breathe * 0.4;          // shoulder line
    const waist = hipY + (tucked ? 6 : 0);
    let bottom = tucked ? waist : hipY + 46, flare = 6;
    if (outfit === 'panjabi') { bottom = -190 + dy + drop; flare = 22; }
    if (outfit === 'salwar') { bottom = -205 + dy + drop; flare = 26; }
    if (outfit === 'sari') { bottom = hipY - 40; flare = 0; }
    if (sitting && (outfit === 'panjabi' || outfit === 'salwar')) bottom = Math.min(bottom, hipY + 70);
    const tw = sh, bw = hip + flare, wx = fem ? hip * 0.86 : hip;   // waist narrower for women
    const tcol = outfit === 'sari' ? col2 : col;
    const body = `M${-tw + 14} ${sy - 2} C${-tw - 14} ${sy + 8} ${-tw - 8} ${sy + 110} ${-wx - 2} ${hipY - 30} L${-bw} ${bottom} Q0 ${bottom + 10} ${bw} ${bottom} L${wx + 2} ${hipY - 30} C${tw + 8} ${sy + 110} ${tw + 14} ${sy + 8} ${tw - 14} ${sy - 2} Q0 ${sy - 18} ${-tw + 14} ${sy - 2} Z`;
    let torso = P(body, tcol);
    torso += `<path d="M${-tw + 14} ${sy - 2} C${-tw - 14} ${sy + 8} ${-tw - 8} ${sy + 110} ${-wx - 2} ${hipY - 30} L${-bw} ${bottom} L${-bw + 30} ${bottom} C${-wx + 26} ${hipY - 60} ${-tw + 26} ${sy + 110} ${-tw + 40} ${sy + 4} Z" fill="#000" opacity="0.1"/>`;
    torso += `<path d="M${tw - 34} ${sy + 30} C${tw - 20} ${sy + 90} ${tw - 22} ${sy + 160} ${wx - 18} ${hipY - 50}" fill="none" stroke="#FFF" stroke-width="6" opacity="0.18" stroke-linecap="round"/>`;
    const fold = c => `stroke="${U.shade(c, -0.2)}" stroke-width="3" fill="none" stroke-linecap="round"`;
    if (outfit === 'shirt' || outfit === 'uniform') {
      torso += `<path d="M-30 ${sy - 10} L-4 ${sy + 34} L2 ${sy + 8} Z" fill="${U.shade(tcol, 0.12)}" stroke="${OL}" stroke-width="3.5" stroke-linejoin="round"/><path d="M34 ${sy - 10} L8 ${sy + 34} L2 ${sy + 8} Z" fill="${U.shade(tcol, 0.12)}" stroke="${OL}" stroke-width="3.5" stroke-linejoin="round"/>` +
        `<path d="M4 ${sy + 30} L6 ${bottom - 4}" ${fold(tcol)}/>` + [62, 118, 174].map(o => `<circle cx="13" cy="${sy + o}" r="3.8" fill="${U.shade(tcol, -0.35)}"/>`).join('') +
        `<path d="M36 ${sy + 64} h30 v26 q-15 6 -30 0 z" fill="none" ${fold(tcol)}/><path d="M-40 ${sy + 150} q16 14 30 6" ${fold(tcol)}/>`;
      if (outfit === 'uniform') torso += `<path d="M-4 ${sy + 30} l9 64 l9 -64 z" fill="${col2}" stroke="${OL}" stroke-width="3"/><rect x="-60" y="${sy + 80}" width="34" height="34" rx="4" fill="${U.shade(tcol, -0.08)}" stroke="${OL}" stroke-width="3"/>`;
      if (tucked) torso += `<rect x="${-wx - 2}" y="${waist - 16}" width="${wx * 2 + 4}" height="18" fill="#3A2A22" stroke="${OL}" stroke-width="3"/><rect x="10" y="${waist - 18}" width="22" height="22" rx="3" fill="#C9A44E" stroke="${OL}" stroke-width="3"/>`;
      else torso += `<path d="M${-bw + 6} ${bottom - 10} Q0 ${bottom - 2} ${bw - 6} ${bottom - 10}" ${fold(tcol)}/>`;
    } else if (outfit === 'tshirt') {
      torso += `<path d="M-30 ${sy - 8} Q2 ${sy + 22} 34 ${sy - 8}" fill="none" stroke="${OL}" stroke-width="4.5"/><path d="M-26 ${sy - 4} Q2 ${sy + 14} 30 ${sy - 4}" fill="none" stroke="${U.shade(tcol, -0.2)}" stroke-width="3"/>` +
        `<path d="M${-bw + 8} ${bottom - 12} Q0 ${bottom - 4} ${bw - 8} ${bottom - 12}" ${fold(tcol)}/><path d="M-30 ${sy + 160} q20 12 44 2" ${fold(tcol)}/>`;
    } else if (outfit === 'panjabi' || outfit === 'salwar') {
      const emb = outfit === 'panjabi' ? (def.color2 || '#C9A44E') : U.shade(col2, -0.1);
      torso += `<path d="M-24 ${sy - 10} Q2 ${sy + 6} 28 ${sy - 10}" fill="none" stroke="${OL}" stroke-width="4"/>` +
        `<path d="M12 ${sy - 2} L12 ${sy + 130}" stroke="${emb}" stroke-width="10"/><path d="M12 ${sy - 2} L12 ${sy + 130}" stroke="${OL}" stroke-width="1.5" stroke-dasharray="6 8"/>` +
        (outfit === 'panjabi' ? [30, 64, 98].map(o => `<circle cx="12" cy="${sy + o}" r="4.5" fill="#F4EDE1" stroke="${OL}" stroke-width="2"/>`).join('') : '') +
        `<path d="M${-bw + 7} ${bottom - 100} L${-bw + 9} ${bottom - 6}" stroke="${U.shade(tcol, -0.3)}" stroke-width="3"/><path d="M${bw - 7} ${bottom - 100} L${bw - 9} ${bottom - 6}" stroke="${U.shade(tcol, -0.3)}" stroke-width="3"/>` +
        `<path d="M${-bw + 8} ${bottom - 12} Q0 ${bottom - 2} ${bw - 8} ${bottom - 12}" stroke="${emb}" stroke-width="6" fill="none"/>` +
        `<path d="M-34 ${hipY - 20} q18 30 4 80 M30 ${hipY - 10} q-10 40 8 90" ${fold(tcol)}/>`;
      if (outfit === 'salwar') {
        // dupatta: V across the chest, tails falling behind both shoulders
        back += `<path d="M${-tw + 10} ${sy + 4} C${-tw - 30} ${sy + 160} ${-tw - 40} ${sy + 280} ${-tw - 26} ${sy + 380} L${-tw + 20} ${sy + 380} C${-tw + 10} ${sy + 260} ${-tw + 20} ${sy + 140} ${-tw + 40} ${sy + 4} Z" fill="${U.shade(col2, -0.1)}" stroke="${OL}" stroke-width="${LW}"/>`;
        torso += `<path d="M${-tw + 8} ${sy} Q${-tw + 40} ${sy + 110} 6 ${sy + 120} Q${tw - 30} ${sy + 110} ${tw - 4} ${sy - 4} L${tw + 10} ${sy + 34} Q${tw - 14} ${sy + 150} 6 ${sy + 160} Q${-tw + 24} ${sy + 150} ${-tw - 8} ${sy + 40} Z" fill="${col2}" stroke="${OL}" stroke-width="${LW}" stroke-linejoin="round"/>` +
          `<path d="M${-tw + 4} ${sy + 30} Q${-tw + 34} ${sy + 128} 6 ${sy + 140} Q${tw - 22} ${sy + 128} ${tw + 4} ${sy + 18}" fill="none" stroke="${U.shade(col2, -0.18)}" stroke-width="3"/>`;
      }
    } else if (outfit === 'sari') {
      // blouse is the torso (col2); anchal/pallu crosses from right hip to left shoulder, then falls down the back
      back += `<path d="M${-tw + 6} ${sy} C${-tw - 26} ${sy + 140} ${-tw - 36} ${sy + 300} ${-tw - 30} ${sy + 420} L${-tw + 22} ${sy + 430} C${-tw + 14} ${sy + 300} ${-tw + 24} ${sy + 140} ${-tw + 46} ${sy - 4} Z" fill="${U.shade(col, -0.08)}" stroke="${OL}" stroke-width="${LW}" stroke-linejoin="round"/>` +
        `<path d="M${-tw - 26} ${sy + 410} L${-tw + 18} ${sy + 418}" stroke="${col2}" stroke-width="16"/><path d="M${-tw - 26} ${sy + 396} L${-tw + 18} ${sy + 404}" stroke="#E8C66A" stroke-width="3.5"/>`;
      torso += `<path d="M${-tw + 4} ${sy + 2} L${-tw + 64} ${sy - 10} C${-10} ${sy + 120} ${hip - 10} ${hipY - 120} ${hip + 16} ${hipY - 30} L${hip - 50} ${hipY - 18} C${-30} ${hipY - 90} ${-tw + 20} ${sy + 120} ${-tw + 4} ${sy + 2} Z" fill="${col}" stroke="${OL}" stroke-width="${LW}" stroke-linejoin="round"/>` +
        `<path d="M${-tw + 56} ${sy - 4} C${-4} ${sy + 120} ${hip - 18} ${hipY - 120} ${hip + 8} ${hipY - 34}" fill="none" stroke="${col2}" stroke-width="9"/><path d="M${-tw + 44} ${sy + 4} C${-14} ${sy + 126} ${hip - 28} ${hipY - 114} ${hip - 4} ${hipY - 30}" fill="none" stroke="#E8C66A" stroke-width="3"/>` +
        `<path d="M${-tw + 30} ${sy + 60} q20 40 50 60 M${-tw + 50} ${sy + 150} q30 20 70 26" ${fold(col)}/>`;
    } else if (outfit === 'scrub') {
      torso += `<path d="M-30 ${sy - 8} L2 ${sy + 46} L34 ${sy - 8}" fill="none" stroke="${OL}" stroke-width="4.5" stroke-linejoin="round"/>` +
        `<path d="M30 ${sy + 120} h40 v34 h-40 z" fill="none" ${fold(tcol)}/><path d="M-50 ${sy + 4} Q-60 ${sy + 120} -20 ${sy + 150}" fill="none" stroke="#3A4651" stroke-width="5"/><circle cx="-20" cy="${sy + 156}" r="9" fill="#9AA6B2" stroke="${OL}" stroke-width="3"/>`;
    }
    // neck
    const neckW = fem ? 34 : kid ? 32 : 42;
    const neck = P(cap(2, sy + 4, 6, sy - 40, neckW, neckW - 4), skin) + `<path d="M${-neckW / 2 + 4} ${sy - 30} Q4 ${sy - 14} ${neckW / 2 + 6} ${sy - 30}" fill="none" stroke="${U.shade(skin, -0.25)}" stroke-width="5" opacity="0.6"/>`;

    // ---- arms ----
    const A = ARMS[st.arm] || ARMS.down;
    let aF = (st.armF || A.f).slice(), aB = (st.armB || A.b).slice();
    if (walking && (st.arm || 'down') === 'down') { const s = Math.sin(w) * 16; aF = [aF[0] - s, aF[1] - s * 1.2]; aB = [aB[0] + s, aB[1] + s * 1.2]; }
    if (talking && ['talk', 'point', 'hold', 'cross'].indexOf(st.arm) < 0 && !walking) aF = [aF[0] + Math.sin(t * 2.3 + phase) * 4, aF[1] + Math.sin(t * 2.3 + phase) * 8];
    if (talking && st.arm === 'talk') { const g2 = Math.sin(t * 4.2 + phase) * 9 * Math.min(1, talk * 3); aF = [aF[0] + g2 * 0.4, aF[1] + g2]; }
    const shortSleeve = ['tshirt', 'scrub', 'sari'].includes(outfit);
    const sleeve = outfit === 'sari' ? col2 : col;
    const k = fem ? 0.86 : 1;
    const L1 = 142, L2 = 130;
    const handR = (fem ? 17 : 19);
    const drawArm = (sx, a, isFront) => {
      const r = Math.PI / 180, sy0 = sy + 22;
      const ex = sx + L1 * Math.sin(a[0] * r), ey = sy0 + L1 * Math.cos(a[0] * r);
      const hx = ex + L2 * Math.sin(a[1] * r), hy = ey + L2 * Math.cos(a[1] * r);
      const sk = isFront ? skin : U.shade(skin, -0.1), c = isFront ? sleeve : U.shade(sleeve, -0.12);
      let s = '';
      if (!shortSleeve) {
        s += P(cap(sx, sy0, ex, ey, 52 * k, 42 * k), c) + P(cap(ex, ey, hx, hy, 42 * k, 36 * k), c);
        s += `<path d="${cap(ex + (hx - ex) * 0.86, ey + (hy - ey) * 0.86, hx, hy, 38 * k, 36 * k)}" fill="${U.shade(c, -0.15)}" opacity="0.9"/>`;
      } else {
        s += P(cap(sx, sy0, ex, ey, 40 * k, 34 * k), sk) + P(cap(ex, ey, hx, hy, 34 * k, 27 * k), sk);
        const mx = sx + (ex - sx) * (outfit === 'sari' ? 0.62 : 0.5), my = sy0 + (ey - sy0) * (outfit === 'sari' ? 0.62 : 0.5);
        s += P(cap(sx, sy0, mx, my, 56 * k, 48 * k), c);
        if (fem) s += `<circle cx="${hx}" cy="${hy}" r="${15}" fill="none" stroke="#E8C66A" stroke-width="5"/>`;   // churi
      }
      s += hand(hx, hy, a[1], handR, sk);
      const hc = { hx: hx + Math.sin(a[1] * r) * handR * 0.9, hy: hy + Math.cos(a[1] * r) * handR * 0.9 };
      return { s, p: hc };
    };
    const bArm = drawArm(-sh + 30, aB, false);
    const fArm = drawArm(sh - 30, aF, true);
    let held = '';
    if (st.hold && st.hold !== 'none') {
      const useBack = st.arm === 'call';
      const p = useBack ? bArm.p : fArm.p;
      held = item(st.hold === 'phone' && st.arm === 'call' ? 'phone' : st.hold, p.hx, p.hy, def);
    }

    // ---- head ----
    const hs = 0.92 * T.head;
    const headY = sy - 26 - 84 * hs + (T.old ? 6 : 0);
    const tilt = (st.tilt || 0) + Math.sin(t * 1.1 + phase) * 1.2 + (talking ? Math.sin(t * 3.4 + phase) * 2.2 * Math.min(1, talk * 2) : 0) + (walking ? Math.sin(w * 2) * 1 : 0);
    let head = '';
    if (def.hair === 'hijab') {
      head += hijab(def, skin);
    } else {
      head += hairBack(def);
      head += `<ellipse cx="-56" cy="6" rx="15" ry="21" fill="${skin}" stroke="${OL}" stroke-width="5"/><path d="M-58 0 q-6 8 0 14" fill="none" stroke="${U.shade(skin, -0.3)}" stroke-width="4"/>`;
      head += `<path d="M2 -82 C50 -82 72 -50 72 -8 C72 36 56 74 18 84 C-30 90 -68 56 -70 0 C-70 -50 -46 -82 2 -82 Z" fill="${skin}" stroke="${OL}" stroke-width="5"/>`;
      head += `<path d="M-70 0 C-68 56 -30 90 18 84 C-24 76 -46 46 -50 6 C-52 -30 -40 -58 -20 -76 C-50 -66 -70 -40 -70 0 Z" fill="#000" opacity="0.07"/>`;
      if (fem && !kid) head += `<circle cx="-56" cy="30" r="5" fill="#E8C66A" stroke="${OL}" stroke-width="2"/>`;   // earring
    }
    if (def.beard === 'stubble') head += `<path d="M-48 30 C-40 66 -10 86 18 84 C46 80 64 58 70 30 C60 52 40 64 14 66 C-12 66 -34 52 -48 30 Z" fill="#2A211C" opacity="0.16"/>`;
    if (def.beard === 'short_grey' || def.beard === 'full_black') {
      const bc = def.beard === 'short_grey' ? '#D8D2C8' : '#231C19';
      head += `<path d="M-52 24 C-44 74 -10 96 18 94 C52 90 70 62 72 26 C64 52 50 60 40 58 C30 52 0 52 -10 58 C-24 56 -40 46 -52 24 Z" fill="${bc}" stroke="${OL}" stroke-width="4"/>`;
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
    const hunch = T.old ? 6 : 0;
    const headG = `<g transform="translate(${hunch + 4},${headY + breathe * 0.6}) rotate(${tilt}) scale(${hs})">${head}</g>`;

    // ---- assemble (facing right) ----
    const shadow = `<ellipse cx="${sitting ? 60 : 8}" cy="0" rx="${sitting ? 150 : 100}" ry="15" fill="#000" opacity="0.18"/>`;
    let inner = shadow;
    if (sitting && st.seat !== 'none') {
      const wc = '#8A5A36', wd = '#6B4326', seatY = hipY0 + 26;
      inner += `<g stroke="${OL}" stroke-width="5" stroke-linejoin="round">` +
        `<rect x="${-hip - 44}" y="${seatY - 300}" width="30" height="300" rx="8" fill="${wd}"/>` +
        `<rect x="${hip + 96}" y="${seatY}" width="24" height="${-seatY}" rx="6" fill="${wd}"/>` +
        `<rect x="${-hip - 36}" y="${seatY}" width="24" height="${-seatY}" rx="6" fill="${wd}"/>` +
        `<rect x="${-hip - 50}" y="${seatY}" width="${hip * 2 + 180}" height="30" rx="8" fill="${wc}"/></g>`;
    }
    const sway = walking ? 0 : Math.sin(t * 0.7 + phase) * 0.6;
    const upper = (A.crossed ? '' : bArm.s) + back + legs + torso + neck + headG;
    inner += `<g transform="rotate(${sway} 0 0)">` + (A.crossed ? (back + legs + torso + neck + headG + bArm.s + fArm.s + held) : (upper + fArm.s + held)) + `</g>`;
    const flip = st.face === 'left' ? -1 : 1;
    const s = (st.scale || 1) * T.h;
    const pop = st.pop || 0;
    const sc = s * (1 + pop * 0.03);
    return `<g transform="translate(${st.x},${st.y}) scale(${sc * flip},${sc}) rotate(${hunch * 0.4})" opacity="${st.alpha == null ? 1 : st.alpha}">${inner}</g>`;
  }

  // world-space head position (for camera focus / bubbles)
  function headPos(def, st) {
    const T = TYPES[def.type] || TYPES.man;
    const s = (st.scale || 1) * T.h;
    const dy = st.pose === 'sit' ? 130 : 0;
    const hs = 0.92 * T.head;
    const rel = -620 + dy - 26 - 84 * hs;
    return { x: st.x + (st.face === 'left' ? -1 : 1) * 10 * s, y: st.y + rel * s, s };
  }

  g.CHAR = { render, headPos, ARMS, TYPES, SKIN };
})(window);
