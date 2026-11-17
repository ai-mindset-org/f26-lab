// карточка эстафеты для страницы лабы в LMS: живое состояние того же стола, без имён участников
(function () {
  var q = new URLSearchParams(location.search);
  if (q.get('theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function clock(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2); }
  function draw(S) {
    var lanes = S.lanes || [], skew = (S.now || Date.now() / 1000) - Date.now() / 1000, run = 0, laps = 0;
    var box = document.getElementById('lanes'); box.replaceChildren();
    lanes.slice(0, 5).forEach(function (l) {
      var on = l.status === 'бежит', row = el('div', 'ln'), tr = el('div', 'tr'), i;
      if (on) run++; laps += l.laps || 0;
      row.appendChild(el('b', '', l.title || l.skill));
      row.appendChild(el('em', on ? 'run' : '', on ? 'правят · ' + clock(l.until - Date.now() / 1000 - skew) : 'v' + l.laps + ' · свободен'));
      for (i = 0; i < Math.min(l.laps, 9); i++) { tr.appendChild(el('i')); tr.appendChild(el('u')); }
      tr.appendChild(el('i', 'ball' + (on ? ' run' : ''))); tr.appendChild(el('u', 'end'));
      row.appendChild(tr); box.appendChild(row);
    });
    var st = document.getElementById('st'); st.replaceChildren();
    [['skills на столе', lanes.length], ['версий', laps], ['правят сейчас', run]].forEach(function (x) { var s = el('span', '', x[0] + ' '); s.appendChild(el('b', '', String(x[1]))); st.appendChild(s); });
    document.getElementById('tag').textContent = run ? 'идёт игра' : 'стол свободен';
    if (S.lms) document.getElementById('go').href = S.lms;
    var d = new Date(); document.getElementById('upd').textContent = 'обновлено ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function load() { fetch('api/state', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(draw, function () { document.getElementById('tag').textContent = 'нет связи'; }); }
  load(); setInterval(function () { if (!document.hidden) load(); }, 10000);
})();
