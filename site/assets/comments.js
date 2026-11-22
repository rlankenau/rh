// Comments are GitHub issues. Select text and choose "Comment", or use the button at the foot of the page;
// either opens a small box to type in. On the public site, sending opens GitHub's new-issue page with
// everything filled in. Under tools/review-server.py (local review mode) the issue is filed directly, and
// pages can be marked reviewed.
(function () {
  'use strict';
  var REPO = 'rlankenau/rh', main = document.querySelector('main'), up = document.documentElement.getAttribute('data-up') || '';
  if (!main) return;
  var parts = location.pathname.replace(/\/index\.html$/, '').split('/').filter(Boolean);
  var slug = up ? parts[parts.length - 1] : 'home', tag = '[' + slug + ']';
  var pageUrl = 'https://rlankenau.github.io/rh/' + (slug === 'home' ? '' : slug + '/'), local = false;

  // text of a node with each formula replaced by its LaTeX source
  function plain(el) {
    Array.prototype.forEach.call(el.querySelectorAll('.katex'), function (k) {
      var src = k.querySelector('annotation');
      k.parentNode.replaceChild(document.createTextNode(src ? ' $' + src.textContent + '$ ' : k.textContent), k);
    });
    return el.textContent.replace(/\s+/g, ' ').trim();
  }
  function section(node) {
    var hs = main.querySelectorAll('h2'), found = '', i;
    for (i = 0; i < hs.length; i++) if (node && (hs[i].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) found = plain(hs[i].cloneNode(true));
    return found;
  }
  function el(name, cls, text) { var e = document.createElement(name); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function post(path, data) {
    return fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Review': '1' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'failed'); return j; }); });
  }

  // ---- the comment box
  var box = el('div', 'cbox'); box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Comment');
  var quoteEl = el('blockquote'), area = el('textarea'), row = el('div', 'row'), send = el('button', 'send', 'Send'), cancel = el('button', '', 'Cancel'), note = el('span', 'note');
  area.rows = 4; area.placeholder = 'Your comment'; send.type = cancel.type = 'button';
  row.appendChild(send); row.appendChild(cancel); row.appendChild(note);
  box.appendChild(quoteEl); box.appendChild(area); box.appendChild(row); document.body.appendChild(box);
  var cur = null;
  function open(quote, node, top) {
    cur = { quote: quote, section: section(node) };
    quoteEl.textContent = quote.length > 220 ? quote.slice(0, 220) + '…' : quote; quoteEl.hidden = !quote;
    note.textContent = local ? 'Filed as a GitHub issue.' : 'Opens GitHub to post it.'; note.className = 'note';
    area.value = ''; send.disabled = false; box.hidden = false;
    var w = Math.min(420, document.documentElement.clientWidth - 16);
    box.style.width = w + 'px'; box.style.top = top + 'px';
    box.style.left = Math.max(8, window.scrollX + (document.documentElement.clientWidth - w) / 2) + 'px';
    var r = main.getBoundingClientRect(); if (r.width > w + 40) box.style.left = (window.scrollX + r.left) + 'px';
    area.focus();
  }
  function close() { box.hidden = true; cur = null; }
  cancel.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) close(); });
  send.addEventListener('click', function () {
    var text = area.value.trim(); if (!text || !cur) { area.focus(); return; }
    if (local) {
      send.disabled = true; note.textContent = 'Filing…';
      post('/__review/comment', { slug: slug, section: cur.section, quote: cur.quote, comment: text }).then(function (j) {
        add({ html_url: j.url, number: j.number, title: tag + ' ' + (cur.quote || text).slice(0, 70), comments: 0 }, true); close();
      }).catch(function (e) { send.disabled = false; note.textContent = 'Could not file it: ' + e.message; note.className = 'note bad'; });
      return;
    }
    var head = cur.quote || text, title = tag + ' ' + head.slice(0, 60) + (head.length > 60 ? '…' : ''),
      body = '**Page:** ' + pageUrl + '\n' + (cur.section ? '**Section:** ' + cur.section + '\n' : '') +
        (cur.quote ? '\n> ' + cur.quote.slice(0, 700) + (cur.quote.length > 700 ? '…' : '') + '\n' : '') + '\n' + text + '\n';
    window.open('https://github.com/' + REPO + '/issues/new?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body), '_blank');
    close();
  });
  area.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send.click(); });

  // ---- "Comment" button on a text selection
  var btn = el('button', 'cbtn', 'Comment'); btn.type = 'button'; btn.hidden = true; document.body.appendChild(btn);
  var held = null;
  function place() {
    var sel = window.getSelection(), text = sel && !sel.isCollapsed ? String(sel) : '';
    if (!text.trim() || !main.contains(sel.anchorNode) || !main.contains(sel.focusNode) || box.contains(sel.anchorNode)) { btn.hidden = true; held = null; return; }
    var r = sel.getRangeAt(0).getBoundingClientRect(), holder = el('div'); holder.appendChild(sel.getRangeAt(0).cloneContents());
    held = { text: plain(holder), node: sel.anchorNode, top: window.scrollY + r.bottom + 8 };
    btn.hidden = false; btn.style.top = held.top + 'px';
    btn.style.left = Math.max(8, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - btn.offsetWidth - 8)) + 'px';
  }
  document.addEventListener('selectionchange', function () { setTimeout(place, 0); });
  btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
  btn.addEventListener('click', function () { if (held) { var h = held; btn.hidden = true; open(h.text, h.node, h.top); } });

  // ---- footer: add a comment, and the open ones for this page
  var foot = el('section', 'comments'), h = el('h2', '', 'Comments'), p = el('p'), addBtn = el('button', 'add', 'Comment on this page'), hint = el('span', '', 'Or select any text on the page to comment on it.'), list = el('ul');
  addBtn.type = 'button'; p.appendChild(addBtn); p.appendChild(hint); foot.appendChild(h); foot.appendChild(p); foot.appendChild(list);
  var pager = main.querySelector('.pager, [role="navigation"]');
  if (pager) main.insertBefore(foot, pager); else main.appendChild(foot);
  addBtn.addEventListener('click', function () { open('', null, window.scrollY + addBtn.getBoundingClientRect().bottom + 8); });
  function add(it, first) {
    var li = el('li'), a = el('a', '', it.title.slice(tag.length).trim() || 'Comment #' + it.number), s = el('span', '', ' #' + it.number + (it.comments ? ' · ' + it.comments + (it.comments === 1 ? ' reply' : ' replies') : ''));
    a.href = it.html_url; a.target = '_blank'; a.rel = 'noopener'; li.appendChild(a); li.appendChild(s);
    if (first) list.insertBefore(li, list.firstChild); else list.appendChild(li);
  }
  if (!window.fetch) return;
  fetch('https://api.github.com/repos/' + REPO + '/issues?state=open&per_page=100').then(function (r) { return r.ok ? r.json() : []; }).then(function (all) {
    all.filter(function (it) { return !it.pull_request && it.title.indexOf(tag) === 0; }).forEach(function (it) { add(it); });
  }).catch(function () {});

  // ---- local review mode
  if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  fetch('/__review/ping').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !j.ok) return;
    local = true;
    var kicker = main.querySelector('.kicker'); if (!kicker || slug === 'home') return;
    var done = j.reviewed.indexOf(slug) >= 0, mark = el('button', 'rvbtn');
    function label() { mark.textContent = done ? 'Mark as needs review' : 'Mark as reviewed'; }
    label(); mark.type = 'button'; kicker.appendChild(mark);
    mark.addEventListener('click', function () {
      mark.disabled = true; mark.textContent = 'Saving…';
      post('/__review/reviewed', { slug: slug, reviewed: !done }).then(function () { location.reload(); })
        .catch(function (e) { mark.disabled = false; mark.textContent = 'Failed: ' + e.message; });
    });
  }).catch(function () {});
})();
