// маленькие рисунки эстафеты: метафора у каждого правила, знак у каждого вида изменения, шаги «как это работает».
// Рисунок собирается из примитивов. Класс: '' чернила, 'a' оранжевая линия, 'af' оранжевая заливка, 'f' заливка чернилами,
// 'm' приглушённая линия, 'd' пунктир.
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, a) { var e = document.createElementNS(NS, tag), k; for (k in a) e.setAttribute(k, a[k]); return e; }
  function draw(w, h, items, cls) {
    var s = el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: w, height: h, class: 'art ' + (cls || ''), 'aria-hidden': 'true', focusable: 'false' });
    items.forEach(function (p) {
      var t = p[0], e;
      if (t === 'l') e = el('line', { x1: p[1], y1: p[2], x2: p[3], y2: p[4], class: p[5] || '' });
      else if (t === 'r') e = el('rect', { x: p[1], y: p[2], width: p[3], height: p[4], class: p[5] || '' });
      else if (t === 'c') e = el('circle', { cx: p[1], cy: p[2], r: p[3], class: p[4] || '' });
      else if (t === 'p') e = el('path', { d: p[1], class: p[2] || '' });
      else if (t === 't') { e = el('text', { x: p[1], y: p[2], class: p[4] || '' }); e.textContent = p[3]; }
      if (e) s.appendChild(e);
    });
    return s;
  }
  function arrow(x1, y, x2, cls) { return [['l', x1, y, x2, y, cls], ['p', 'M' + (x2 - 4) + ' ' + (y - 3) + 'L' + x2 + ' ' + y + 'L' + (x2 - 4) + ' ' + (y + 3), cls]]; }
  function lines(x, y, widths, gap, cls) { return widths.map(function (w, i) { return ['l', x, y + i * gap, x + w, y + i * gap, cls]; }); }
  function cat() { return Array.prototype.concat.apply([], arguments); }

  // метафоры правил, поле 96 × 64
  var RULE = {
    // ярлык на ящике: агент выбирает skill по одной строке
    'G-01': cat([0, 1, 2, 3].map(function (i) { return ['r', 8 + i * 21, 30, 17, 22, i === 2 ? '' : 'm']; }),
      [0, 1, 3].map(function (i) { return ['l', 12 + i * 21, 37, 21 + i * 21, 37, 'm']; }),
      [['r', 53, 34, 11, 6, 'af'], ['p', 'M58.5 10L58.5 24M54.5 20L58.5 24L62.5 20', 'a']]),
    // сито: остаётся строка, которой агент не знал
    'G-02': cat(lines(8, 18, [30, 24, 30, 20, 26], 7, 'm'), [['l', 8, 39, 28, 39, 'a']], arrow(46, 32, 58, ''), [['l', 66, 28, 88, 28, 'a'], ['l', 66, 36, 82, 36, '']]),
    // узкий мост и открытое поле
    'G-03': cat([['p', 'M6 44L6 30L18 30L18 44', ''], ['p', 'M34 44L34 30L46 30', ''], ['l', 18, 30, 34, 30, 'a'], ['c', 26, 30, 2.4, 'af'], ['l', 46, 30, 46, 44, '']],
      [[58, 22], [70, 18], [82, 24], [62, 34], [76, 32], [88, 38], [66, 46], [80, 46]].map(function (d) { return ['c', d[0], d[1], 1, 'f']; }),
      [['p', 'M56 44C62 30 70 40 78 26', 'd'], ['p', 'M58 50C70 44 76 52 90 30', 'd']]),
    // один вариант выбран заранее
    'G-04': cat([['c', 18, 22, 6, 'af'], ['c', 18, 42, 6, 'm'], ['c', 18, 56, 0, '']], arrow(28, 22, 86, 'a'), [['p', 'M26 42C44 42 46 30 58 30', 'd'], ['t', 62, 46, 'если …', 'tx']]),
    // шаг: вход, действие, выход
    'G-05': cat(arrow(6, 32, 30, 'a'), [['r', 32, 20, 32, 24, ''], ['l', 40, 29, 56, 29, ''], ['l', 40, 36, 50, 36, 'm']], arrow(66, 32, 90, 'a')),
    // форма с местами под блоки
    'G-06': [['r', 26, 6, 44, 52, ''], ['l', 32, 15, 52, 15, ''], ['r', 32, 22, 32, 8, 'd'], ['r', 32, 34, 32, 8, 'af'], ['r', 32, 46, 20, 6, 'd']],
    // вход и готовый выход рядом
    'G-07': cat([['r', 8, 12, 30, 40, 'm']], lines(13, 20, [20, 16, 20, 12, 18], 6, 'm'), arrow(42, 32, 54, 'a'), [['r', 58, 20, 30, 24, '']], lines(63, 28, [20, 14], 7, 'a')),
    // грабли на дорожке: по ним уже прошли
    'G-08': cat([['l', 6, 52, 90, 52, 'm'], ['p', 'M30 50L74 14', ''], ['p', 'M22 44L38 56', ''], ['l', 24, 46, 21, 50, ''], ['l', 28, 49, 25, 53, ''], ['l', 32, 52, 29, 56, '']],
      [['c', 74, 14, 2.6, 'af'], ['p', 'M80 8L84 4M82 14L88 14M76 6L76 1', 'a']], [[8, 50], [14, 48]].map(function (d) { return ['c', d[0], d[1], 1.2, 'f']; })),
    // список с отметками и строкой «дальше нельзя»
    'G-09': cat([0, 1, 2, 3].map(function (i) { return ['r', 20, 8 + i * 13, 8, 8, i === 2 ? 'a' : i === 3 ? 'm' : '']; }),
      [['p', 'M22 12L24 14L27 10', ''], ['p', 'M22 25L24 27L27 23', '']], [0, 1, 2, 3].map(function (i) { return ['l', 34, 12 + i * 13, 34 + [36, 28, 40, 30][i], 12 + i * 13, i === 2 ? 'a' : i === 3 ? 'm' : '']; })),
    // круг: сделал, проверил, не сошлось – назад
    'G-10': cat([['p', 'M48 12A20 20 0 1 0 68 32', ''], ['p', 'M44 8L48 12L44 16', ''], ['p', 'M62 32L68 26L74 32L68 38Z', 'a']], arrow(74, 32, 92, 'a'), [['p', 'M84 22L87 25L92 18', 'a']]),
    // три имени сходятся в одно
    'G-11': cat([['r', 6, 10, 22, 9, 'm'], ['r', 6, 28, 16, 9, 'm'], ['r', 6, 46, 26, 9, 'm'], ['p', 'M30 14C46 14 46 32 60 32', 'm'], ['l', 24, 32, 60, 32, 'm'], ['p', 'M34 50C48 50 46 32 60 32', 'm']],
      [['r', 62, 26, 28, 12, 'af']]),
    // дата заменена условием
    'G-12': cat([['r', 8, 16, 28, 30, 'm'], ['l', 8, 24, 36, 24, 'm'], ['l', 15, 12, 15, 19, 'm'], ['l', 29, 12, 29, 19, 'm'], ['l', 6, 50, 38, 12, '']], arrow(44, 32, 56, ''),
      [['p', 'M74 16L90 32L74 48L58 32Z', 'a'], ['t', 66, 35, 'если', 'tx ta']]),
    // главное сверху, редкое свернуто
    'G-13': cat([['r', 22, 6, 52, 52, ''], ['r', 28, 12, 40, 16, 'f']], lines(28, 35, [40, 30], 6, ''), [['p', 'M28 48L32 51L28 54Z', 'af'], ['l', 36, 51, 66, 51, 'd']]),
    // одна работа, вторая уходит в соседний skill
    'G-14': cat([['r', 8, 20, 30, 24, '']], arrow(38, 28, 88, 'a'), [['p', 'M38 38C50 38 52 50 62 50', 'd'], ['r', 64, 43, 22, 14, 'd'], ['l', 46, 34, 52, 44, '']]),
    // три мишени, на третьей skill молчит
    'G-15': cat([0, 1, 2].map(function (i) { return ['c', 18 + i * 30, 30, 11, i === 2 ? 'a' : '']; }), [0, 1].map(function (i) { return ['c', 18 + i * 30, 30, 3, 'f']; }),
      [['l', 70, 22, 86, 38, 'a'], ['p', 'M13 50L17 54L24 46', ''], ['p', 'M43 50L47 54L54 46', ''], ['l', 72, 50, 84, 50, 'a']]),
    // требование и его причина
    'G-16': cat([['r', 8, 14, 44, 12, 'f']], [['p', 'M30 26L30 40L44 40', 'a']], [['c', 54, 36, 2, 'af'], ['c', 60, 46, 2, 'af'], ['c', 48, 46, 2, 'af']], lines(68, 36, [20, 14], 8, 'a')),
    // граница и запасная калитка
    'G-17': cat([['r', 22, 10, 44, 44, 'd'], ['c', 44, 32, 4, 'f'], ['c', 82, 18, 4, 'm'], ['l', 78, 14, 86, 22, 'm'], ['l', 66, 38, 66, 48, 'a']], arrow(66, 43, 88, 'a')),
    // шлагбаум перед шагом с последствиями
    'G-18': cat([['l', 6, 40, 52, 40, ''], ['c', 14, 40, 3, 'f'], ['c', 34, 40, 3, 'f'], ['l', 54, 22, 54, 52, 'a'], ['l', 54, 26, 74, 20, 'a'], ['l', 60, 40, 90, 40, 'd'], ['c', 80, 40, 3, 'm']],
      [['c', 54, 10, 4, 'a'], ['p', 'M47 20C47 15 61 15 61 20', 'a']]),
    // параметры едут с skill, личные значения остаются дома
    'R-01': cat([['p', 'M8 32L24 18L40 32', ''], ['r', 12, 32, 24, 20, ''], ['c', 24, 42, 3.4, 'af']], [['r', 54, 22, 34, 24, '']], [['t', 59, 38, '{ … }', 'tx']], [['p', 'M40 50L52 50', 'd'], ['l', 44, 46, 48, 54, '']])
  };

  // знаки видов изменения, поле 16 × 16
  var KIND = {
    protocol: cat([0, 1, 2].map(function (i) { return ['c', 3, 4 + i * 4, 1, 'f']; }), [0, 1, 2].map(function (i) { return ['l', 6, 4 + i * 4, 14, 4 + i * 4, '']; })),
    logic: [['p', 'M2 8L7 8M7 8C10 8 10 4 14 4M7 8C10 8 10 12 14 12', '']],
    border: [['r', 3, 3, 10, 10, 'd'], ['c', 8, 8, 1.4, 'f']],
    example: [['r', 1.5, 4, 5, 8, ''], ['r', 9.5, 4, 5, 8, 'f']],
    rake: [['l', 8, 14, 8, 6, ''], ['l', 3, 6, 13, 6, ''], ['l', 3, 6, 3, 2, ''], ['l', 8, 6, 8, 2, ''], ['l', 13, 6, 13, 2, '']],
    check: [['c', 8, 8, 6, ''], ['p', 'M5 8L7.2 10.4L11 5.8', '']],
    trim: [['l', 2, 5, 14, 5, 'm'], ['l', 2, 11, 9, 11, ''], ['p', 'M12 9L10 11L12 13', '']]
  };

  // четыре шага «как это работает», поле 72 × 48
  var STEP = [
    cat([0, 1, 2, 3, 4].map(function (i) { return ['l', 8, 8 + i * 8, 64, 8 + i * 8, i === 2 ? '' : 'm']; }), [['c', 30, 24, 4, 'af']]),
    cat([['r', 18, 4, 36, 40, '']], lines(24, 12, [24, 18], 6, 'm'), [['l', 24, 25, 48, 25, 'a'], ['p', 'M10 25L14 25M12 23L12 27', 'a']], lines(24, 32, [20, 24], 6, 'm')),
    [['c', 36, 26, 17, ''], ['l', 36, 26, 36, 15, ''], ['p', 'M36 26L45 31', 'a'], ['l', 32, 5, 40, 5, ''], ['p', 'M36 9A17 17 0 0 1 53 26', 'a w']],
    cat([['l', 10, 24, 62, 24, 'm']], [0, 1, 2].map(function (i) { return ['c', 14 + i * 17, 24, 4, 'f']; }), [['c', 60, 24, 6, 'af'], ['t', 53, 42, 'v+1', 'tx ta']])
  ];

  var PART_T = { head: 'шапка', params: 'параметры', steps: 'шаги', format: 'формат', example: 'пример', rakes: 'грабли', check: 'проверка', border: 'границы' };
  // схема skill: восемь частей файла; hit – куда ляжет выбранное правило, fresh – что появилось после изменения
  function scheme(parts, o) {
    o = o || {};
    var box = document.createElement('div');
    box.className = 'sch' + (o.mini ? ' mini' : '');
    (parts || []).forEach(function (p) {
      var c = document.createElement('div'), fresh = (o.fresh || []).indexOf(p.id) >= 0, b, s;
      c.className = 'sp' + (p.on ? ' on' : '') + (o.hit === p.id || o.hit === 'whole' ? ' hit' : '') + (fresh ? ' new' : '');
      c.title = PART_T[p.id] + (p.on ? ' · строк ' + p.lines : ' · пока нет');
      if (!o.mini) {
        b = document.createElement('b'); b.textContent = PART_T[p.id];
        s = document.createElement('span'); s.textContent = fresh ? 'добавлено' : p.on ? p.lines + ' стр.' : 'нет';
        c.appendChild(b); c.appendChild(s);
      }
      box.appendChild(c);
    });
    return box;
  }

  // анимация входа: что значит взять skill. Одна дорожка, четыре кадра по кругу:
  // взял (skill закреплён) → одно правило → проверка → новая версия, её берёт следующий.
  // Кадр ставит JS атрибутом data-ph, движение и проявление делает CSS. Кадр можно выбрать подписью.
  var INTRO_MS = 2800;
  function intro(o) {
    o = o || {};
    var lock = o.lock || '5 мин';
    var CAP = [
      ['возьми skill', 'Свободный skill закрепляется за тобой на ' + lock + '. Пока идёт время, его правишь только ты.'],
      ['одно правило', 'Выбираешь одно правило из книги. Модель вносит в текст одно изменение: несколько строк.'],
      ['проверка', 'Сервер ищет в тексте личное и секреты, разбор смотрит, применено ли правило. Ты нажимаешь «закоммитить».'],
      ['новая версия', 'В дорожке лежит v+1 с твоим именем. Skill снова свободен: его берёт следующий.']
    ];
    var svg = el('svg', { viewBox: '0 0 560 172', class: 'art intro-art', role: 'img', 'aria-label': 'взять skill: закрепить за собой, применить одно правило, пройти проверку, передать новой версией' });
    function add(tag, a, on, cls) {
      var e = el(tag, a);
      if (cls) e.setAttribute('class', cls);
      if (on != null) e.setAttribute('data-on', on);
      svg.appendChild(e); return e;
    }
    function text(x, y, t, on, cls) { var e = add('text', { x: x, y: y }, on, 'tx ' + (cls || '')); e.textContent = t; return e; }
    // дорожка и принятые версии
    add('line', { x1: 24, y1: 70, x2: 536, y2: 70 }, null, 'm');
    [0, 1, 2].forEach(function (i) { add('circle', { cx: 60 + i * 56, cy: 70, r: 5 }, null, 'f'); text(52 + i * 56, 52, 'v' + i); });
    add('line', { x1: 60, y1: 70, x2: 228, y2: 70 });
    // голова дорожки: за тобой, потом принятая v3
    add('circle', { cx: 228, cy: 70, r: 15 }, '0,1,2', 'halo');
    add('circle', { cx: 228, cy: 70, r: 7 }, '0,1,2', 'af');
    add('circle', { cx: 228, cy: 70, r: 5 }, '3', 'f');
    text(220, 52, 'v3', '3');
    // время закрепления: полоса тает от кадра к кадру
    add('rect', { x: 192, y: 22, width: 72, height: 5 }, '0,1,2', 'm');
    add('rect', { x: 192, y: 22, width: 72, height: 5 }, '0,1,2', 'af bar');
    text(192, 15, 'закреплён · ' + lock, '0,1,2', 'ta');
    // ты и следующий
    var me = add('g', {}, '0,1,2', 'who me');
    me.appendChild(el('circle', { cx: 228, cy: 108, r: 9 }));
    me.appendChild(el('path', { d: 'M228 98L228 88M224 92L228 88L232 92', class: 'a' }));
    var t1 = el('text', { x: 244, y: 112, class: 'tx' }); t1.textContent = 'ты'; me.appendChild(t1);
    add('circle', { cx: 284, cy: 70, r: 7 }, '3', 'a');
    var nx = add('g', {}, '3', 'who next');
    nx.appendChild(el('circle', { cx: 284, cy: 108, r: 9, class: 'm' }));
    nx.appendChild(el('path', { d: 'M284 98L284 88M280 92L284 88L288 92', class: 'm' }));
    var t2 = el('text', { x: 300, y: 112, class: 'tx' }); t2.textContent = 'следующий'; nx.appendChild(t2);
    // правило: одна карточка из книги
    var rule = add('g', {}, '1,2', 'rulechip');
    rule.appendChild(el('rect', { x: 352, y: 6, width: 78, height: 32, class: 'a' }));
    rule.appendChild(el('line', { x1: 362, y1: 17, x2: 396, y2: 17, class: 'a' }));
    rule.appendChild(el('line', { x1: 362, y1: 27, x2: 418, y2: 27, class: 'm' }));
    var t3 = el('text', { x: 352, y: 54, class: 'tx ta' }); t3.textContent = 'одно правило'; rule.appendChild(t3);
    add('path', { d: 'M430 22C478 22 506 40 506 76M500 70L506 76L512 70' }, '1,2', 'a');
    // текст skill: старые строки на месте, одна новая
    var paper = add('g', {}, '1,2', 'paper');
    paper.appendChild(el('rect', { x: 424, y: 82, width: 112, height: 80 }));
    [0, 1, 2, 4].forEach(function (i) { paper.appendChild(el('line', { x1: 434, y1: 96 + i * 13, x2: 434 + [84, 66, 90, 0, 72][i], y2: 96 + i * 13, class: 'm' })); });
    paper.appendChild(el('line', { x1: 434, y1: 135, x2: 512, y2: 135, class: 'a newline' }));
    var t4 = el('text', { x: 424, y: 76, class: 'tx' }); t4.textContent = 'SKILL.md'; paper.appendChild(t4);
    // проверка
    var ok = add('g', {}, '2', 'okmark');
    ok.appendChild(el('circle', { cx: 396, cy: 122, r: 11, class: 'a' }));
    ok.appendChild(el('path', { d: 'M390 122L394.5 127L402 116', class: 'a' }));

    var box = document.createElement('div'), steps = document.createElement('div'), cap = document.createElement('p'), ph = -1, timer = 0;
    box.className = 'intro';
    steps.className = 'isteps'; cap.className = 'icap';
    var btns = CAP.map(function (c, i) {
      var b = document.createElement('button'), n = document.createElement('i');
      b.type = 'button'; n.textContent = '0' + (i + 1); b.appendChild(n); b.appendChild(document.createTextNode(c[0]));
      b.addEventListener('click', function () { show(i); clearInterval(timer); timer = setInterval(tick, INTRO_MS * 1.6); });
      steps.appendChild(b); return b;
    });
    function show(i) {
      ph = i; box.setAttribute('data-ph', i);
      Array.prototype.forEach.call(svg.querySelectorAll('[data-on]'), function (e) { e.classList.toggle('on', e.getAttribute('data-on').split(',').indexOf(String(i)) >= 0); });
      btns.forEach(function (b, k) { b.classList.toggle('on', k === i); });
      cap.textContent = CAP[i][1];
    }
    function tick() { if (box.isConnected && !document.hidden) show((ph + 1) % CAP.length); }
    box.appendChild(svg); box.appendChild(steps); box.appendChild(cap);
    var calm = o.still || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    show(calm ? 0 : 3);
    if (!calm) { setTimeout(function () { show(0); }, 60); timer = setInterval(tick, INTRO_MS); }
    return box;
  }

  // ---------- история изменения в три кадра ----------
  // один вид на карте правил, при выборе правила и у версии на столе: каким текст был, что говорит правило, каким стал
  var FILE = ['head', 'params', 'steps', 'format', 'example', 'rakes', 'check', 'border'];
  var PART = { head: 'шапка', params: 'параметры', steps: 'шаги', format: 'формат', example: 'пример', rakes: 'грабли', check: 'проверка', border: 'границы' };
  function hx(tag, cls) {
    var e = document.createElement(tag), i;
    if (cls) e.className = cls;
    function add(c) { if (c == null || c === false) return; if (Array.isArray(c)) return c.forEach(add); e.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c))); }
    for (i = 2; i < arguments.length; i++) add(arguments[i]);
    return e;
  }
  function fileArt(part, now) {
    return hx('div', 'fa' + (now ? ' now' : '') + (part === 'whole' ? ' all' : ''), hx('i', '', 'SKILL.md'),
      FILE.map(function (id) { return hx('span', id === part || part === 'whole' ? 'hit' : '', PART[id]); }));
  }
  function story(o) {
    var was = o.was || [], now = o.now || [];
    return hx('div', 'story',
      hx('div', 'fr', hx('em', '', '01 · было'), fileArt(o.part, false),
        hx('div', 'lines', was.length ? was.map(function (t) { return hx('div', 'del', t); }) : hx('div', 'none', o.none || 'в этой части этого пока нет'))),
      hx('div', 'fr mid', hx('em', '', '02 · правило ' + o.id), hx('div', 'fig', RULE[o.id] ? draw(96, 64, RULE[o.id], 'rule-art') : null), hx('div', 'ask', o.ask || '')),
      hx('div', 'fr', hx('em', '', '03 · стало'), fileArt(o.part, true),
        hx('div', 'lines', now.length ? now.map(function (t) { return hx('div', 'add', t); }) : hx('div', 'none', 'строк не добавлено: правило убирает лишнее'))));
  }

  window.ART = {
    scheme: scheme,
    intro: intro,
    story: story,
    partName: function (id) { return PART[id] || 'весь текст'; },
    rule: function (id) { return RULE[id] ? draw(96, 64, RULE[id], 'rule-art') : null; },
    kind: function (id) { return KIND[id] ? draw(16, 16, KIND[id], 'kind-art') : null; },
    step: function (i) { return draw(72, 48, STEP[i], 'step-art'); },
    has: function (id) { return !!RULE[id]; }
  };
})();
