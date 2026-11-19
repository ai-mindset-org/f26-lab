// карточка эстафеты под правую колонку LMS: живое состояние того же стола, без имён участников
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function sv(tag, at) { var e = document.createElementNS(NS, tag); Object.keys(at).forEach(function (k) { e.setAttribute(k, at[k]); }); return e; }
  function draw(S) {
    var lanes = (S.lanes || []).slice(0, 5), run = 0, laps = 0, pic = document.getElementById('pic');
    pic.replaceChildren();
    var step = lanes.length > 1 ? Math.min(20, 76 / (lanes.length - 1)) : 0, top = 50 - step * (lanes.length - 1) / 2;
    lanes.forEach(function (l, n) {
      var on = l.status === 'бежит', y = top + n * step, k = Math.min(l.laps || 0, 8), x = 24 + k * 17, i;
      if (on) run++; laps += l.laps || 0;
      pic.appendChild(sv('line', { x1: 16, y1: y, x2: 184, y2: y, stroke: '#f3f4f6' }));
      if (k) pic.appendChild(sv('line', { x1: 24, y1: y, x2: x, y2: y, stroke: on ? '#dc2626' : '#d1d5db', 'stroke-width': on ? 1 : .5, 'stroke-opacity': on ? .7 : 1 }));
      for (i = 0; i < k; i++) pic.appendChild(sv('circle', { cx: 24 + i * 17, cy: y, r: 2.5, fill: '#9ca3af' }));
      if (on) {
        pic.appendChild(sv('circle', { cx: x, cy: y, r: 9, fill: '#dc2626', 'fill-opacity': .12 }));
        pic.appendChild(sv('circle', { cx: x, cy: y, r: 4.5, fill: '#dc2626', class: 'run' }));
      } else {
        pic.appendChild(sv('circle', { cx: x, cy: y, r: 4.5, fill: '#fff', stroke: '#111827', 'stroke-width': 1.5 }));
        pic.appendChild(sv('circle', { cx: x, cy: y, r: 1.5, fill: '#111827' }));
      }
    });
    var tag = document.getElementById('tag'); tag.textContent = run ? 'идёт игра' : ''; tag.className = run ? 'run' : '';
    document.getElementById('st').textContent = lanes.length ? 'версий: ' + laps : 'стол пуст';
    if (S.lms) document.getElementById('go').href = S.lms;
    tell();
  }
  function tell() { if (window.parent !== window) window.parent.postMessage({ type: 'skill-relay:card-height', height: Math.ceil(document.body.getBoundingClientRect().height) }, '*'); }
  function load() { fetch('api/state', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(draw, function () { document.getElementById('st').textContent = 'нет связи'; }); }
  window.addEventListener('resize', tell);
  load(); setInterval(function () { if (!document.hidden) load(); }, 10000);
})();
