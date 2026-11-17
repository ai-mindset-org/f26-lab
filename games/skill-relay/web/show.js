// прогон: один круг эстафеты по шагам. Сервер выполняет настоящие ходы на отдельном столе,
// страница показывает три окна участников и журнал. Чужой текст попадает на страницу только как текст.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function flat(a) { return a.reduce(function (r, x) { return r.concat(Array.isArray(x) ? flat(x) : [x]); }, []); }
  function h(tag, attrs) {
    var e = document.createElement(tag), k, v, i, kids = [];
    for (k in (attrs || {})) {
      v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (i = 2; i < arguments.length; i++) kids.push(arguments[i]);
    flat(kids).forEach(function (c) { if (c != null && c !== false) e.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c))); });
    return e;
  }
  function fill(el) {
    var kids = [], i;
    for (i = 1; i < arguments.length; i++) kids.push(arguments[i]);
    el.replaceChildren.apply(el, flat(kids).filter(function (c) { return c != null && c !== false; }));
    return el;
  }
  var q = new URLSearchParams(location.search), S = null, skew = 0, busy = false, auto = null, seen = {}, held = {}, first = true;
  try { if ((q.get('theme') || localStorage.getItem('relay.theme')) === 'dark') document.documentElement.setAttribute('data-theme', 'dark'); } catch (e) { }
  var two = function (n) { return (n < 10 ? '0' : '') + n; };
  var now = function () { return Date.now() / 1000 + skew; };
  function clock(sec) { sec = Math.max(0, Math.round(sec)); return two(Math.floor(sec / 60)) + ':' + two(sec % 60); }
  function api(method, path, body) {
    var o = { method: method, credentials: 'same-origin', headers: {} };
    if (body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    return fetch(path, o).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || ('ошибка ' + r.status)); return d; }); });
  }
  function how(e) { return e.via === 'агент' ? 'агент' + (e.agent ? ' ' + e.agent : '') : e.via; }

  function card(c) {
    if (!c) return h('div', { class: 'card' }, h('p', null, 'в руках пусто'));
    return h('div', { class: 'card' },
      h('h4', null, c.title + ' ', c.rule ? h('span', null, '· ' + c.rule) : null),
      c.note ? h('p', null, c.note) : null,
      c.tried ? h('p', null, h('b', null, 'примерил на: '), c.tried) : null,
      (c.candidates || []).map(function (x) { return h('p', null, h('b', null, x.rule + ' · ' + x.title + '. '), x.why); }),
      (c.errors || []).map(function (x) { return h('p', { class: 'stop' }, h('b', null, 'стоп. '), x); }),
      (c.facts || []).map(function (f) { return h('p', { class: 'stop' }, (f.line ? 'строка ' + f.line + ' · ' : '') + f.rule + (f.excerpt ? ': «' + f.excerpt + '»' : '')); }),
      c.diff && c.diff.length && !(c.errors || []).length ? h('div', { class: 'diff' }, c.diff.slice(0, 5).map(function (r) { return h('div', { class: r.op === '-' ? 'del' : 'add' }, (r.op === '-' ? '− ' : '+ ') + r.t); })) : null,
      c.verdict ? h('p', null, h('b', null, 'разбор: ' + c.verdict), c.by ? ' · ' + c.by : '') : null,
      c.comment ? h('p', null, c.comment) : null,
      c.by && !c.verdict ? h('p', null, c.by) : null);
  }
  function win(w) {
    var mine = w.lanes.filter(function (l) { return l.mine; })[0];
    var right = mine ? ['держит палочку · ', h('em', { 'data-until': mine.until }, clock(mine.until - now()))] :
      w.rest_until ? ['пауза ', h('em', { 'data-until': w.rest_until }, clock(w.rest_until - now()))] : (w.auth ? 'вход: ' + w.auth : 'входа нет');
    return h('div', { class: 'win' + (mine ? ' act' : '') },
      h('div', { class: 'bar' }, h('span', null, h('b', null, w.name), ' · ' + w.harness), h('span', null, right)),
      h('div', { class: 'ls' }, w.lanes.map(function (l) {
        var st = l.mine ? 'у тебя' : l.status === 'бежит' ? 'у ' + ({ 'Сова': 'Совы', 'Лис': 'Лиса', 'Ёж': 'Ежа' }[l.runner] || l.runner) : (l.why_not || '').indexOf('пауза') === 0 ? 'пауза' : 'свободна';
        var hop = l.mine && held[l.id] !== w.login && !first;
        return h('div', { class: 'wl' + (l.mine ? ' mine' : '') + (hop ? ' hop' : '') },
          h('span', { class: 'no' }, two(l.n)), h('span', { class: 't' }, l.title, h('i', null, l.laps + ' ' + plural(l.laps))), h('span', { class: 'st' }, st));
      })),
      card(w.card));
  }
  function plural(n) { return n % 10 === 1 && n % 100 !== 11 ? 'передача' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'передачи' : 'передач'; }
  function render() {
    var n = S.step, last = S.total - 1;
    $('ph').textContent = '{ шаг ' + two(n) + ' из ' + two(last) + ' }';
    $('title').replaceChildren(document.createTextNode(S.title), h('em', null, '.'));
    $('text').textContent = S.text;
    $('kick').textContent = '{ один круг по шагам · каждое действие настоящее · разбор: ' + (S.model || 'признаки без модели') + ' }';
    $('prev').disabled = busy || n === 0; $('next').disabled = busy || n === last;
    $('next').textContent = busy ? 'идёт шаг…' : n === last ? 'конец круга' : 'дальше →';
    fill($('wins'), S.windows.map(win));
    S.windows.forEach(function (w) { w.lanes.forEach(function (l) { if (l.mine) held[l.id] = w.login; else if (held[l.id] === w.login) delete held[l.id]; }); });
    fill($('log'), S.log.length ? S.log.map(function (e) {
      var d = new Date(e.at * 1000), id = e.at + e.who + e.what, fresh = !seen[id] && !first;
      seen[id] = 1;
      return h('div', { class: 'e' + (e.via === 'система' ? ' sys' : '') + (fresh ? ' new' : '') },
        h('span', null, two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds())),
        h('b', null, e.who),
        h('span', null, e.what + (e.lane ? ' · ' + e.lane : '') + ' ', h('i', null, '· через: '), e.via === 'агент' ? h('u', null, how(e)) : h('i', null, how(e))));
    }) : h('div', { class: 'e sys' }, h('span', null, '·'), h('b', null, 'система'), h('span', null, 'стол ждёт: никто не вошёл')));
    $('jlab').textContent = 'журнал стола · записей ' + S.log.length + ' · свежие сверху';
    fill($('files'), (S.files || []).length ? S.files.map(function (f) { return h('div', null, f); }) : h('div', null, 'на этом шаге стол не менялся'));
    fill($('chain'), S.chain.length ? [h('div', { class: 'lab' }, 'цепочка дорожки 01 · от чьего лица и через что'), S.chain.map(function (c) {
      return h('div', { class: 'c' }, h('b', null, 'передача ' + c.n + ' · ' + c.runner), h('span', null, ' · ' + c.rule + ' ' + c.rule_title), h('br'),
        h('span', null, 'правку прислал: ' + (c.via === 'агент' ? 'агент ' + c.agent : c.via) + ' · передал: человек, ' + c.passed + ' · вход: ' + c.auth), h('br'),
        h('span', null, 'разбор: ' + c.verdict + ' · ' + c.by + ' · −' + c.minus + ' / +' + c.plus + ' строк · версия ' + c.digest));
    })] : null);
    fill($('rail'), S.steps.map(function (t, i) {
      return h('button', { class: i < n ? 'past' : i === n ? 'now' : '', title: t, onclick: function () { go(i); } }, h('span', null, (innerWidth > 1180 || i === n) ? two(i) + ' ' + t : two(i)));
    }));
    $('auto').className = auto ? 'on' : '';
    first = false;
  }
  function take(d) { S = d; skew = d.now - Date.now() / 1000; fill($('err')); render(); }
  function go(n) {
    if (busy || !S) return Promise.resolve();
    busy = true; render();
    return api('POST', 'api/show/go', { to: n }).then(take, function (e) { fill($('err'), h('div', { class: 'msg' }, e.message)); })
      .then(function () { busy = false; render(); });
  }
  function load() { return api('GET', 'api/show').then(take, function (e) { fill($('err'), h('div', { class: 'msg' }, e.message === 'нет входа' ? 'Прогон открыт в деморежиме или после входа в эстафету.' : e.message)); }); }
  function stopAuto() { clearInterval(auto); auto = null; if (S) render(); }
  function toggleAuto() {
    if (auto) return stopAuto();
    auto = setInterval(function () { if (!S || busy) return; if (S.step >= S.total - 1) return stopAuto(); go(S.step + 1); }, 5200);
    if (S && S.step < S.total - 1) go(S.step + 1); else render();
  }
  $('prev').onclick = function () { stopAuto(); go(S.step - 1); };
  $('next').onclick = function () { stopAuto(); go(S.step + 1); };
  $('again').onclick = function () { stopAuto(); seen = {}; held = {}; go(0); };
  $('auto').onclick = toggleAuto;
  addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || !S) return;
    var k = e.key.toLowerCase();
    if (k === 'arrowright' || k === ' ') { e.preventDefault(); stopAuto(); if (S.step < S.total - 1) go(S.step + 1); }
    else if (k === 'arrowleft') { stopAuto(); if (S.step > 0) go(S.step - 1); }
    else if (k === 'a' || k === 'ф') toggleAuto();
    else if (k === 'r' || k === 'к') { stopAuto(); go(0); }
    else if (k === 't' || k === 'е') {
      var dark = document.documentElement.getAttribute('data-theme') !== 'dark';
      if (dark) document.documentElement.setAttribute('data-theme', 'dark'); else document.documentElement.removeAttribute('data-theme');
      try { localStorage.setItem('relay.theme', dark ? 'dark' : 'light'); } catch (x) { }
    }
  });
  setInterval(function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-until]'), function (e) { e.textContent = clock(Number(e.getAttribute('data-until')) - now()); });
  }, 500);
  setInterval(function () { if (!document.hidden && !busy) api('GET', 'api/show').then(function (d) { if (!busy && (d.step !== S.step || d.log.length !== S.log.length)) take(d); }, function () { }); }, 4000);
  addEventListener('resize', function () { if (S) render(); });
  load().then(function () {
    var want = parseInt(q.get('step'), 10);
    if (S && !isNaN(want) && want !== S.step) go(want);
  });
})();
