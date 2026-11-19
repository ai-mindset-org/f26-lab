// прогон: один круг эстафеты по шагам. Сервер выполняет настоящие ходы на отдельном столе,
// страница показывает один skill, троих участников и то, что произошло на шаге. Чужой текст попадает на страницу только как текст.
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
  var two = function (n) { return (n < 10 ? '0' : '') + n; };
  var now = function () { return Date.now() / 1000 + skew; };
  function clock(sec) { sec = Math.max(0, Math.round(sec)); return two(Math.floor(sec / 60)) + ':' + two(sec % 60); }
  function api(method, path, body) {
    var o = { method: method, credentials: 'same-origin', headers: {} };
    if (body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    return fetch(path, o).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || ('ошибка ' + r.status)); return d; }); });
  }
  var KN = { protocol: 'протокол', logic: 'логика', border: 'граница', example: 'пример', rake: 'грабля', check: 'проверка', trim: 'сжатие' };
  function kindTag(k) { return k && KN[k] ? h('span', { class: 'kind tag' }, window.ART.kind(k), KN[k]) : null; }
  // лента версий первой дорожки: за ней идёт весь прогон
  function ribbon(l) {
    var vs = l.versions || [];
    return h('div', { class: 'vr' }, h('span', { class: 'v0' }, 'v0'),
      vs.map(function (v, i) { return h('span', { class: 'nd' + (i === vs.length - 1 ? ' last' : ''), title: 'v' + v.n + ' · ' + (KN[v.kind] || '') }, h('span', null, window.ART.kind(v.kind) || '·')); }),
      l.status === 'бежит' ? [h('span', { class: 'nd next' }, h('span', null, '+')), h('span', { class: 'cur' }, 'вносит ' + l.runner + (l.doing ? ' · ' + KN[l.doing] : ''))] :
        h('span', { class: 'cur' }, vs.length ? 'лежит v' + vs.length + ' · свободен' : 'лежит базовая версия · свободен'));
  }
  function how(e) { return e.via === 'агент' ? 'агент' + (e.agent ? ' ' + e.agent : '') : e.via; }

  function chg(n) { return n + ' ' + (n % 10 === 1 && n % 100 !== 11 ? 'изменение' : n % 10 > 1 && n % 10 < 5 && (n % 100 < 12 || n % 100 > 14) ? 'изменения' : 'изменений'); }
  function ruleLine(c) { return c.rule ? h('div', { class: 'rl' }, h('span', { class: 'id' }, c.rule), h('b', null, c.rule_title || ''), kindTag(c.kind)) : null; }
  function diffBox(c, max) {
    var rows = (c.diff || []).filter(function (r) { return r.t.trim(); });
    if (!rows.length || (c.errors || []).length) return null;
    return h('div', { class: 'diff' }, rows.slice(0, max).map(function (r) { return h('div', { class: r.op === '-' ? 'del' : 'add' }, (r.op === '-' ? '− ' : '+ ') + r.t); }),
      rows.length > max ? h('div', { class: 'etc' }, '… ещё строк: ' + (rows.length - max)) : null);
  }
  // один skill в центре: за ним идёт весь прогон
  function skillBox(l) {
    return [h('div', null, h('div', { class: 'nm' }, 'skill ' + two(l.n) + ' · за ним идёт прогон'), h('h3', null, l.title), h('p', null, l.what || '')),
      h('div', { class: 'vv' }, h('div', { class: 'big' }, 'v' + l.laps), ribbon(l))];
  }
  // участник: кто он, через что работает, что у него сейчас
  function person(w) {
    var mine = w.lanes.filter(function (l) { return l.mine; })[0], hop = mine && held[mine.id] !== w.login && !first;
    var st = mine ? [h('b', null, 'держит skill ' + two(mine.n)), ' · осталось ', h('em', { 'data-until': mine.until }, clock(mine.until - now()))] :
      w.rest_until ? ['пауза ', h('em', { 'data-until': w.rest_until }, clock(w.rest_until - now())), w.legs ? ' · внесено: ' + chg(w.legs) : ''] :
        w.auth ? 'на столе · свободен' : 'ещё не вошёл';
    return h('div', { class: 'who' + (mine ? ' act' : '') + (hop ? ' hop' : '') + (S.focus === w.login ? ' foc' : '') },
      h('div', { class: 'av' }, w.name.charAt(0)),
      h('div', { class: 'wb' }, h('b', null, w.name), h('span', null, w.harness), h('p', { class: 'st' }, st), w.card ? h('p', { class: 'was' }, w.card.title) : null));
  }
  var STRIP = [['взять skill', 'он твой на пять минут'], ['одно изменение', 'до двенадцати строк по одному правилу'], ['проверка', 'текст и разбор'], ['новая версия', 'лежит на дорожке для следующего']];
  function strip() { return h('div', { class: 'how' }, STRIP.map(function (x, i) { return h('div', { class: 'st' }, h('div', { class: 'n' }, two(i + 1)), window.ART.step(i), h('b', null, x[0]), x[1]); })); }
  function what() {
    var n = S.step, last = S.total - 1, w = S.windows.filter(function (x) { return x.login === S.focus; })[0], c = w && w.card;
    if (n === last && S.chain.length) return [h('h4', null, 'круг закрыт: в skill ' + chg(S.chain.length)), S.chain.map(function (x) {
      return h('div', { class: 'vrow' }, h('b', null, 'v' + x.n + ' · ' + x.runner), ruleLine({ rule: x.rule, rule_title: x.rule_title, kind: x.kind }), h('p', null, x.note));
    })];
    if (!c) return [h('p', null, n === 0 ? 'Skills лежат на дорожках. Каждый ждёт одного изменения.' : 'Все трое на столе. Skill свободен.'), strip()];
    return [h('h4', null, w.name + ' · ' + c.title), ruleLine(c),
      c.note ? h('p', null, c.note) : null,
      c.tried ? h('p', null, h('b', null, 'примерил на: '), c.tried) : null,
      (c.candidates || []).length ? h('p', { class: 'cl' }, 'агент видит, чего не хватает:') : null,
      (c.candidates || []).map(function (x) { return h('p', null, h('b', null, x.rule + ' · ' + x.title + '. '), x.why); }),
      (c.errors || []).map(function (x) { return h('p', { class: 'stop' }, h('b', null, 'стоп. '), x); }),
      (c.facts || []).map(function (f) { return h('p', { class: 'stop' }, (f.line ? 'строка ' + f.line + ' · ' : '') + f.rule + (f.excerpt ? ': «' + f.excerpt + '»' : '')); }),
      diffBox(c, 8),
      c.verdict ? h('p', null, h('b', null, 'разбор: ' + c.verdict), c.by ? ' · ' + c.by : '') : null,
      c.comment ? h('p', null, c.comment) : null,
      c.by && !c.verdict ? h('p', null, c.by) : null];
  }
  function logRow(e, full) {
    var d = new Date(e.at * 1000), id = e.at + e.who + e.what, fresh = !seen[id] && !first;
    if (full) seen[id] = 1;
    return h('div', { class: 'e' + (e.via === 'система' ? ' sys' : '') + (fresh ? ' new' : '') },
      h('span', null, two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds())),
      h('b', null, e.who),
      h('span', null, e.what + (e.lane ? ' · ' + e.lane : '') + ' ', h('i', null, '· через: '), e.via === 'агент' ? h('u', null, how(e)) : h('i', null, how(e))));
  }
  // схема круга с главной: та же анимация, фаза идёт за шагом прогона; под ней правило шага ссылкой в книгу
  var animBox = null;
  function phaseOf() {
    var w = S.windows.filter(function (x) { return x.login === S.focus; })[0], c = w && w.card, t = String(S.title || '').toLowerCase();
    if (/коммит|версия v|круг закрыт|конец/.test(t)) return 3;
    if (c && c.verdict) return 2;
    if (c && c.rule) return 1;
    return 0;
  }
  function anim() {
    if (!window.ART || !window.ART.intro) return;
    if (!animBox) { animBox = window.ART.intro({ manual: true, lock: '5 мин' }); }
    var w = S.windows.filter(function (x) { return x.login === S.focus; })[0], c = w && w.card;
    fill($('anim'), animBox, c && c.rule ? h('p', { class: 'arule' }, 'правило этого шага: ',
      h('a', { href: 'rules#' + encodeURIComponent(c.rule) }, c.rule + (c.rule_title ? ' · ' + c.rule_title : '') + ' →'), ' · ',
      h('a', { href: 'try' }, 'попробовать на своём skill →')) : null);
    animBox.setPhase(phaseOf());
  }
  function render() {
    var n = S.step, last = S.total - 1;
    anim();
    $('ph').textContent = '{ шаг ' + two(n) + ' из ' + two(last) + ' }';
    $('title').replaceChildren(document.createTextNode(S.title), h('em', null, '.'));
    $('text').textContent = S.text;
    $('kick').textContent = '{ один круг по шагам · каждое действие настоящее }';
    $('prev').disabled = busy || n === 0; $('next').disabled = busy || n === last;
    $('next').textContent = busy ? 'идёт шаг…' : n === last ? 'конец круга' : 'дальше →';
    fill($('skill'), skillBox(S.windows[0].lanes[0]));
    fill($('cast'), S.windows.map(person));
    S.windows.forEach(function (w) { w.lanes.forEach(function (l) { if (l.mine) held[l.id] = w.login; else if (held[l.id] === w.login) delete held[l.id]; }); });
    fill($('what'), what());
    var none = h('div', { class: 'e sys' }, h('span', null, '·'), h('b', null, 'система'), h('span', null, 'стол ждёт: никто не вошёл'));
    fill($('last'), S.log.length ? S.log.slice(0, 4).map(function (e) { return logRow(e, false); }) : none);
    fill($('log'), S.log.length ? S.log.map(function (e) { return logRow(e, true); }) : none.cloneNode(true));
    $('jlab').textContent = 'журнал стола · записей ' + S.log.length + ' · свежие сверху';
    fill($('files'), (S.files || []).length ? S.files.map(function (f) { return h('div', null, f); }) : h('div', null, 'на этом шаге стол не менялся'));
    fill($('chain'), S.chain.length ? [h('div', { class: 'lab' }, 'лог версий дорожки 01 · от чьего лица и через что'), S.chain.slice().reverse().map(function (c) {
      return h('div', { class: 'c' }, h('b', null, 'v' + c.n + ' · ' + c.runner + ' '), kindTag(c.kind), h('span', null, ' ' + c.rule + ' ' + c.rule_title), h('br'),
        h('span', null, c.note), h('br'),
        h('span', null, 'прислал: ' + (c.via === 'агент' ? 'агент ' + c.agent : c.via) + ' · закоммитил: человек, ' + c.passed + ' · вход: ' + c.auth), h('br'),
        h('span', null, 'разбор: ' + c.verdict + ' · ' + c.by + ' · −' + c.minus + ' / +' + c.plus + ' строк · версия ' + c.digest));
    })] : null);
    fill($('rail'), S.steps.map(function (t, i) {
      return h('button', { class: (i < n ? 'past' : i === n ? 'now' : '') + (i > S.steps.length / 2 ? ' r' : ''), title: two(i) + ' ' + t, onclick: function () { go(i); } }, h('span', null, i === n ? two(i) + ' ' + t : two(i)));
    }));
    $('auto').className = auto ? 'on' : ''; $('auto').textContent = auto ? '❚❚ пауза' : '▶ автопоказ';
    first = false;
  }
  function take(d) { S = d; skew = d.now - Date.now() / 1000; fill($('err')); render(); }
  function go(n) {
    if (busy || !S) return Promise.resolve();
    busy = true; render();
    return api('POST', 'api/show/go', { to: n }).then(take, function (e) { fill($('err'), h('div', { class: 'msg' }, e.message)); })
      .then(function () { busy = false; render(); });
  }
  // гость без входа: пульт и пустая сцена прогона убраны, остаётся одна строка с дорогой на стол
  function gate() {
    $('text').textContent = 'Прогон идёт на отдельном учебном столе: один круг по шагам, каждое действие настоящее.';
    ['.head > div + div', '.scene', '.under2', 'details'].forEach(function (q) {
      Array.prototype.forEach.call(document.querySelectorAll('main ' + q), function (el) { el.style.display = 'none'; });
    });
    fill($('err'), h('div', { class: 'msg' }, 'Прогон открывается после входа в эстафету. ', h('a', { href: './' }, 'Войти на странице стола'), '.'));
  }
  function load() { return api('GET', 'api/show').then(take, function (e) { if (e.message === 'нет входа') return gate(); fill($('err'), h('div', { class: 'msg' }, e.message)); }); }
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
  });
  setInterval(function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-until]'), function (e) { e.textContent = clock(Number(e.getAttribute('data-until')) - now()); });
  }, 500);
  setInterval(function () { if (!document.hidden && !busy) api('GET', 'api/show').then(function (d) { if (!busy && (d.step !== S.step || d.log.length !== S.log.length)) take(d); }, function () { }); }, 4000);
  load().then(function () {
    var want = parseInt(q.get('step'), 10);
    if (S && !isNaN(want) && want !== S.step) go(want);
  });
})();
