// End-of-part quizzes. Markup written in the chapter file:
//   <ol class="quiz" data-quiz="part-1"><li data-a="2"><p>Question</p><ul><li>option</li>…</ul><p class="why">…</p></li>…</ol>
// data-a is the 1-based index of the right option. Each option becomes a button; answering shows the explanation.
(function () {
  'use strict';
  Array.prototype.forEach.call(document.querySelectorAll('ol.quiz'), function (quiz) {
    var qs = Array.prototype.slice.call(quiz.children), key = 'quiz:' + quiz.getAttribute('data-quiz'), done = 0, right = 0;
    var bar = document.createElement('div'); bar.className = 'qbar'; bar.setAttribute('role', 'status');
    var score = document.createElement('span'), again = document.createElement('button');
    again.type = 'button'; again.textContent = 'Start again'; bar.appendChild(score); bar.appendChild(again);
    quiz.parentNode.insertBefore(bar, quiz.nextSibling);
    function best() { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
    function show() {
      var b = best(), t = done + ' of ' + qs.length + ' answered, ' + right + ' correct';
      if (done === qs.length) {
        if (!b || right > b) { try { localStorage.setItem(key, String(right)); } catch (e) {} b = right; }
        t = 'Score: ' + right + ' of ' + qs.length;
      }
      if (b !== null && b !== undefined) t += ' · best so far ' + b + ' of ' + qs.length;
      score.textContent = t;
    }
    qs.forEach(function (q) {
      var ans = +q.getAttribute('data-a'), why = q.querySelector('.why'), opts = Array.prototype.slice.call(q.querySelectorAll('ul > li'));
      var btns = opts.map(function (li, i) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'opt';
        while (li.firstChild) b.appendChild(li.firstChild);
        li.appendChild(b);
        b.addEventListener('click', function () {
          if (q.classList.contains('answered')) return;
          q.classList.add('answered'); done++;
          var ok = i + 1 === ans; if (ok) right++;
          b.classList.add(ok ? 'right' : 'wrong'); btns[ans - 1].classList.add('right');
          btns.forEach(function (x) { x.disabled = true; });
          var v = document.createElement('b'); v.className = 'verdict'; v.textContent = ok ? 'Correct. ' : 'Not quite. ';
          why.insertBefore(v, why.firstChild); why.hidden = false; show();
        });
        return b;
      });
      why.hidden = true;
      q.reset = function () {
        q.classList.remove('answered'); why.hidden = true;
        var v = why.querySelector('.verdict'); if (v) why.removeChild(v);
        btns.forEach(function (x) { x.disabled = false; x.classList.remove('right', 'wrong'); });
      };
    });
    again.addEventListener('click', function () { qs.forEach(function (q) { q.reset(); }); done = 0; right = 0; show(); quiz.scrollIntoView({ block: 'start' }); });
    show();
  });
})();
