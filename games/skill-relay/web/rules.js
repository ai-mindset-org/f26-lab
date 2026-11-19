// книга эстафеты отдельным окном: правила с практикой и первоисточником, настройка skill в харнессе, замеры
(function () {
  'use strict';
  function flat(a) { return a.reduce(function (r, x) { return r.concat(Array.isArray(x) ? flat(x) : [x]); }, []); }
  function h(tag, attrs) {
    var e = document.createElement(tag), k, i, kids = [];
    for (k in (attrs || {})) { if (attrs[k] == null || attrs[k] === false) continue; if (k === 'class') e.className = attrs[k]; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); }
    for (i = 2; i < arguments.length; i++) kids.push(arguments[i]);
    flat(kids).forEach(function (c) { if (c != null && c !== false) e.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c))); });
    return e;
  }
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
    function refLinks(list) {
      return (list || []).map(function (k, i) {
        return [i ? ' · ' : '', keys[k] ? h('a', { class: 'q', href: keys[k].url, rel: 'noopener', target: '_blank' }, keys[k].title) : 'соглашение эстафеты'];
      });
    }
    function refs(list) { return h('div', { class: 'refs' }, refLinks(list)); }
    // наведение на правило: внизу справа видно, на чём оно основано, эти источники подсвечены в общем списке
    var dock = h('div', { class: 'dock', role: 'status' });
    document.body.appendChild(dock);
    function lit(sel, on) { Array.prototype.forEach.call(document.querySelectorAll(sel), function (e) { e.classList.toggle('lit', on); }); }
    function showRule(x) {
      lit('.lit', false);
      dock.classList.toggle('on', !!x);
      if (!x) return;
      (x.src || []).forEach(function (k) { lit('[data-key="' + k + '"]', true); });
      dock.replaceChildren(h('b', null, x.id + ' · ' + x.title), h('div', null, x.easy || ''),
        h('div', null, 'на чём основано: ', (x.src || []).map(function (k, i) { return (i ? ' · ' : '') + (keys[k] ? keys[k].title : 'соглашение эстафеты'); })));
    }
    function showSource(g) {
      lit('.lit', false);
      var cited = d.rules.filter(function (x) { return (x.src || []).indexOf(g.key) >= 0; });
      cited.forEach(function (x) { lit('#' + x.id, true); });
      dock.classList.add('on');
      dock.replaceChildren(h('b', null, g.title), h('div', null, cited.length ? 'на нём стоят правила: ' + cited.map(function (x) { return x.id; }).join(' · ') : 'общий фон книги: отдельных правил на нём нет'));
    }
    function srcRow(g, note) {
      return h('div', { 'data-key': g.key || '', onmouseenter: g.key ? function () { showSource(g); } : null, onmouseleave: function () { showRule(null); } },
        h('a', { class: 'q', href: g.url, rel: 'noopener', target: '_blank' }, g.title), note ? ' · ' + g.note : '');
    }
    // история правила в три кадра: тот же вид, что у версии на столе и при выборе правила
    function story(x) {
      var ex = x.ex || { was: [], now: [] };
      return window.ART.story({ part: x.part, id: x.id, ask: x.easy || x.ask, was: ex.was, now: ex.now, none: 'в части «' + part(x) + '» этого пока нет' });
    }
    function part(x) { return (PT[x.part] || {}).title || 'весь текст'; }
    function ruleBody(x) {
      return [
        h('h3', null, h('span', { class: 'id' }, x.id), x.title, ' ', kindTag(x.kind), h('span', { class: 'where' }, 'часть: ' + part(x))),
        story(x),
        h('p', null, h('b', null, 'вопрос. '), x.ask),
        h('p', null, h('b', null, 'изменение. '), x.fix),
        x.why ? h('p', { class: 'why' }, h('b', null, 'практика. '), x.why) : null,
        h('div', { class: 'refs' }, h('b', null, 'на чём основано: '), refLinks(x.src)),
        h('div', { class: 'refs' }, h('a', { class: 'q', href: 'try?rule=' + x.id }, 'применить к своему skill →'))];
    }
    function rule(x) {
      return h('div', { class: 'rule tale', id: x.id, onmouseenter: function () { showRule(x); }, onmouseleave: function () { showRule(null); } }, ruleBody(x));
    }
    // карта правил: поиск по словам, фильтр по виду изменения и по первоисточнику, сетка «часть файла → правила»
    function board() {
      var st = { q: '', kind: '', src: '', sel: '' };
      var cited = {};
      d.rules.forEach(function (x) { (x.src || []).forEach(function (k) { if (keys[k]) cited[k] = (cited[k] || 0) + 1; }); });
      var order = Object.keys(cited).sort(function (a, b) { return cited[b] - cited[a] || (a < b ? -1 : 1); });
      var top = cited[order[0]] || 1;
      var hay = {};
      d.rules.forEach(function (x) {
        hay[x.id] = [x.id, x.title, x.easy, x.ask, x.fix, x.why, (KT[x.kind] || {}).title, part(x), (x.ex ? x.ex.was.concat(x.ex.now) : []).join(' '),
          (x.src || []).map(function (k) { return keys[k] ? keys[k].title + ' ' + k : ''; }).join(' ')].join(' ').toLowerCase();
      });
      function ok(x) {
        if (st.kind && x.kind !== st.kind) return false;
        if (st.src && (x.src || []).indexOf(st.src) < 0) return false;
        return st.q.toLowerCase().split(/\s+/).filter(Boolean).every(function (w) { return hay[x.id].indexOf(w) >= 0; });
      }
      var input = h('input', { type: 'search', class: 'bq', placeholder: 'поиск: слово из правила, практики или источника', 'aria-label': 'поиск по правилам', autocomplete: 'off', spellcheck: 'false' });
      var count = h('span', { class: 'bcount', role: 'status' }), kinds = h('div', { class: 'bkinds' }), hint = h('p', { class: 'bhint' }), map = h('div', { class: 'bmap' }),
        srcs = h('div', { class: 'bsrc' }), detail = h('div', { class: 'bdetail rule tale' }), reset = h('button', { type: 'button', class: 'breset', onclick: function () { st.q = ''; st.kind = ''; st.src = ''; input.value = ''; paint(); } }, 'сбросить');
      input.addEventListener('input', function () { st.q = input.value; paint(); });
      function pick(id) { st.sel = id; paint(); }
      function paint() {
        var hits = d.rules.filter(ok), on = {};
        hits.forEach(function (x) { on[x.id] = 1; });
        if (!on[st.sel]) st.sel = hits.length ? hits[0].id : '';
        var filtered = !!(st.q || st.kind || st.src);
        count.textContent = filtered ? 'найдено ' + hits.length + ' из ' + d.rules.length : 'все правила: ' + d.rules.length;
        reset.hidden = !filtered;
        kinds.replaceChildren.apply(kinds, (d.kinds || []).map(function (k) {
          var n = d.rules.filter(function (x) { return x.kind === k.id; }).length;
          return h('button', { type: 'button', class: 'bk' + (st.kind === k.id ? ' sel' : ''), title: k.text, 'aria-pressed': st.kind === k.id ? 'true' : 'false',
            onclick: function () { st.kind = st.kind === k.id ? '' : k.id; paint(); } }, window.ART.kind(k.id), k.title, h('i', null, String(n)));
        }));
        var kd = (d.kinds || []).filter(function (k) { return k.id === st.kind; })[0];
        hint.replaceChildren.apply(hint, kd ? [h('b', null, kd.title + '. '), kd.text] : st.src && keys[st.src] ? [h('b', null, keys[st.src].title + '. '), 'Остались правила, которые стоят на этом источнике.'] :
          ['Вид изменения говорит, что правило делает с текстом skill. Строка сетки: часть файла SKILL.md, где правило лежит.']);
        map.replaceChildren.apply(map, (d.parts || []).map(function (pt) {
          var list = d.rules.filter(function (x) { return x.part === pt.id; });
          return h('div', { class: 'brow' + (list.some(function (x) { return on[x.id]; }) ? '' : ' dim') },
            h('div', { class: 'bpart' }, h('b', null, pt.title), h('span', null, pt.text)),
            h('div', { class: 'btiles' }, list.map(function (x) {
              return h('button', { type: 'button', class: 'bt' + (on[x.id] ? '' : ' off') + (st.sel === x.id ? ' sel' : ''), title: x.title, 'aria-pressed': st.sel === x.id ? 'true' : 'false',
                onclick: function () { pick(x.id); } }, window.ART.kind(x.kind), h('b', null, x.id), h('span', null, x.title));
            })));
        }));
        srcs.replaceChildren.apply(srcs, [h('div', { class: 'lab' }, h('b', null, 'первоисточники'), ' · нажми, чтобы оставить правила из одного')].concat(order.map(function (k) {
          var bar = h('i'); bar.style.width = Math.round(cited[k] / top * 100) + '%';
          return h('div', { class: 'bs' + (st.src === k ? ' sel' : '') },
            h('button', { type: 'button', 'aria-pressed': st.src === k ? 'true' : 'false', onclick: function () { st.src = st.src === k ? '' : k; paint(); } },
              h('span', { class: 'n' }, String(cited[k])), h('span', { class: 't' }, keys[k].title), h('span', { class: 'trk' }, bar)),
            h('a', { class: 'q', href: keys[k].url, rel: 'noopener', target: '_blank', title: 'открыть первоисточник' }, '↗'));
        })));
        var x = d.rules.filter(function (r) { return r.id === st.sel; })[0];
        detail.replaceChildren.apply(detail, x ? flat(ruleBody(x)).filter(function (c) { return c != null && c !== false; }).map(function (c) { return typeof c === 'object' ? c : document.createTextNode(String(c)); }) :
          [h('p', { class: 's' }, 'По этому запросу правил нет. Попробуй другое слово: «пример», «description», «остановка».')]);
      }
      var hash = location.hash.slice(1);
      if (d.rules.some(function (x) { return x.id === hash; })) st.sel = hash;
      var q0 = new URLSearchParams(location.search).get('q');
      if (q0) { st.q = q0; input.value = q0; }
      var k0 = new URLSearchParams(location.search).get('kind');
      if (k0 && (d.kinds || []).some(function (k) { return k.id === k0; })) st.kind = k0;
      paint();
      return h('section', { class: 'board', id: 'map' },
        h('h2', null, 'карта правил'),
        h('p', { class: 's' }, 'Каждое правило лежит в своей части SKILL.md и стоит на первоисточнике. Найди правило по слову, оставь один вид изменения или один источник, нажми на плитку: ниже откроется история правила в три кадра.'),
        h('div', { class: 'bstats' },
          h('div', null, h('b', null, String(d.rules.length)), 'правил'),
          h('div', null, h('b', null, String((d.kinds || []).length)), 'видов изменения'),
          h('div', null, h('b', null, String((d.parts || []).length)), 'мест в файле'),
          h('div', null, h('b', null, String(order.length)), 'первоисточников'),
          h('div', null, h('b', null, String(d.limits.changed)), 'строк за одно изменение')),
        h('div', { class: 'bbar' }, input, count, reset),
        kinds, hint,
        h('div', { class: 'bgrid' }, map, srcs),
        detail);
    }
    // пример правила: строка «было» и строки «стало»
    function example(x) {
      if (!x.ex) return null;
      return h('div', { class: 'ex' }, h('div', { class: 'exl' }, 'пример · ' + ((PT[x.part] || {}).title || '')),
        x.ex.was.map(function (t) { return h('div', { class: 'del' }, '− ' + t); }),
        x.ex.now.map(function (t) { return h('div', { class: 'add' }, '+ ' + t); }));
    }
    var PT = {};
    (d.parts || []).forEach(function (x) { PT[x.id] = x; });
    function chip(x) { return h('a', { class: 'rchip', href: '#' + x.id, title: x.title }, x.id); }
    // система: пять принципов, карта файла, путь одного правила
    function system() {
      var demo = d.rules.filter(function (x) { return x.id === 'G-09'; })[0] || d.rules[0];
      return [
        h('h2', { id: 'system' }, 'как устроена система'),
        h('p', { class: 's' }, 'Три слоя. Принципы отвечают, почему skill меняют по одному шагу. Карта показывает, в какой части файла живёт каждое правило. Путь правила показывает, как одно правило превращается в новую версию.'),
        h('div', { class: 'lab sys' }, h('b', null, '1 · пять принципов'), ' · из работ про то, как улучшают инструкции для агентов'),
        h('div', { class: 'princ' }, (d.principles || []).map(function (x, i) {
          return h('div', { class: 'pc', id: x.id }, h('i', null, '0' + (i + 1)), h('b', null, x.title), h('span', null, x.text), h('em', null, 'в игре: ' + x.game), refs(x.src));
        })),
        h('div', { class: 'lab sys' }, h('b', null, '2 · где правило лежит в SKILL.md'), ' · номер ведёт к правилу'),
        h('div', { class: 'fmap' }, (d.parts || []).map(function (x) {
          return h('div', { class: 'fp' + (x.id === 'whole' ? ' all' : '') },
            h('pre', null, x.line),
            h('div', { class: 'ft' }, h('b', null, x.title), h('span', null, x.text)),
            h('div', { class: 'fr' }, d.rules.filter(function (r) { return r.part === x.id; }).map(chip)));
        })),
        h('div', { class: 'lab sys' }, h('b', null, '3 · как одно правило применяется'), ' · на примере ' + demo.id),
        h('div', { class: 'path' },
          h('div', { class: 'ps' }, h('i', null, '01'), h('b', null, 'вопрос к тексту'), h('span', null, demo.ask)),
          h('div', { class: 'ps' }, h('i', null, '02'), h('b', null, 'одно изменение'), example(demo)),
          h('div', { class: 'ps' }, h('i', null, '03'), h('b', null, 'проверка'), h('span', null, 'Сервер ищет в тексте личное и секреты, считает строки: до ' + d.limits.changed + ' за раз. Разбор смотрит, применено ли правило и остался ли skill общим.')),
          h('div', { class: 'ps' }, h('i', null, '04'), h('b', null, 'оставить или откатить'), h('span', null, 'Принятое изменение становится версией v+1. Следующий берёт её и применяет своё правило.'),
            h('a', { class: 'btn', href: 'try?rule=' + demo.id }, 'попробовать на своём skill →')))];
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
        h('a', { class: 'q', href: '#map' }, 'карта правил'),
        h('a', { class: 'q', href: '#system' }, 'как устроена система'),
        h('a', { class: 'q', href: '#kinds' }, 'виды изменения · ' + (d.kinds || []).length),
        h('a', { class: 'q', href: '#settings' }, 'настройка skill в харнессе · ' + d.settings.length),
        h('a', { class: 'q', href: '#evidence' }, 'что показывают замеры · ' + d.evidence.length),
        h('a', { class: 'q', href: '#sources' }, 'гайды и библиотеки'),
        h('a', { class: 'q', href: 'try' }, 'попробовать на своём skill')),
      board(),
      system(),
      h('h2', { id: 'kinds-h' }, 'семь видов изменения'),
      h('div', { class: 'kinds', id: 'kinds' }, (d.kinds || []).map(function (k) {
        var n = d.rules.filter(function (x) { return x.kind === k.id; }).length;
        return h('a', { class: 'kcard', id: 'k-' + k.id, href: '?kind=' + k.id + '#map', title: 'показать на карте только этот вид' }, window.ART.kind(k.id), h('b', null, k.add), h('span', null, k.text), h('i', null, n + ' ' + (n === 1 ? 'правило' : n < 5 ? 'правила' : 'правил')));
      })),
      h('p', { class: 's' }, 'Нажми на вид: карта правил выше оставит только его правила.'),
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
        h('div', null, h('div', { class: 'lab', style: 'margin-top:18px' }, 'гайды'), h('div', { class: 'src' }, (src.guides || []).map(function (g) { return srcRow(g); }))),
        h('div', null, h('div', { class: 'lab', style: 'margin-top:18px' }, 'замеры и исследования'), h('div', { class: 'src' }, (src.research || []).map(function (g) { return srcRow(g, true); })),
          h('div', { class: 'lab', style: 'margin-top:18px' }, 'библиотеки skills, по которым сверялись базовые skills'), h('div', { class: 'src' }, (src.libraries || []).map(function (g) { return h('div', null, h('a', { class: 'q', href: g.url, rel: 'noopener', target: '_blank' }, g.title), ' · ' + g.note); }))))]));
    var hash = location.hash.slice(1), el = hash && document.getElementById(hash === 'rules' ? 'kinds' : hash);
    if (el) el.scrollIntoView();
  }, function () { document.getElementById('page').replaceChildren(h('p', { class: 's' }, 'Книга правил не открылась: страница работает на сервере эстафеты.')); });
})();
