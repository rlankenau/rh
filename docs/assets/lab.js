// Shared numerics and plotting for the companion-site labs.
// Everything is computed in the browser from definitions; nothing is precomputed.
(function (root) {
  'use strict';

  // ---- primes -------------------------------------------------------------
  // Imaginary parts of the first 30 nontrivial zeros of the Riemann zeta function.
  var ZEROS = [14.134725, 21.022040, 25.010858, 30.424876, 32.935062, 37.586178, 40.918719, 43.327073,
    48.005151, 49.773832, 52.970321, 56.446248, 59.347044, 60.831779, 65.112544, 67.079811, 69.546402,
    72.067158, 75.704691, 77.144840, 79.337375, 82.910381, 84.735493, 87.425275, 88.809111, 92.491899,
    94.651344, 95.870634, 98.831194, 101.317851];
  var NMAX = 20000, EULER = 0.5772156649015329, LOG2PI = Math.log(2 * Math.PI);
  var lam = new Float64Array(NMAX + 1), psiP = new Float64Array(NMAX + 1), aP = new Float64Array(NMAX + 1),
    piP = new Int32Array(NMAX + 1), primes = [];
  (function () {
    var comp = new Uint8Array(NMAX + 1), p, q, pk, n;
    for (p = 2; p <= NMAX; p++) if (!comp[p]) {
      primes.push(p);
      for (q = 2 * p; q <= NMAX; q += p) comp[q] = 1;
      for (pk = p; pk <= NMAX; pk *= p) lam[pk] = Math.log(p);
    }
    for (n = 1; n <= NMAX; n++) {
      psiP[n] = psiP[n - 1] + lam[n];
      aP[n] = aP[n - 1] + lam[n] / n;
      piP[n] = piP[n - 1] + (n > 1 && !comp[n] ? 1 : 0);
    }
  })();

  function psi(x) { return psiP[Math.min(NMAX, Math.floor(x))]; }
  function primePi(x) { return piP[Math.min(NMAX, Math.floor(x))]; }
  // Smoothed prime error Gz(x) = sum Lambda(n)(x/n - 1) - x log x + (1 + gamma) x.
  function gz(x) { var f = Math.floor(x); return x * aP[f] - psiP[f] - x * Math.log(x) + (1 + EULER) * x; }
  // Explicit formula for psi using the first K pairs of zeros.
  function psiWaves(x, K) {
    var s = x - LOG2PI - 0.5 * Math.log(1 - 1 / (x * x)), lx = Math.log(x), r = 2 * Math.sqrt(x), i, g;
    for (i = 0; i < K; i++) { g = ZEROS[i]; s -= r * (0.5 * Math.cos(g * lx) + g * Math.sin(g * lx)) / (0.25 + g * g); }
    return s;
  }
  // (Gz(x) - log 2pi)/sqrt(x) rebuilt from the first K pairs of zeros.
  function gzWaves(x, K) {
    var s = 0, lx = Math.log(x), i, g;
    for (i = 0; i < K; i++) { g = ZEROS[i]; s += 2 * Math.cos(g * lx) / (0.25 + g * g); }
    return s;
  }
  // Logarithmic integral from 2: Simpson's rule per unit interval, tabulated at the integers.
  function simpson(a, b) { return (b - a) * (1 / Math.log(a) + 4 / Math.log((a + b) / 2) + 1 / Math.log(b)) / 6; }
  var liP = new Float64Array(NMAX + 1);
  (function () { for (var n = 3; n <= NMAX; n++) liP[n] = liP[n - 1] + simpson(n - 1, n); })();
  function li(x) {
    if (x <= 2) return 0;
    var f = Math.min(NMAX, Math.floor(x));
    return liP[f] + (x > f ? simpson(f, x) : 0);
  }

  // ---- zeta ---------------------------------------------------------------
  // Borwein's alternating-series algorithm; good to many digits for |Im s| up to about 70.
  var BN = 70, bd = (function () {
    var d = new Float64Array(BN + 1), term = 1 / BN, sum = term, i;
    d[0] = BN * sum;
    for (i = 1; i <= BN; i++) { term *= 4 * (BN + i - 1) * (BN - i + 1) / ((2 * i) * (2 * i - 1)); sum += term; d[i] = BN * sum; }
    return d;
  })();
  // Returns [re, im] of zeta(sigma + i t), for sigma > 0 and s != 1.
  function zeta(sigma, t) {
    var re = 0, im = 0, k, c, l, m, sgn = 1;
    for (k = 0; k < BN; k++) {
      c = sgn * (bd[k] - bd[BN]) / bd[BN]; l = Math.log(k + 1); m = Math.exp(-sigma * l);
      re += c * m * Math.cos(t * l); im -= c * m * Math.sin(t * l); sgn = -sgn;
    }
    var p = Math.exp((1 - sigma) * Math.LN2), dr = 1 - p * Math.cos(t * Math.LN2), di = p * Math.sin(t * Math.LN2), q = dr * dr + di * di;
    return [-(re * dr + im * di) / q, -(im * dr - re * di) / q];
  }
  function zetaAbs(sigma, t) { var z = zeta(sigma, t); return Math.hypot(z[0], z[1]); }

  // ---- helpers ------------------------------------------------------------
  function sample(a, b, n, log, f) {
    var o = [], i, u, x;
    for (i = 0; i <= n; i++) { u = i / n; x = log ? a * Math.pow(b / a, u) : a + (b - a) * u; o.push([x, f(x)]); }
    return o;
  }
  // Staircase of an integer-step function f on [a, b]: one vertical riser wherever f changes.
  function steps(a, b, f) {
    var prev = f(a), o = [[a, prev]], n, v;
    for (n = a + 1; n <= b; n++) { v = f(n); if (v !== prev) { o.push([n, prev]); o.push([n, v]); prev = v; } }
    o.push([b, prev]);
    return o;
  }
  // Round tick values from lo to hi, about n of them; with cover, the last tick is >= hi.
  function ticks(lo, hi, n, cover) {
    var raw = (hi - lo) / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag,
      step = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * mag, o = [], v;
    for (v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) o.push(+v.toFixed(10));
    if (cover && o[o.length - 1] < hi) o.push(+(o[o.length - 1] + step).toFixed(10));
    return o;
  }
  function fmt(v, dp) { return Math.abs(v) >= 1000 ? Math.round(v).toLocaleString() : v.toFixed(dp == null ? 2 : dp); }

  // ---- plotting -----------------------------------------------------------
  // plot(id, {x:[a,b], y:[c,d], log, xt, yt, xl, xn, dp, h, notip, series:[{n,c,pts,dash}], refs:[{y,t,dy}], vlines:[{x,t}], marks:[{x,y,c}]})
  // Draws into the <svg> inside #id and keeps a crosshair + tooltip on it. Call again to redraw.
  function plot(id, o) {
    var box = document.getElementById(id), sv = box.querySelector('svg'), tip = box.querySelector('.tip');
    var W = 640, H = o.h || 260, l = 52, r = 14, t = 12, b = 34;
    var fx = o.log ? Math.log : function (v) { return v; }, a = fx(o.x[0]), w = fx(o.x[1]) - a;
    function sx(v) { return Math.max(l, Math.min(W - r, l + (fx(v) - a) / w * (W - l - r))); }
    function sy(v) { return Math.max(t, Math.min(H - b, t + (o.y[1] - v) / (o.y[1] - o.y[0]) * (H - t - b))); }
    var s = '';
    o.yt.forEach(function (v) {
      s += '<line class="gr" x1="' + l + '" x2="' + (W - r) + '" y1="' + sy(v) + '" y2="' + sy(v) + '"/><text class="tk" text-anchor="end" x="' + (l - 6) + '" y="' + (sy(v) + 4) + '">' + (o.yf ? o.yf(v) : v) + '</text>';
    });
    o.xt.forEach(function (v) { s += '<text class="tk" text-anchor="middle" x="' + sx(v) + '" y="' + (H - b + 16) + '">' + (o.xf ? o.xf(v) : v.toLocaleString()) + '</text>'; });
    s += '<text class="tk" text-anchor="end" x="' + (W - r) + '" y="' + (H - 3) + '">' + (o.xl || '') + '</text>';
    (o.vlines || []).forEach(function (f) {
      if (fx(f.x) < a || fx(f.x) > a + w) return;
      s += '<line class="rf" x1="' + sx(f.x) + '" x2="' + sx(f.x) + '" y1="' + t + '" y2="' + (H - b) + '"/>' + (f.t ? '<text class="tk" text-anchor="middle" x="' + sx(f.x) + '" y="' + (t + 10) + '">' + f.t + '</text>' : '');
    });
    (o.refs || []).forEach(function (f) {
      s += '<line class="rf" x1="' + l + '" x2="' + (W - r) + '" y1="' + sy(f.y) + '" y2="' + sy(f.y) + '"/><text class="tk" x="' + (l + 6) + '" y="' + (sy(f.y) + (f.dy || -5)) + '">' + f.t + '</text>';
    });
    o.series.forEach(function (se) {
      var d = '', pen = false;  // a point whose value is not finite leaves a gap in the line
      se.pts.forEach(function (p) { if (!isFinite(p[1])) { pen = false; return; } d += (pen ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1); pen = true; });
      s += '<path d="' + d + '" style="fill:none;stroke:' + se.c + ';stroke-width:2;stroke-linejoin:round' + (se.dash ? ';stroke-dasharray:6 4' : '') + '"/>';
    });
    (o.marks || []).forEach(function (m) {
      if (fx(m.x) < a || fx(m.x) > a + w) return;
      s += '<circle cx="' + sx(m.x) + '" cy="' + sy(m.y) + '" r="4" style="fill:' + (m.c || 'var(--fg)') + ';stroke:var(--panel);stroke-width:2"/>';
    });
    s += '<line class="ch" y1="' + t + '" y2="' + (H - b) + '" style="visibility:hidden"/>';
    sv.setAttribute('viewBox', '0 0 ' + W + ' ' + H); sv.innerHTML = s;
    box._o = o; box._g = { l: l, r: r, W: W, a: a, w: w };
    if (box._h) return; box._h = 1;
    box.addEventListener('pointermove', function (e) {
      var o = box._o, g = box._g, rc = sv.getBoundingClientRect(), px = (e.clientX - rc.left) / rc.width * g.W, ch = sv.querySelector('.ch');
      if (o.notip || px < g.l || px > g.W - g.r) { tip.hidden = true; ch.style.visibility = 'hidden'; return; }
      var u = g.a + (px - g.l) / (g.W - g.l - g.r) * g.w, x = o.log ? Math.exp(u) : u;
      var h = '<b>' + (o.xn || 'x') + ' = ' + (o.log ? fmt(x, x < 100 ? 1 : 0) : fmt(x, o.xdp == null ? 1 : o.xdp)) + '</b>';
      o.series.forEach(function (se) {
        var v = se.pts[0][1], i, p, q;
        for (i = 0; i < se.pts.length && se.pts[i][0] <= x; i++) v = se.pts[i][1];
        // between two samples, read the value off the drawn line
        if (i > 0 && i < se.pts.length) { p = se.pts[i - 1]; q = se.pts[i]; if (q[0] > p[0]) v = p[1] + (q[1] - p[1]) * (x - p[0]) / (q[0] - p[0]); }
        h += '<span><i style="background:' + se.c + '"></i>' + se.n + ': ' + (isFinite(v) ? fmt(v, o.dp) : '—') + '</span>';
      });
      tip.innerHTML = h; tip.hidden = false;
      var bx = e.clientX - rc.left;
      if (bx > rc.width / 2) { tip.style.left = 'auto'; tip.style.right = (rc.width - bx + 12) + 'px'; } else { tip.style.right = 'auto'; tip.style.left = (bx + 12) + 'px'; }
      ch.setAttribute('x1', px); ch.setAttribute('x2', px); ch.style.visibility = 'visible';
    });
    box.addEventListener('pointerleave', function () { tip.hidden = true; var ch = sv.querySelector('.ch'); if (ch) ch.style.visibility = 'hidden'; });
  }

  // Wire range inputs to a redraw function: bind({k1: 'out1', ...}, draw) sets each <output> and redraws.
  function bind(ids, draw) {
    function go() {
      var v = {};
      Object.keys(ids).forEach(function (k) { var el = document.getElementById(k); v[k] = +el.value; var out = document.getElementById(k + 'v'); if (out) out.textContent = ids[k] ? ids[k](v[k]) : v[k]; });
      draw(v);
    }
    Object.keys(ids).forEach(function (k) { document.getElementById(k).addEventListener('input', go); });
    go();
  }

  var Lab = { ZEROS: ZEROS, NMAX: NMAX, EULER: EULER, LOG2PI: LOG2PI, primes: primes, lam: lam, psiP: psiP,
    psi: psi, primePi: primePi, gz: gz, psiWaves: psiWaves, gzWaves: gzWaves, li: li, zeta: zeta, zetaAbs: zetaAbs,
    sample: sample, steps: steps, ticks: ticks, fmt: fmt, plot: plot, bind: bind };
  if (typeof module !== 'undefined' && module.exports) module.exports = Lab; else root.Lab = Lab;
})(typeof window !== 'undefined' ? window : this);
