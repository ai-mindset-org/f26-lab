// книга эстафеты отдельным окном: правила с практикой и первоисточником, настройка skill в харнессе, замеры
(function () {
  'use strict';
  function flat(a) { return a.reduce(function (r, x) { return r.concat(Array.isArray(x) ? flat(x) : [x]); }, []); }
  function h(tag, attrs) {
    var e = document.createElement(tag), k, i, kids = [];
    for (k in (attrs || {})) { if (attrs[k] == null || attrs[k] === false) continue; if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    for (i = 2; i < arguments.length; i++) kids.push(arguments[i]);
    flat(kids).forEach(function (c) { if (c != null && c !== false) e.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c))); });
    return e;
  }
  try { if ((new URLSearchParams(location.search).get('theme') || localStorage.getItem('relay.theme')) === 'dark') document.documentElement.setAttribute('data-theme', 'dark'); } catch (e) { }
  addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if ((k !== 't' && k !== 'е') || e.metaKey || e.ctrlKey || e.altKey) return;
    var dark = document.documentElement.getAttribute('data-theme') !== 'dark';
    if (dark) document.documentElement.setAttribute('data-theme', 'dark'); else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem('relay.theme', dark ? 'dark' : 'light'); } catch (x) { }
  });
  fetch('api/rules', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (d) {
    var keys = {}, src = d.sources;
    (src.guides || []).concat(src.research || []).forEach(function (g) { keys[g.key] = g; });
    function refs(list) {
      return h('div', { class: 'refs' }, list.map(function (k, i) {
        return [i ? ' · ' : '', keys[k] ? h('a', { class: 'q', href: keys[k].url, rel: 'noopener', target: '_blank' }, keys[k].title) : 'соглашение эстафеты'];
      }));
    }
    function block(x, why) {
      return h('div', { class: 'rule', id: x.id },
        h('h3', null, x.id + ' ', h('span', null, '· ' + x.title)),
        x.ask ? h('p', null, h('b', null, 'вопрос. '), x.ask) : null,
        x.fix ? h('p', null, h('b', null, 'правка. '), x.fix) : null,
        x.why ? h('p', { class: 'why' }, h('b', null, 'практика. '), x.why) : null,
        x.text ? h('p', { class: why ? 'why' : '' }, x.text) : null,
        refs(x.src));
    }
    document.getElementById('ph').textContent = '{ ' + d.rules.length + ' правил · ' + (src.guides || []).length + ' гайдов · ' + (src.research || []).length + ' замера }';
    var page = document.getElementById('page');
    page.replaceChildren(
      h('div', { class: 'kick' }, '{ книга эстафеты · сверено ' + src.fetched + ' }'),
      h('h1', null, 'правила и настройка', h('br'), 'skills', h('em', null, '.')),
      h('p', { class: 's' }, 'Одна передача применяет одно правило. У правила есть вопрос к тексту skill, способ правки и практика: что говорит первоисточник или замер. Формулировки свои, ссылки ведут к оригиналам. За одну передачу меняется до ' + d.limits.changed + ' строк, палочка держит до ' + d.limits.lines + ' строк.'),
      h('div', { class: 'nav' },
        h('a', { class: 'q', href: '#rules' }, 'правила развития · ' + d.rules.length),
        h('a', { class: 'q', href: '#settings' }, 'настройка в харнессе · ' + d.settings.length),
        h('a', { class: 'q', href: '#evidence' }, 'что показывают замеры · ' + d.evidence.length),
        h('a', { class: 'q', href: '#sources' }, 'гайды и библиотеки'),
        h('a', { class: 'q', href: 'show' }, 'прогон по шагам'),
        h('a', { class: 'q', href: './' }, 'к дорожкам')),
      h('h2', { id: 'rules' }, 'правила развития skill'),
      h('p', { class: 's' }, 'G – правила из гайдов, R – правило самой эстафеты. Разбор при взятии палочки называет три правила, по которым правка даст больше всего.'),
      h('div', { class: 'cols' }, d.rules.map(function (x) { return block(x); })),
      h('h2', { id: 'settings' }, 'настройка skill в харнессе'),
      h('p', { class: 's' }, 'Где лежит skill, что стоит в шапке, кто его запускает и какие права он получает. Эти настройки остаются у человека: в эстафету идёт только общий текст SKILL.md.'),
      h('div', { class: 'cols' }, d.settings.map(function (x) { return block(x); })),
      h('h2', { id: 'evidence' }, 'что показывают замеры'),
      h('p', { class: 's' }, 'Цифры, на которые опираются правила про краткость, проверку и чтение чужого skill перед установкой.'),
      h('div', { class: 'cols' }, d.evidence.map(function (x) { return block(x, true); })),
      h('h2', { id: 'sources' }, 'гайды, замеры и библиотеки'),
      h('div', { class: 'cols' },
        h('div', null, h('div', { class: 'lab', style: 'margin-top:18px' }, 'гайды'), h('div', { class: 'src' }, (src.guides || []).map(function (g) { return h('div', null, h('a', { class: 'q', href: g.url, rel: 'noopener', target: '_blank' }, g.title)); }))),
        h('div', null, h('div', { class: 'lab', style: 'margin-top:18px' }, 'замеры и исследования'), h('div', { class: 'src' }, (src.research || []).map(function (g) { return h('div', null, h('a', { class: 'q', href: g.url, rel: 'noopener', target: '_blank' }, g.title), ' · ' + g.note); })),
          h('div', { class: 'lab', style: 'margin-top:18px' }, 'библиотеки skills, по которым сверялись базовые палочки'), h('div', { class: 'src' }, (src.libraries || []).map(function (g) { return h('div', null, h('a', { class: 'q', href: g.url, rel: 'noopener', target: '_blank' }, g.title), ' · ' + g.note); })))));
    if (location.hash && document.getElementById(location.hash.slice(1))) document.getElementById(location.hash.slice(1)).scrollIntoView();
  }, function () { document.getElementById('page').replaceChildren(h('p', { class: 's' }, 'Книга правил не открылась: страница работает на сервере эстафеты.')); });
})();
