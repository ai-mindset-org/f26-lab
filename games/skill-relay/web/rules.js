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
  var KT = {};
  function kindTag(id, tag) { var k = KT[id]; return k ? h(tag || 'span', { class: 'kind tag' }, window.ART.kind(id), k.title) : null; }
  function bars(rows, max) {
    return h('div', { class: 'bars' }, rows.map(function (r) {
      var i = h('i'); i.style.width = Math.max(1, Math.round(r[1] / max * 100)) + '%';
      return h('div', { class: 'b' + (r[3] ? ' acc' : '') }, h('span', null, r[0]), h('div', { class: 'trk' }, i), h('span', null, r[2]));
    }));
  }
  var CHART = {
    'E-01': function () { return bars([['без skill', 33.9, '33,9%'], ['с выверенными skills', 50.5, '50,5%', 1], ['skill написан агентом, никто не проверил', 24.4, '−8…11 п.']], 60); },
    'E-02': function () { return bars([['компактный', 19, '+19'], ['обычной длины', 21.5, '+21,5', 1], ['подробный', 14.5, '+14,5'], ['исчерпывающая документация', 0.7, '+0,7']], 22); },
    'E-04': function () { return bars([['Snyk · 10 000 популярных skills', 64, '64%', 1], ['замер 31 132 skills', 26.1, '26,1%']], 100); }
  };
  fetch('api/rules', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (d) {
    var keys = {}, src = d.sources;
    (src.guides || []).concat(src.research || []).forEach(function (g) { keys[g.key] = g; });
    (d.kinds || []).forEach(function (k) { KT[k.id] = k; });
    function refs(list) {
      return h('div', { class: 'refs' }, list.map(function (k, i) {
        return [i ? ' · ' : '', keys[k] ? h('a', { class: 'q', href: keys[k].url, rel: 'noopener', target: '_blank' }, keys[k].title) : 'соглашение эстафеты'];
      }));
    }
    function rule(x) {
      return h('div', { class: 'rule pic', id: x.id },
        h('div', { class: 'fig' }, window.ART.rule(x.id)),
        h('div', null,
          h('h3', null, h('span', { class: 'id' }, x.id), x.title),
          h('p', null, h('b', null, 'вопрос. '), x.ask),
          h('p', null, h('b', null, 'изменение. '), x.fix),
          x.why ? h('p', { class: 'why' }, h('b', null, 'практика. '), x.why) : null,
          refs(x.src)));
    }
    function block(x, why) {
      return h('div', { class: 'rule', id: x.id },
        h('h3', null, x.id + ' ', h('span', null, '· ' + x.title)),
        x.text ? h('p', { class: why ? 'why' : '' }, x.text) : null,
        CHART[x.id] ? CHART[x.id]() : null,
        refs(x.src));
    }
    document.getElementById('ph').textContent = '{ ' + d.rules.length + ' правил · ' + (d.kinds || []).length + ' видов изменения · ' + (src.guides || []).length + ' гайдов }';
    var page = document.getElementById('page');
    page.replaceChildren.apply(page, flat([
      h('div', { class: 'kick' }, '{ книга эстафеты · сверено ' + src.fetched + ' }'),
      h('h1', null, 'одно изменение', h('em', null, '.')),
      h('p', { class: 's' }, 'Берёшь skill, добавляешь одно и коммитишь за пять минут: в дорожке лежит новая версия. Одно изменение бывает семи видов. У каждого вида два–четыре правила: вопрос к тексту skill, само изменение и практика из первоисточника или замера. За раз меняется до ' + d.limits.changed + ' строк.'),
      h('div', { class: 'nav' },
        h('a', { class: 'q', href: '#kinds' }, 'виды изменения · ' + (d.kinds || []).length),
        h('a', { class: 'q', href: '#settings' }, 'настройка skill в харнессе · ' + d.settings.length),
        h('a', { class: 'q', href: '#evidence' }, 'что показывают замеры · ' + d.evidence.length),
        h('a', { class: 'q', href: '#sources' }, 'гайды и библиотеки'),
        h('a', { class: 'q', href: 'show' }, 'прогон по шагам'),
        h('a', { class: 'q', href: './' }, 'к дорожкам')),
      h('div', { class: 'kinds', id: 'kinds' }, (d.kinds || []).map(function (k) {
        var n = d.rules.filter(function (x) { return x.kind === k.id; }).length;
        return h('a', { class: 'kcard', href: '#k-' + k.id }, window.ART.kind(k.id), h('b', null, k.add), h('span', null, k.text), h('i', null, n + ' ' + (n === 1 ? 'правило' : n < 5 ? 'правила' : 'правил')));
      })),
      (d.kinds || []).map(function (k) {
        return [h('h2', { id: 'k-' + k.id, class: 'kh' }, window.ART.kind(k.id), k.add),
          h('p', { class: 's' }, k.text),
          h('div', { class: 'cols' }, d.rules.filter(function (x) { return x.kind === k.id; }).map(rule))];
      }),
      h('h2', { id: 'settings' }, 'настройка skill в харнессе'),
      h('p', { class: 's' }, 'Где лежит skill, что стоит в шапке, кто его запускает и какие права он получает. Эти настройки остаются у человека: в эстафету идёт только общий текст SKILL.md.'),
      h('div', { class: 'cols' },
        h('div', { class: 'rule' }, h('h3', null, 'как агент читает skill ', h('span', null, '· три слоя')),
          h('div', { class: 'layers' },
            h('div', null, h('b', null, 'name и description'), h('br'), 'в контексте всегда, около 100 токенов'),
            h('div', null, h('b', null, 'тело SKILL.md'), h('br'), 'грузится, когда skill включился: до 500 строк'),
            h('div', null, h('b', null, 'файлы и скрипты рядом'), h('br'), 'агент открывает по условию из текста'))),
        h('div', { class: 'rule' }, h('h3', null, 'папка skill ', h('span', null, '· что где лежит')),
          h('pre', { class: 'tree' },
            h('b', null, '.claude/skills/<имя>/'), '        Claude Code\n', h('b', null, '.agents/skills/<имя>/'), '        Codex\n',
            '├─ ', h('em', null, 'SKILL.md'), '        шапка и тело: идёт в эстафету\n',
            '├─ params.md       личные значения: остаются дома\n',
            '├─ references/     читается по ссылке из текста\n',
            '└─ scripts/        запускается точной командой'))),
      h('div', { class: 'cols' }, d.settings.map(function (x) { return block(x); })),
      h('h2', { id: 'evidence' }, 'что показывают замеры'),
      h('p', { class: 's' }, 'Цифры, на которые опираются правила про краткость, проверку и чтение чужого skill перед установкой. Столбики в пунктах доли решённых задач.'),
      h('div', { class: 'cols' }, d.evidence.map(function (x) { return block(x, true); })),
      h('h2', { id: 'sources' }, 'гайды, замеры и библиотеки'),
      h('div', { class: 'cols' },
        h('div', null, h('div', { class: 'lab', style: 'margin-top:18px' }, 'гайды'), h('div', { class: 'src' }, (src.guides || []).map(function (g) { return h('div', null, h('a', { class: 'q', href: g.url, rel: 'noopener', target: '_blank' }, g.title)); }))),
        h('div', null, h('div', { class: 'lab', style: 'margin-top:18px' }, 'замеры и исследования'), h('div', { class: 'src' }, (src.research || []).map(function (g) { return h('div', null, h('a', { class: 'q', href: g.url, rel: 'noopener', target: '_blank' }, g.title), ' · ' + g.note); })),
          h('div', { class: 'lab', style: 'margin-top:18px' }, 'библиотеки skills, по которым сверялись базовые skills'), h('div', { class: 'src' }, (src.libraries || []).map(function (g) { return h('div', null, h('a', { class: 'q', href: g.url, rel: 'noopener', target: '_blank' }, g.title), ' · ' + g.note); }))))]));
    var hash = location.hash.slice(1), el = hash && document.getElementById(hash === 'rules' ? 'kinds' : hash);
    if (el) el.scrollIntoView();
  }, function () { document.getElementById('page').replaceChildren(h('p', { class: 's' }, 'Книга правил не открылась: страница работает на сервере эстафеты.')); });
})();
