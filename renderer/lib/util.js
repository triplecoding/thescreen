// The Screen — renderer utilities (deterministic: everything is a pure function of time)
(function (g) {
  const U = {};
  U.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.inv = (a, b, v) => (b === a ? 1 : U.clamp((v - a) / (b - a)));
  U.ease = {
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    elastic: t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
  };
  // progress of an animation that starts at `start` seconds and lasts `dur`
  U.prog = (t, start, dur, fn) => { const p = U.clamp((t - start) / dur); return fn ? fn(p) : p; };
  // seeded random
  U.hash = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };
  U.rand = (seed, i) => U.hash(seed + ':' + i);
  const BN = '০১২৩৪৫৬৭৮৯';
  U.bn = n => String(n).replace(/[0-9]/g, d => BN[+d]);
  U.en = s => String(s).replace(/[০-৯]/g, d => BN.indexOf(d));
  U.esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // *word* -> <em>word</em>; \n -> <br>
  U.rich = s => U.esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
  U.plain = s => String(s || '').replace(/\*/g, '');
  // animated number: interpolate between "from" and "to" which may contain Bangla digits, commas, units
  U.countUp = (from, to, p) => {
    const tn = parseFloat(U.en(to).replace(/[^0-9.]/g, ''));
    const fn = from == null ? 0 : parseFloat(U.en(from).replace(/[^0-9.]/g, '')) || 0;
    if (isNaN(tn)) return to;
    const v = Math.round(U.lerp(fn, tn, p));
    let s = v.toLocaleString('en-IN');
    const unit = U.en(to).replace(/[0-9.,\s]/g, '');
    const prefix = String(to).match(/^[^\d০-৯]*/)[0];
    const suffix = String(to).match(/[^\d০-৯,.]*$/)[0];
    return U.bn(prefix + s + suffix).replace(/\s+/g, ' ');
  };
  U.shade = (hex, amt) => { // amt -1..1 darken/lighten
    let c = hex.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join('');
    let r = parseInt(c.slice(0, 2), 16), gg = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    const f = v => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt);
    return '#' + [f(r), f(gg), f(b)].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
  };
  U.mix = (a, b, t) => {
    const p = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
    const A = p(a), B = p(b);
    return '#' + A.map((v, i) => Math.round(U.lerp(v, B[i], t)).toString(16).padStart(2, '0')).join('');
  };
  g.U = U;
})(window);
