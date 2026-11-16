/* F26 self-harness · layer 2: a skill on the harness (?layer=2, synonym ?layer=skills)
 * loads before app.js. without the parameter this file does nothing and app.js runs as before.
 * with it: the finished build without the people layer, a start card «2 · научить» (the four steps as one chain),
 * a caption on the graph, a play mode, and a panel with three tabs –
 * сегодня (one process in four guided steps, each lights its nodes),
 * блоки (eight switches that dim their nodes on the graph), онтология (three word lists).
 * state lives in the address: &tab=today|blocks|onto · &step=1..4 · &off=skills,desc,mirror,reviewer,routes · &on=log,eval,mcp
 * &play=1 plays the whole layer once (steps → blocks one by one → онтология); &intro=0 skips the start card
 */
(() => {
  'use strict';
  const qs = new URLSearchParams(location.search);
  if (!['2', 'skills'].includes(qs.get('layer'))) return;

  // key · name · what it is on the map · what happens without it · on by default
  const BLOCKS = [
    { k: 'skills', name: 'skills', map: 'все файлы skills/', out: 'инструкция каждый раз приходит заново из чата', def: true },
    { k: 'desc', name: 'описание', map: 'узел «description: когда брать» у skills', out: 'skill лежит в папке, агент не знает, когда его брать', def: true },
    { k: 'mirror', name: 'зеркало', map: '.claude/skills · .agents/skills', out: 'skill читает только один инструмент', def: true },
    { k: 'log', name: 'журнал запусков', map: 'logs/{log} skill runs.md · заготовка', out: 'правка правила не оставляет следа', def: false },
    { k: 'eval', name: 'карточка проверки', map: 'evals/{eval} call-digest.md · заготовка', out: 'два результата сравнивают на глаз', def: false },
    { k: 'reviewer', name: 'проверяющий агент', map: 'дорожка «обзор недели» и её узел-агент', out: 'автор сам принимает свою работу', def: true },
    { k: 'routes', name: 'маршруты', map: 'три маршрута под графом: чат, файл, папка', out: 'skill работает только там, где его написали', def: true },
    { k: 'mcp', name: 'внешние сервисы', map: 'MCP: транскрибатор, браузер, telegram · заготовка', out: 'skill работает только с тем, что уже лежит в папке', def: false },
  ];
  // three services outside the folder: label · the skill it feeds or serves · where it stands on the left edge (share of the stage height)
  const MCP = [
    ['l2:mcp-stt', 'mcp · транскрибатор', ['call-digest'], 0.15],
    ['l2:mcp-web', 'mcp · браузер', ['ask-my-context', 'context'], 0.25],
    ['l2:mcp-tg', 'mcp · telegram', ['weekly-review'], 0.35],
  ];
  const MECHANICS = [
    ['rule', 'файл, который агент читает всегда'],
    ['skill', 'файл, который агент берёт по описанию'],
    ['hub', 'файл, который ведёт к другим файлам'],
    ['свой слой', 'тот же принцип: файл, условие чтения, ссылки дальше'],
  ];
  const ALL_ON = 'все блоки на месте: skill находится, запускается и проверяется';
  const ROUTES = [['чат', 'текст skill вставлен в сообщение'], ['файл', 'SKILL.md приложен к запросу'], ['папка', 'агент находит skill сам']];
  // three ways to call a skill: by its name, by the words of the request (the description catches them), by an example of the result
  const CALLS = [['/call-digest', 'по имени'], ['по описанию', '«разбери вчерашний звонок»'], ['по примеру', '«сделай как в эталоне»']];
  const ENTITIES = [
    ['рутина', 'дело, которое повторяется каждую неделю'],
    ['вход', 'файл или фрагмент, с которым работает skill'],
    ['skill', 'инструкция в SKILL.md: когда брать, правило, как сверить'],
    ['правило', 'одна строка, которую можно поменять и проверить'],
    ['запуск', 'один проход skill по одному входу'],
    ['проверка', 'два запуска на одном входе и строка сверки'],
    ['журнал', 'что меняли и что стало с результатом'],
    ['маршрут', 'где это запускается: чат, файл, папка с агентом'],
  ];
  const ABSTRACTIONS = [
    ['триггер и инструкция', 'description говорит, когда брать skill, тело говорит, что делать', 'https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview'],
    ['степень свободы', 'чем хрупче шаг, тем жёстче инструкция', 'https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices'],
    ['постепенное раскрытие', 'описание всегда на виду, тело при включении, файлы по ссылке', 'https://agentskills.io/specification'],
    ['четыре носителя', 'файл правил знает всегда, skill на случай, субагент исполняет отдельно, MCP даёт доступ наружу', 'https://code.claude.com/docs/en/features-overview'],
    ['цепочка', 'один skill передаёт работу другому через файлы', 'https://claudelab.net/en/articles/claude-code/claude-code-skill-composition'],
    ['цикл проверки', 'тот же запрос без skill и со skill, сверка по пунктам', 'https://agentskills.io/skill-creation/evaluating-skills'],
    ['место и жизнь', 'личная папка, проект, команда', 'https://code.claude.com/docs/en/skills'],
  ];
  const TABS = [['today', 'сегодня'], ['blocks', 'блоки'], ['onto', 'онтология']]; // сборка убрана 16.11: повтор сборки уже есть на основном экране
  // the guided path of the day: name · the line · the second line · nodes that pulse · nodes that only stay bright
  const pathOf = (d) => (d.file && d.file.path) || '';
  const digest = (d) => /^skills\/.*call-digest/.test(pathOf(d));
  const STEPS = [
    { k: 'процесс', c: 'след работы: расшифровка звонка', p: 'практика 1 · нарисуй свой процесс', a: 'звонок прошёл, в папке лежит расшифровка', b: 'с этого начинается любая рутина: есть работа и её след',
      hot: (d) => /^raw\/.*call/.test(pathOf(d)) || pathOf(d).startsWith('meetings/'), warm: (d) => pathOf(d).startsWith('raw/') },
    { k: 'рутина', c: 'шаг, который повторяется каждую неделю', p: 'практика 1 · отметь повторяющийся шаг', a: 'после каждого звонка одно и то же: решения, обязательства, сроки', b: 'повторяется каждую неделю, значит можно описать один раз',
      hot: (d) => pathOf(d).startsWith('routines/'), warm: () => false },
    { k: 'skill', c: 'SKILL.md: когда брать, шаги, как сверить', p: 'практика 2 · из рутины в skill', a: 'рутина записана как skill call-digest', b: 'три части: когда брать, шаги, как сверить',
      hot: (d) => digest(d) || d.id === 'l2:desc', warm: (d) => pathOf(d).startsWith('skills/') },
    { k: 'сверка', c: 'запуск, эталон, строка в журнале', p: 'практика 3 · skill против эталона', a: 'запускаю skill на прошлом звонке и сравниваю с эталоном', b: 'одна правка правила, второй запуск, строка в журнале',
      hot: (d) => digest(d) || d.id === 'l2:eval' || d.id === 'l2:log', warm: () => false },
  ];
  const PROVEN = ['log', 'eval']; // step 4 draws these two stubs solid

  // ---------- state from the address ----------
  const csv = (k) => (qs.get(k) || '').split(',').map((x) => x.trim()).filter((x) => BLOCKS.some((b) => b.k === x));
  const askedOn = csv('on'), askedOff = csv('off');
  const on = {};
  for (const b of BLOCKS) on[b.k] = (b.def || askedOn.includes(b.k)) && !askedOff.includes(b.k);
  // the consequence line follows the block switched off last; at start – the ones off by default, then &off= in its order
  let offOrder = [...BLOCKS.filter((b) => !on[b.k] && !askedOff.includes(b.k)).map((b) => b.k), ...askedOff.filter((k, i) => askedOff.indexOf(k) === i)];
  let tab = TABS.some(([k]) => k === qs.get('tab')) ? qs.get('tab') : 'today';
  let step = Math.min(STEPS.length, Math.max(1, parseInt(qs.get('step'), 10) || 1));
  const forced = (k) => tab === 'today' && step === STEPS.length && PROVEN.includes(k);
  const lit = (k) => on[k] || forced(k);
  function writeAddress() {
    const p = new URLSearchParams(location.search);
    ['tab', 'step', 'off', 'on', 'play', 'intro'].forEach((k) => p.delete(k));
    const off = BLOCKS.filter((b) => b.def && !on[b.k]).map((b) => b.k);
    const extra = BLOCKS.filter((b) => !b.def && on[b.k]).map((b) => b.k);
    const q = `${p.toString()}&tab=${tab}${tab === 'today' ? `&step=${step}` : ''}${off.length ? `&off=${off.join(',')}` : ''}${extra.length ? `&on=${extra.join(',')}` : ''}`;
    try { history.replaceState(null, '', `${location.pathname}?${q}${location.hash}`); } catch { /* a file:// page keeps its address */ }
  }

  // ---------- panel ----------
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  document.body.classList.add('l2');
  const back = document.getElementById('l2link');
  if (back) { back.textContent = '← 1 · собрать'; back.setAttribute('href', location.pathname.split('/').pop() || './'); back.title = 'обычный режим: сборка по фазам, все слои'; }

  const panel = document.createElement('div');
  panel.className = 'panel'; panel.id = 'l2P';
  panel.innerHTML = `<h2><span>слой 2 · научить</span><button type="button" id="l2Play" class="l2-play" title="проиграть слой 2: шаги, блоки по одному, онтология">▶ проиграть</button><em id="l2Count"></em></h2>
    <div class="l2-tabs" role="tablist">${TABS.map(([k, t]) => `<button type="button" role="tab" data-l2tab="${k}">${t}</button>`).join('')}</div>
    <div class="l2-body">
      <div class="l2-pane" data-l2pane="today">
        <div class="l2-rail">${STEPS.map((s, i) => `<button type="button" data-l2step="${i + 1}">${i + 1} ${s.k}</button>`).join('')}</div>
        <div class="l2-step" aria-live="polite"><span id="l2StepTag"></span><p class="l2-lead" id="l2StepA"></p><p id="l2StepB"></p></div>
        <div class="l2-nav"><button type="button" id="l2Prev">← назад</button><button type="button" class="l2-go" id="l2Next">дальше →</button></div>
        <p class="cap" id="l2StepP"></p>
      </div>
      <div class="l2-pane" data-l2pane="blocks">
        <div class="l2-list">${BLOCKS.map((b) => `<button type="button" class="l2-b" data-b="${b.k}" aria-pressed="true"><i></i><span><b>${esc(b.name)}</b><small>${esc(b.map)}</small></span><em></em></button>`).join('')}</div>
        <div class="l2-out" aria-live="polite"><span id="l2Tag"></span><p id="l2Out"></p></div>
        <p class="cap">пунктир на карте – блок выключен. три заготовки: в наборе их пока нет</p>
      </div>
      <div class="l2-pane" data-l2pane="onto">
        <h3>восемь сущностей</h3>
        <dl class="l2-dl l2-short">${ENTITIES.map(([w, d]) => `<dt>${esc(w)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>
        <h3>одна механика</h3>
        <dl class="l2-dl l2-short">${MECHANICS.map(([w, d]) => `<dt>${esc(w)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>
        <h3>семь абстракций</h3>
        <dl class="l2-dl">${ABSTRACTIONS.map(([w, d, u]) => `<dt><a href="${esc(u)}" target="_blank" rel="noopener" title="источник: ${esc(u)}">${esc(w)}&nbsp;↗</a></dt><dd>${esc(d)}</dd>`).join('')}</dl>
      </div>
    </div>`;
  const colR = document.getElementById('colR');
  colR.insertBefore(panel, colR.firstChild);

  // routes: three chips under the graph
  const routes = document.createElement('div');
  routes.id = 'l2Routes';
  routes.innerHTML = `<i>маршруты</i>${ROUTES.map(([w, d]) => `<span><b>${w}</b> · ${d}</span>`).join('')}`;
  document.getElementById('colC').appendChild(routes);
  const calls = document.createElement('div');
  calls.id = 'l2Call';
  calls.innerHTML = `<i>позвать</i>${CALLS.map(([w, d]) => `<span><b>${esc(w)}</b> · ${esc(d)}</span>`).join('')}`;
  document.getElementById('colC').appendChild(calls);

  // caption on the graph: what the lit nodes are, in the words of the step or of the block just switched
  const cap = document.createElement('div');
  cap.id = 'l2Cap'; cap.setAttribute('aria-hidden', 'true');
  cap.innerHTML = '<span></span><b></b><small></small>';
  document.getElementById('stage').appendChild(cap);
  let capBlock = null; // the block clicked or played last
  function paintCap(st, n) {
    let t = '', a = '', b = '';
    if (tab === 'today') { t = `${step} · ${st.k}`; a = st.a; b = st.b; }
    else if (tab === 'blocks') {
      const k = BLOCKS.find((x) => x.k === capBlock);
      if (k) { t = `${on[k.k] ? '+' : '–'} ${k.name} · ${n}/${BLOCKS.length}`; a = on[k.k] ? k.map : k.out; }
      else { t = `блоки · ${n}/${BLOCKS.length}`; a = n === BLOCKS.length ? ALL_ON : 'выключи блок справа – на графе видно, что пропадает'; }
    }
    cap.hidden = !t;
    cap.children[0].textContent = t; cap.children[1].textContent = a; cap.children[2].textContent = b;
  }

  // ---------- graph: the nodes of a block that is off turn into dashed ghosts ----------
  const G = { nodeSel: null, linkSel: null };
  const blockOf = (d) => d.block || (d.file && d.file.path.startsWith('skills/') ? 'skills' : d.id === 'agent:reviewer' ? 'reviewer' : null);
  const isOff = (d) => { const k = d && blockOf(d); return !!k && !lit(k); };
  // the services stand pinned on the left edge under the caption strip, clear of the labels of the folder
  function pin(d) {
    const r = document.getElementById('stage').getBoundingClientRect();
    d.fx = Math.max(62, Math.max(320, r.width) * 0.085); d.fy = Math.max(300, r.height) * d.at;
  }
  window.addEventListener('resize', () => { if (G.nodeSel) G.nodeSel.each((d) => { if (d.block === 'mcp') pin(d); }); });
  function repaint() {
    if (!G.nodeSel) return;
    const byId = new Map(G.nodeSel.data().map((d) => [d.id, d]));
    const end = (x) => (x && typeof x === 'object' ? x : byId.get(x));
    G.nodeSel.classed('ghost', (d) => d.layer === 'ghost' || isOff(d)).classed('l2off', isOff);
    G.linkSel.classed('l2off', (l) => isOff(end(l.source)) || isOff(end(l.target)));
    // «сегодня»: the nodes of the step pulse, the rest of the map steps back
    const st = tab === 'today' ? STEPS[step - 1] : null;
    G.nodeSel.classed('l2dim', (d) => !!st && !st.hot(d) && !st.warm(d));
    G.linkSel.classed('l2dim', (l) => { const a = end(l.source), b = end(l.target); return !!st && !(a && b && (st.hot(a) || st.hot(b))); });
    G.nodeSel.selectAll('circle.l2focus').remove();
    if (st) G.nodeSel.filter(st.hot).insert('circle', 'path').attr('class', 'l2focus').attr('r', 14);
  }

  function paintPanel() {
    panel.querySelectorAll('[data-l2tab]').forEach((b) => { const sel = b.dataset.l2tab === tab; b.classList.toggle('on', sel); b.setAttribute('aria-selected', sel); });
    panel.querySelectorAll('[data-l2pane]').forEach((p) => { p.hidden = p.dataset.l2pane !== tab; });
    document.body.classList.toggle('l2-tab-onto', tab === 'onto'); // the word lists take the whole column
    for (const b of BLOCKS) {
      const el = panel.querySelector(`.l2-b[data-b="${b.k}"]`);
      el.setAttribute('aria-pressed', on[b.k]);
      el.querySelector('em').textContent = on[b.k] ? 'вкл' : 'выкл';
      document.body.classList.toggle(`l2-off-${b.k}`, !on[b.k]);
    }
    const st = STEPS[step - 1];
    panel.querySelectorAll('[data-l2step]').forEach((b) => { const cur = +b.dataset.l2step === step; b.classList.toggle('on', cur); b.setAttribute('aria-current', cur ? 'step' : 'false'); });
    document.getElementById('l2StepTag').textContent = `шаг ${step} из ${STEPS.length} · ${st.k}`;
    document.getElementById('l2StepA').textContent = st.a;
    document.getElementById('l2StepB').textContent = st.b;
    document.getElementById('l2StepP').textContent = `в деке сегодня: ${st.p}`;
    document.getElementById('l2Prev').disabled = step === 1;
    document.getElementById('l2Next').textContent = step === STEPS.length ? 'блоки →' : 'дальше →';
    const n = BLOCKS.filter((b) => lit(b.k)).length;
    document.getElementById('l2Count').textContent = `${n}/${BLOCKS.length}`;
    const last = BLOCKS.find((b) => b.k === offOrder[offOrder.length - 1]);
    document.getElementById('l2Tag').textContent = last ? `выключено · ${last.name}` : `${n} из ${BLOCKS.length}`;
    document.getElementById('l2Out').textContent = last ? last.out : ALL_ON;
    panel.querySelector('.l2-out').classList.toggle('all', !last);
    paintCap(st, n);
    repaint();
  }
  function setTab(t) { tab = t; paintPanel(); writeAddress(); }
  function setStep(n) { step = Math.min(STEPS.length, Math.max(1, n)); paintPanel(); writeAddress(); }

  const ring = (k) => { if (G.nodeSel) G.nodeSel.filter((d) => blockOf(d) === k).append('circle').attr('class', 'ring').attr('r', 6).on('animationend', function () { this.remove(); }); };

  // ---------- play: the four steps, then the eight blocks switched on one by one, then the words ----------
  let playing = false, playT = null;
  const playBtn = panel.querySelector('#l2Play');
  function stopPlay() { playing = false; clearTimeout(playT); playBtn.textContent = '▶ проиграть'; document.body.classList.remove('l2-playing'); }
  function play() {
    stopPlay(); playing = true; playBtn.textContent = '■ стоп'; document.body.classList.add('l2-playing');
    const seq = STEPS.map((_, i) => [4600, () => { tab = 'today'; step = i + 1; }]);
    // all off, the next block to come is the last in offOrder, so the panel names what is still missing
    seq.push([1800, () => { for (const b of BLOCKS) on[b.k] = false; offOrder = BLOCKS.map((b) => b.k).reverse(); capBlock = null; tab = 'blocks'; }]);
    for (const b of BLOCKS) seq.push([2400, () => { on[b.k] = true; offOrder = offOrder.filter((x) => x !== b.k); capBlock = b.k; ring(b.k); }]);
    seq.push([3200, () => { capBlock = null; }]);
    seq.push([0, () => { tab = 'onto'; }]);
    let i = 0;
    const tick = () => { if (!playing) return; const [ms, fn] = seq[i++]; fn(); paintPanel(); writeAddress(); if (i < seq.length) playT = setTimeout(tick, ms); else stopPlay(); };
    tick();
  }

  let api = null;
  panel.addEventListener('click', (e) => {
    if (e.target.closest('#l2Play')) { if (playing) stopPlay(); else play(); return; }
    if (playing) stopPlay(); // any other click takes the panel back by hand
    const t = e.target.closest('[data-l2tab]');
    if (t) { setTab(t.dataset.l2tab); return; }
    const s = e.target.closest('[data-l2step]');
    if (s) { setStep(+s.dataset.l2step); return; }
    if (e.target.closest('#l2Prev')) { setStep(step - 1); return; }
    if (e.target.closest('#l2Next')) {
      if (step < STEPS.length) { setStep(step + 1); return; }
      // the last step hands over to «блоки» with the two stubs it has just drawn solid left on
      for (const k of PROVEN) on[k] = true;
      offOrder = offOrder.filter((x) => !PROVEN.includes(x));
      setTab('blocks'); return;
    }
    const b = e.target.closest('.l2-b');
    if (b) {
      const k = b.dataset.b;
      on[k] = !on[k];
      offOrder = offOrder.filter((x) => x !== k);
      if (!on[k]) offOrder.push(k);
      capBlock = k;
      paintPanel(); writeAddress();
      ring(k); // the same orange ring a fresh file gets: shows where the block sits on the map
      return;
    }
  });
  paintPanel();

  // ---------- start card «2 · научить»: the chain of the day, how to call, two ways in ----------
  const intro = document.createElement('div');
  intro.id = 'l2Intro'; intro.setAttribute('role', 'dialog'); intro.setAttribute('aria-modal', 'true'); intro.setAttribute('aria-labelledby', 'l2InTitle');
  intro.innerHTML = `<div class="card">
    <div class="st-hd"><span>AI Mindset · Fall ’26 Lab · неделя 2</span><span>fig. 2.0</span></div>
    <h3 id="l2InTitle">2 · научить: рутина становится skill</h3>
    <p>в папке из недели 1 появляется skill – файл, который агент берёт по описанию, запускает на входе и сверяет с эталоном. пример слоя – разбор звонка <code>call-digest</code>.</p>
    <ol class="l2-chain">${STEPS.map((s, i) => `<li><b>${i + 1} ${esc(s.k)}</b><small>${esc(s.c)}</small></li>`).join('')}</ol>
    <p class="l2-then">дальше на графе – восемь блоков, которые держат skill в системе: описание, зеркало, журнал, проверка, проверяющий агент, маршруты, внешние сервисы</p>
    <div class="l2-calls"><i>позвать</i>${CALLS.map(([w, d]) => `<span><b>${esc(w)}</b> · ${esc(d)}</span>`).join('')}</div>
    <div class="l2-in-go"><button type="button" class="l2-go" id="l2InPlay">▶ проиграть · 50 с</button><button type="button" id="l2InSteps">по шагам →</button></div>
  </div>`;
  document.body.appendChild(intro);
  intro.hidden = qs.has('tab') || qs.has('step') || qs.get('intro') === '0' || qs.get('play') === '1';
  const closeIntro = (go) => { intro.hidden = true; if (go) go(); };
  intro.addEventListener('click', (e) => {
    if (e.target.closest('#l2InPlay')) closeIntro(play);
    else if (e.target.closest('#l2InSteps')) closeIntro(() => { step = 1; setTab('today'); });
    else if (!e.target.closest('.card')) closeIntro();
  });
  window.addEventListener('keydown', (e) => {
    if (!intro.hidden) {
      if (e.key === 'Escape') { e.preventDefault(); closeIntro(); }
      else if (e.key === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); closeIntro(play); }
      return;
    }
    if (e.key === 'Escape' && playing) stopPlay();
  }, true);
  if (!intro.hidden) intro.querySelector('#l2InPlay').focus();
  if (qs.get('play') === '1') setTimeout(play, 900);

  // ---------- what app.js asks for ----------
  window.F26L2 = {
    // shapes for the nodes this layer adds to the map
    layers: {
      l2desc: { label: 'описание', sym: 'circle', fill: true, size: 70, glyph: '•', ax: 0.42, ay: -0.1 },
      l2mirror: { label: 'зеркало', sym: 'square', fill: false, size: 120, glyph: '□', ax: 0.2, ay: -0.2 },
      l2log: { label: 'журнал', sym: 'gate', fill: false, size: 130, glyph: '⊓', ax: 0.6, ay: -0.24 },
      l2eval: { label: 'проверка', sym: 'triangle', fill: true, size: 150, glyph: '▲', ax: 0.64, ay: -0.4 },
      l2mcp: { label: 'внешний сервис', sym: 'wye', fill: false, size: 140, glyph: 'Y', ax: -0.92, ay: -0.6 },
    },
    veilNarr: 'people/ · карточка человека, в слое 2 скрыта',
    // extra nodes once skills/ exists: description, two mirrors, and two stubs the kit has no files for yet
    extend(nodes, links, files) {
      const skills = [...files.keys()].filter((p) => p.startsWith('skills/'));
      if (!skills.length) return;
      nodes.push({ id: 'l2:desc', layer: 'l2desc', title: 'description: когда брать', block: 'desc', pad: 72 });
      for (const p of skills) links.push({ source: 'l2:desc', target: p, kind: 'wiki' });
      for (const [id, title] of [['l2:claude', '.claude/skills'], ['l2:agents', '.agents/skills']]) {
        nodes.push({ id, layer: 'l2mirror', title, block: 'mirror', pad: 46 });
        links.push({ source: id, target: 'l2:desc', kind: 'wiki' });
      }
      const digest = skills.find((p) => p.includes('call-digest')) || skills[0];
      nodes.push({ id: 'l2:log', layer: 'l2log', title: 'logs/{log} skill runs.md', block: 'log', pad: 80 });
      nodes.push({ id: 'l2:eval', layer: 'l2eval', title: 'evals/{eval} call-digest.md', block: 'eval', pad: 88 });
      links.push({ source: 'l2:log', target: digest, kind: 'wiki' }, { source: 'l2:eval', target: digest, kind: 'wiki' }, { source: 'l2:log', target: 'l2:eval', kind: 'wiki' });
      const checks = [...files.keys()].find((p) => p.startsWith('evals/') && p.includes('checks'));
      if (checks) links.push({ source: 'l2:eval', target: checks, kind: 'wiki' });
      for (const [id, title, wants, at] of MCP) {
        const n = { id, layer: 'l2mcp', title, block: 'mcp', pad: 62, at }; pin(n); nodes.push(n);
        const to = wants.map((w) => skills.find((p) => p.includes(w))).find(Boolean);
        if (to) links.push({ source: id, target: to, kind: 'wiki' });
      }
    },
    paint(nodeSel, linkSel) { G.nodeSel = nodeSel; G.linkSel = linkSel; repaint(); },
    mount(a) { api = a; },
    ended() { /* the build tab is gone since 16.11: nothing to hand over */ },
  };
})();
