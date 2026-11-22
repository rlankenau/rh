// Comments are GitHub issues. Selecting text shows a "Comment" button that opens a new issue with the
// page, the section and the quoted selection filled in; the page footer lists the open issues for this page.
(function () {
  'use strict';
  var REPO = 'rlankenau/rh', main = document.querySelector('main'), up = document.documentElement.getAttribute('data-up') || '';
  if (!main) return;
  var parts = location.pathname.replace(/\/index\.html$/, '').split('/').filter(Boolean);
  var slug = up ? parts[parts.length - 1] : 'home', tag = '[' + slug + ']';
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
  function issueUrl(quote, node) {
    quote = (quote || '').replace(/\s+/g, ' ').trim();
    var sec = section(node), title = tag + ' ' + (quote ? quote.slice(0, 60) + (quote.length > 60 ? '…' : '') : ''),
      body = '**Page:** ' + location.origin + location.pathname + '\n' + (sec ? '**Section:** ' + sec + '\n' : '') +
        (quote ? '\n> ' + quote.slice(0, 700) + (quote.length > 700 ? '…' : '') + '\n' : '') + '\n<!-- Write your comment below this line. -->\n';
    return 'https://github.com/' + REPO + '/issues/new?labels=site-comment&title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
  }

  // floating button on a text selection
  var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'cbtn'; btn.textContent = 'Comment on this'; btn.hidden = true;
  document.body.appendChild(btn);
  var held = null;
  function place() {
    var sel = window.getSelection(), text = sel && !sel.isCollapsed ? String(sel) : '';
    if (!text.trim() || !main.contains(sel.anchorNode) || !main.contains(sel.focusNode)) { btn.hidden = true; held = null; return; }
    var r = sel.getRangeAt(0).getBoundingClientRect();
    var holder = document.createElement('div'); holder.appendChild(sel.getRangeAt(0).cloneContents());
    held = { text: plain(holder), node: sel.anchorNode };
    btn.hidden = false;
    btn.style.top = (window.scrollY + r.bottom + 8) + 'px';
    btn.style.left = Math.max(8, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - btn.offsetWidth - 8)) + 'px';
  }
  document.addEventListener('selectionchange', function () { setTimeout(place, 0); });
  btn.addEventListener('mousedown', function (e) { e.preventDefault(); });  // keep the selection
  btn.addEventListener('click', function () { if (held) window.open(issueUrl(held.text, held.node), '_blank', 'noopener'); });

  // footer: add a comment, and the open ones for this page
  var box = document.createElement('section'); box.className = 'comments';
  box.innerHTML = '<h2>Comments</h2><p><a class="add" target="_blank" rel="noopener">Comment on this page</a> ' +
    '<span>Opens a GitHub issue. Select any text on the page first to quote it.</span></p><ul></ul>';
  box.querySelector('.add').href = issueUrl('', null);
  var pager = main.querySelector('.pager, [role="navigation"]');
  if (pager) main.insertBefore(box, pager); else main.appendChild(box);
  var list = box.querySelector('ul');
  if (!window.fetch) return;
  fetch('https://api.github.com/repos/' + REPO + '/issues?state=open&per_page=100').then(function (r) { return r.ok ? r.json() : []; }).then(function (all) {
    all.filter(function (it) { return !it.pull_request && it.title.indexOf(tag) === 0; }).forEach(function (it) {
      var li = document.createElement('li'), a = document.createElement('a'), s = document.createElement('span');
      a.href = it.html_url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = it.title.slice(tag.length).trim() || 'Comment #' + it.number;
      s.textContent = ' #' + it.number + (it.comments ? ' · ' + it.comments + (it.comments === 1 ? ' reply' : ' replies') : '');
      li.appendChild(a); li.appendChild(s); list.appendChild(li);
    });
  }).catch(function () {});
})();
