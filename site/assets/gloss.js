// Pop-up glossary. Terms are <button class="g" data-g="key"> elements written by build.py;
// definitions come from window.GLOSSARY (assets/glossary.js). Hover previews, click or Enter pins.
(function () {
  'use strict';
  var G = window.GLOSSARY || {}, up = document.documentElement.getAttribute('data-up') || '', pop = null, owner = null, pinned = false, timer = 0;

  function close() {
    if (!pop) return;
    pop.hidden = true;
    if (owner) owner.setAttribute('aria-expanded', 'false');
    owner = null; pinned = false;
  }
  function open(btn, pin) {
    var e = G[btn.getAttribute('data-g')];
    if (!e) return;
    if (!pop) {
      pop = document.createElement('div'); pop.className = 'gpop'; pop.id = 'gpop'; pop.setAttribute('role', 'note');
      pop.addEventListener('pointerenter', function () { clearTimeout(timer); });
      pop.addEventListener('pointerleave', function () { if (!pinned) close(); });
      document.body.appendChild(pop);
    }
    if (owner && owner !== btn) owner.setAttribute('aria-expanded', 'false');
    owner = btn; pinned = pin; btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-describedby', 'gpop');
    pop.textContent = '';
    var h = document.createElement('b'); h.textContent = e.term; pop.appendChild(h);
    var p = document.createElement('p'); p.textContent = e.def; pop.appendChild(p);
    var links = document.createElement('div'); links.className = 'gl';
    if (e.wiki) { var w = document.createElement('a'); w.href = 'https://en.wikipedia.org/wiki/' + e.wiki; w.target = '_blank'; w.rel = 'noopener'; w.textContent = 'Wikipedia ↗'; links.appendChild(w); }
    var a = document.createElement('a'); a.href = up + 'glossary/#' + btn.getAttribute('data-g'); a.textContent = 'Glossary'; links.appendChild(a);
    pop.appendChild(links);
    pop.hidden = false;
    // Place below the term, kept inside the viewport; flip above if there is no room below.
    var r = btn.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight, vw = document.documentElement.clientWidth;
    var left = Math.max(8, Math.min(r.left, vw - pw - 8)), top = r.bottom + 6;
    if (top + ph > window.innerHeight - 8 && r.top - ph - 6 > 8) top = r.top - ph - 6;
    pop.style.left = (left + window.scrollX) + 'px'; pop.style.top = (top + window.scrollY) + 'px';
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.g');
    if (b) { if (owner === b && pinned) close(); else open(b, true); return; }
    if (pop && !pop.contains(ev.target)) close();
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && owner) { var b = owner; close(); b.focus(); } });
  document.addEventListener('pointerover', function (ev) {
    if (ev.pointerType !== 'mouse') return;
    var b = ev.target.closest && ev.target.closest('.g');
    if (b && !pinned) { clearTimeout(timer); open(b, false); }
  });
  document.addEventListener('pointerout', function (ev) {
    if (ev.pointerType !== 'mouse' || pinned) return;
    var b = ev.target.closest && ev.target.closest('.g');
    if (b) { clearTimeout(timer); timer = setTimeout(close, 250); }
  });
})();
