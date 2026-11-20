// песочница: одно правило к своему skill. Стол не меняется, версии живут в этой вкладке браузера.
// Чужой текст попадает на страницу только как текст.
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
  function api(method, path, body) {
    var o = { method: method, credentials: 'same-origin', headers: {} };
    if (body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    return fetch(path, o).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || ('ошибка ' + r.status)); return d; }); });
  }
  var q = new URLSearchParams(location.search);
  var A = window.ART, KN = {}, RULES = [], KINDS = [], KIT = [], MODEL = '', LIM = { changed: 12, lines: 400 };
  // состояние песочницы: исходный текст, принятые версии, изменение на рассмотрении
  var st = { v0: '', versions: [], redo: [], kind: '', rule: '', pending: null, error: null, busy: false, look: null, t0: 0 };
  var MAC = /Mac|iPhone|iPad/.test(navigator.platform || ''), ZK = MAC ? '⌘Z' : 'Ctrl+Z', YK = MAC ? '⇧⌘Z' : 'Ctrl+Shift+Z';
  function save() { try { sessionStorage.setItem('relay.try', JSON.stringify({ v0: st.v0, versions: st.versions, text: $('text').value, kind: st.kind, rule: st.rule })); } catch (e) { } }
  function restore() {
    try {
      var d = JSON.parse(sessionStorage.getItem('relay.try') || 'null');
      if (d && typeof d.text === 'string') { st.v0 = d.v0 || ''; st.versions = d.versions || []; st.kind = d.kind || ''; st.rule = d.rule || ''; $('text').value = d.text; return true; }
    } catch (e) { }
    return false;
  }
  function kindTag(k) { return k && KN[k] ? h('span', { class: 'kind tag' }, A.kind(k), KN[k]) : null; }
  function ruleOf(id) { return RULES.filter(function (r) { return r.id === id; })[0]; }

  function drawKit() {
    var grp = function (pk, label) {
      var rows = KIT.filter(function (x) { return (x.pack || 'base') === pk; });
      return rows.length ? [h('span', { class: 'cl' }, label), rows.map(function (x) {
        var src = x.source;
        return h('button', { class: 'chip', title: x.what + (src ? ' · по мотивам ' + src.origin + ' из ' + src.repo + (src.installs ? ', установок ' + src.installs : '') : ''), onclick: function () { setText(x.text); } },
          h('em', { class: 'lv' }, x.level), x.title);
      })] : null;
    };
    fill($('kit'), grp('text', 'простые текстовые:'), grp('popular', 'популярные skills, уровни 1–5:'), grp('base', 'базовые:'), h('button', { class: 'chip', onclick: function () { setText(''); $('text').focus(); } }, 'очистить'));
  }
  function setText(t) {
    $('text').value = t; st.v0 = t; st.versions = []; st.redo = []; st.pending = null; st.error = null;
    look(); draw(); save();
  }
  var timer = null;
  function look() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      var t = $('text').value;
      api('POST', 'api/try/look', { text: t }).then(function (d) { if ($('text').value === t) { st.look = d; drawMeta(); drawRules(); } }, function () { });
    }, 350);
  }
  function drawMeta() {
    var d = st.look;
    if (!d) return fill($('meta'));
    fill($('meta'),
      h('span', null, 'строк ' + d.lines + (d.name ? ' · ' + d.name : '')),
      d.private.length ? h('span', { class: 'bad' }, ' · стоп: личное или секрет, модели текст не уйдёт') : d.lines ? h('span', null, ' · личного не видно') : null,
      d.private.map(function (f) { return h('div', { class: 'bad' }, 'строка ' + f.line + ' · ' + f.rule + (f.excerpt ? ': «' + f.excerpt + '»' : '')); }),
      d.notes.map(function (f) { return h('div', null, 'форма · ' + f.rule); }),
      d.parts && d.lines ? A.scheme(d.parts, { hit: (ruleOf(st.rule) || {}).part || '' }) : null);
  }
  function pick(kind, rule) { st.kind = kind; st.rule = rule || ''; drawRules(); drawMeta(); save(); }
  function drawRules() {
    var hints = (st.look && st.look.candidates) || [];
    fill($('hints'), hints.length ? [h('span', { class: 'cl' }, 'по тексту видно, чего не хватает:'), hints.map(function (c) {
      var r = ruleOf(c.rule) || {};
      return h('button', { class: 'chip' + (st.rule === c.rule ? ' sel' : ''), title: c.why, onclick: function () { pick(r.kind, c.rule); } }, c.rule + ' · ' + c.title);
    })] : null);
    fill($('kinds'), KINDS.map(function (k) {
      return h('button', { class: 'kind' + (st.kind === k.id ? ' sel' : ''), title: k.text, onclick: function () { pick(k.id, ''); } }, A.kind(k.id), k.title);
    }));
    var list = RULES.filter(function (r) { return r.kind === st.kind; });
    fill($('rules'), st.kind ? list.map(function (r) {
      return h('button', { class: 'rpick' + (st.rule === r.id ? ' sel' : ''), onclick: function () { pick(st.kind, r.id); } },
        h('span', { class: 'fig' }, A.rule(r.id)),
        h('span', { class: 'tx' }, h('b', null, h('i', { class: 'id' }, r.id), r.title), h('span', null, r.ask)));
    }) : h('p', { class: 'hint' }, 'Выбери вид изменения: под ним появятся правила.'));
    var r = ruleOf(st.rule);
    $('apply').disabled = st.busy || !r || !!st.pending;
    $('apply').textContent = st.busy ? 'вносит изменение…' : r ? 'применить ' + r.id + ' к skill' : 'выбери правило';
  }
  function ribbon() {
    var vs = st.versions;
    return h('div', { class: 'vr' }, h('span', { class: 'v0' }, 'v0'),
      vs.map(function (v, i) { return h('span', { class: 'nd' + (i === vs.length - 1 && !st.pending ? ' last' : ''), title: 'v' + v.n + ' · ' + v.rule + ' ' + v.title }, h('span', null, A.kind(v.kind) || '·')); }),
      st.pending ? h('span', { class: 'nd next' }, h('span', null, '+')) : null,
      h('span', { class: 'cur' }, st.pending ? 'изменение ждёт решения' : vs.length ? 'лежит v' + vs.length : 'исходный текст'));
  }
  function diffBox(rows) {
    rows = rows.filter(function (r) { return r.t.trim(); });
    return h('div', { class: 'diff' }, rows.slice(0, 24).map(function (r) { return h('div', { class: r.op === '-' ? 'del' : 'add' }, (r.op === '-' ? '− ' : '+ ') + r.t); }));
  }
  function draw() {
    fill($('ribbon'), ribbon());
    var p = st.pending, e = st.error, out;
    if (st.busy) out = h('div', { class: 'ev2' }, h('h4', null, 'модель вносит одно изменение…'), h('p', null, 'Обычно это 10–25 секунд. Прошло: ', h('em', { id: 'sec' }, '0'), ' с.'));
    else if (e) out = h('div', { class: 'ev2' }, h('h4', null, 'изменение не внесено'), e.errors.map(function (x) { return h('p', { class: 'stop' }, h('b', null, 'стоп. '), x); }),
      (e.facts || []).map(function (f) { return h('p', { class: 'stop' }, (f.line ? 'строка ' + f.line + ' · ' : '') + f.rule + (f.excerpt ? ': «' + f.excerpt + '»' : '')); }));
    else if (p) out = h('div', { class: 'ev2' },
      h('h4', null, 'одно изменение: +' + p.plus + ' / −' + p.minus + ' строк'),
      h('div', { class: 'rl' }, h('span', { class: 'id' }, p.rule), h('b', null, p.rule_title), kindTag(p.kind)),
      p.note ? h('p', null, p.note) : null,
      diffBox(p.diff),
      h('p', null, 'внесла: ' + p.by + (p.sec ? ' · ' + p.sec + ' с' : '')),
      h('div', { class: 'row' },
        h('button', { class: 'go', onclick: keep }, 'оставить: это v' + (st.versions.length + 1)),
        h('button', { onclick: function () { st.pending = null; draw(); drawRules(); }, title: 'изменение не станет версией' }, 'не оставлять · ' + ZK)));
    else out = h('div', { class: 'ev2 idle' }, h('p', null, st.versions.length ? 'Версия v' + st.versions.length + ' лежит в поле слева. Выбери следующее правило или отмени её: ' + ZK + '.' :
      'Здесь появится разница: что было и что стало. Одно изменение, до ' + LIM.changed + ' строк.'));
    fill($('result'), out);
    fill($('versions'), st.versions.length ? [
      st.versions.slice().reverse().map(function (v) {
        return h('div', { class: 'vrow' }, h('b', null, 'v' + v.n), h('div', { class: 'rl' }, h('span', { class: 'id' }, v.rule), h('b', null, v.title), kindTag(v.kind)), h('p', null, v.note));
      }),
      h('div', { class: 'vrow' }, h('b', null, 'v0'), h('p', null, 'исходный текст')),
      h('div', { class: 'row' },
        h('button', { onclick: copy, id: 'copy' }, 'скопировать SKILL.md'),
        h('button', { onclick: download }, 'скачать SKILL.md'),
        h('button', { onclick: undo, title: 'последняя версия снимается, в поле возвращается текст до неё' }, 'отменить v' + st.versions.length + ' · ' + ZK),
        st.redo.length ? h('button', { onclick: redo }, 'вернуть v' + (st.versions.length + 1) + ' · ' + YK) : null),
      // проба остаётся в песочнице: на стол уходит только то, что человек сделает со skill, взятым в марафоне
      h('div', { class: 'tomar' },
        h('p', null, h('b', null, 'попробовал: '), st.versions.map(function (v) { return v.rule; }).join(' → '),
          '. Это осталось здесь, в песочнице: никто, кроме тебя, этих версий не видит. В эстафету уходит одно изменение на skill со стола, под твоим именем.'),
        h('div', { class: 'row' }, h('a', { class: 'btn go', href: './' }, '← вернуться в марафон: взять skill со стола'),
          h('a', { class: 'btn', href: './#add', onclick: function () { try { sessionStorage.setItem('relay.add', $('text').value); } catch (e) { } } }, 'положить этот skill на стол новой дорожкой')))] :
      [h('p', { class: 'hint' }, 'Принятые изменения встанут сюда версиями: v1, v2, v3. ' + ZK + ' отменяет последнюю.'),
        st.redo.length ? h('div', { class: 'row' }, h('button', { onclick: redo }, 'вернуть v1 · ' + YK)) : null]);
  }
  function apply() {
    var r = ruleOf(st.rule), t = $('text').value;
    if (!r || st.busy) return;
    if (!st.versions.length) st.v0 = t;
    st.busy = true; st.error = null; st.pending = null; st.t0 = Date.now(); draw(); drawRules();
    api('POST', 'api/try/apply', { text: t, rule: r.id }).then(function (d) {
      if (d.ok) { d.sec = Math.round((Date.now() - st.t0) / 1000); d.from = t; st.pending = d; } else st.error = d;
    }, function (e) { st.error = { errors: [e.message] }; }).then(function () { st.busy = false; draw(); drawRules(); });
  }
  function keep() {
    var p = st.pending;
    if (!p) return;
    st.versions.push({ n: st.versions.length + 1, rule: p.rule, title: p.rule_title, kind: p.kind, note: p.note, by: p.by, text: p.text, from: p.from });
    $('text').value = p.text; st.pending = null; st.rule = ''; st.redo = [];
    look(); draw(); drawRules(); save();
  }
  // отмена как в редакторе: сначала снимается непринятое изменение, потом версии по одной; снятую версию можно вернуть
  function undo() {
    if (st.busy) return false;
    if (st.pending) { st.pending = null; draw(); drawRules(); return true; }
    var v = st.versions.pop();
    if (!v) return false;
    st.redo.push(v); $('text').value = v.from;
    look(); draw(); drawRules(); save();
    return true;
  }
  function redo() {
    var v = st.redo.pop();
    if (!v || st.busy) return false;
    v.n = st.versions.length + 1; st.versions.push(v); $('text').value = v.text; st.pending = null;
    look(); draw(); drawRules(); save();
    return true;
  }
  function copy() {
    var t = $('text').value, b = $('copy');
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'скопировано'; }, function () { $('text').select(); b.textContent = 'выдели и скопируй: Ctrl+C'; });
  }
  function download() {
    var a = h('a', { href: URL.createObjectURL(new Blob([$('text').value], { type: 'text/markdown' })), download: 'SKILL.md' });
    document.body.appendChild(a); a.click(); a.remove();
  }
  $('apply').onclick = apply;
  $('text').addEventListener('input', function () { st.error = null; look(); save(); });
  setInterval(function () { var s = $('sec'); if (s && st.busy) s.textContent = Math.round((Date.now() - st.t0) / 1000); }, 500);
  addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'z' || e.key === 'Z' || e.key === 'я' || e.key === 'Я')) {
      // в поле текста своя отмена набора: версию снимаем, только когда в поле лежит ровно текст последней версии
      var last = st.versions[st.versions.length - 1], typed = e.target === $('text') && !st.pending && $('text').value !== (last ? last.text : st.v0);
      if (typed) return;
      if (e.shiftKey ? redo() : undo()) e.preventDefault();
    }
  });
  Promise.all([api('GET', 'api/rules'), api('GET', 'api/try/kit')]).then(function (r) {
    RULES = r[0].rules; KINDS = r[0].kinds; KIT = r[1].skills; MODEL = r[1].model; LIM = r[1].limits;
    KINDS.forEach(function (k) { KN[k.id] = k.title; });
    $('model').textContent = MODEL ? 'Изменение вносит модель ' + MODEL + ' через OpenRouter: текст skill уходит ей. Личное и секреты проверка останавливает до отправки.' :
      'Модель не подключена: песочница работает на заготовках для базовых skills.';
    drawKit();
    if (!restore() && KIT.length) { $('text').value = KIT[0].text; st.v0 = KIT[0].text; }
    var want = q.get('rule'), wr = want && ruleOf(want.toUpperCase());
    if (wr) { st.kind = wr.kind; st.rule = wr.id; }
    if (!st.kind && KINDS.length) st.kind = KINDS[0].id;
    look(); draw(); drawRules();
  }, function (e) {
    fill($('result'), e.message === 'нет входа' ? h('div', { class: 'msg' }, 'Песочница открывается после входа в эстафету. ', h('a', { href: './' }, 'Войти на странице стола'), '.') : h('div', { class: 'msg' }, e.message));
  });
})();
