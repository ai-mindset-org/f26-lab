/* F26 self-harness · layer 3 «отпустить» (?layer=3, synonym ?layer=release), version 3
 * loads before app.js and answers the same interface as layer2.js (window.F26L2), so app.js stays unchanged.
 * the words follow the W3 materials page (f26-w3.lab.aimindset.org): five phases, five blocks, three loops,
 * one journal, one example – the fictional session «сводка обещаний со звонков недели».
 * panel tabs: путь (five phases, each with its trace) · блоки (five switches) · петли (three loops).
 * state lives in the address: &tab=path|blocks|loops · &step=1..5 · &off=… · &play=1 · &intro=0
 */
(() => {
  'use strict';
  const qs = new URLSearchParams(location.search);
  if (!['3', 'release'].includes(qs.get('layer'))) return;

  const W3 = 'https://f26-w3.lab.aimindset.org/';
  const SEC = { source: 'пример', decisions: 'карта решений', tree: 'дерево решений', path: 'путь задачи', kit: 'пакет для LMS', hw: 'домашка' };
  const w3 = (id) => `<a href="${W3}#${id}" target="_blank" rel="noopener">${SEC[id]}&nbsp;↗</a>`;

  // the one example of the evening, the same as #source on the W3 page
  const EX = {
    task: 'сводка обещаний со звонков недели',
    rule: 'сводка обещаний: только мои, одна строка – кому · что · день недели, группировать по людям',
    cmd: 'claude -p "собери мои обещания со звонков прошлой недели в сводка.md по правилу из CLAUDE.md"',
    when: 'каждый понедельник 08:30',
  };
  const pathOf = (d) => (d.file && d.file.path) || '';
  const isSkill = (d) => /^skills\/.*call-digest/.test(pathOf(d));
  const isRules = (d) => pathOf(d) === 'AGENTS.md';
  const isCalls = (d) => /^raw\/.*call/.test(pathOf(d)) || pathOf(d).startsWith('meetings/');

  // five phases of a task: name · question · trace · where to look (W3 section) · the example · the trace as a file · graph focus
  const STEPS = [
    { k: 'разбираюсь', q: 'что хочу и что уже есть?', t: 'заметка: цель и вход', look: 'source',
      a: 'источник – обычная сессия с агентом: 12 твоих ходов и 131 шаг агента между ними', b: 'вход примера: записи звонков недели и календарь',
      f: 'заметка · цель и вход', x: 'цель: что я обещал на звонках недели\nвход: записи звонков, календарь\nисточник: одна сессия, пн 09:02–10:05',
      hot: (d) => isCalls(d) || pathOf(d).startsWith('sessions/'), warm: (d) => pathOf(d).startsWith('raw/') },
    { k: 'ясно', q: 'что делаем и как пойму, что вышло?', t: 'пять строк: цель, вход, выход, проверка, срок', look: 'tree',
      a: 'развилки задачи: что считать обещанием, откуда брать звонки, как записать, как проверить, как часто', b: 'одна развилка остаётся туманом: обещание без срока – спрашивать или пропускать',
      f: 'пять строк', x: 'цель: мои обещания за неделю\nвход: записи звонков и календарь\nвыход: сводка.md, строки по людям\nпроверка: сверка с календарём\nсрок: понедельник утром',
      hot: (d) => pathOf(d).startsWith('decisions/'), warm: isCalls },
    { k: 'делаю с агентом', q: 'выходит ли руками?', t: 'два ручных прогона', look: 'decisions',
      a: 'на карте решений четыре хода – один и тот же формат: только мои, одной строкой, днём недели, по людям', b: 'четыре повтора становятся одной строкой правила в CLAUDE.md или AGENTS.md',
      f: 'строка правила', x: EX.rule,
      hot: (d) => isRules(d) || isSkill(d) || d.id === 'l3:agent', warm: (d) => pathOf(d).startsWith('skills/') },
    { k: 'работает само', q: 'что происходит без меня?', t: 'строка журнала на каждый запуск', look: 'path',
      a: `правило стало командой, команда встала на расписание: ${EX.when}`, b: 'каждый запуск сам пишет строку журнала: время, статус, что сделал',
      f: 'команда и расписание', x: `${EX.cmd}\n\nкогда: ${EX.when}\nстоп: пауза в Scheduled или файл STOP рядом с командой`,
      hot: (d) => ['l3:when', 'l3:agent', 'l3:log'].includes(d.id), warm: (d) => isRules(d) || isSkill(d) },
    { k: 'пересматриваю', q: 'оставить, поправить, руками или выключить?', t: 'одно решение недели', look: 'hw',
      a: 'раз в неделю читаешь строки журнала и решаешь одно', b: 'в примере понедельник без строки: расписание не проснулось, это видно по пропуску',
      f: 'журнал', x: 'время     статус      что сделал\nпн 08:30  ok          6 звонков · 11 обещаний · сводка.md\nпн 08:30  ok          0 звонков · пропуск\nпн 08:30  нет строки  расписание не проснулось: проверить',
      hot: (d) => ['l3:log', 'l3:screen'].includes(d.id), warm: (d) => pathOf(d).startsWith('decisions/') },
  ];
  // five blocks of an automation, the same as «как устроено» on the W3 page
  const BLOCKS = [
    { k: 'when', name: '1 · когда', map: 'триггер: время («каждый пн 08:30») или событие («пришло письмо»)', out: 'запуск случается, только когда ты вспомнил' },
    { k: 'what', name: '2 · что', map: 'инструкция: правило, skill или промпт – как делать по-твоему', out: 'агент каждый раз решает заново, и формат снова на тебе' },
    { k: 'who', name: '3 · кто и где', map: 'агент: в открытой сессии, на компьютере или в облаке', out: 'расписание просыпается, а выполнить некому' },
    { k: 'log', name: '4 · что осталось', map: 'след: журнал пишется сам, строка на каждый запуск', out: 'рутина падает молча: пропуск никто не замечает' },
    { k: 'screen', name: '5 · где видно', map: 'экран: что случилось и можно ли верить результату', out: 'чтобы понять, жива ли рутина, надо читать файлы руками' },
  ];
  const ALL_ON = 'все пять блоков на месте: запуск по расписанию, правило, агент, журнал и экран';
  // three loops of control
  const LOOPS = [
    ['петля 1 · минуты', 'ход агента', 'агент ищет, делает, проверяет, и так десятки шагов. точка контроля – твой следующий ход', 'decisions'],
    ['петля 2 · дни', 'запуск', 'команда просыпается по расписанию и пишет строку журнала. точка контроля – строка есть или её нет', 'path'],
    ['петля 3 · неделя', 'пересмотр', 'семь строк журнала и одно решение: оставить, поправить, вернуть руками или выключить', 'tree'],
  ];
  // the journal of the example: three mondays, the last one silent
  const LOG = [['пн 08:30', 'ok', '6 звонков · 11 обещаний · сводка.md'], ['пн 08:30', 'ok', '0 звонков · пропуск'], ['пн 08:30', 'нет строки', 'расписание не проснулось: проверить']];
  const TABS = [['path', 'путь'], ['blocks', 'блоки'], ['loops', 'петли']];

  // ---------- state from the address ----------
  const askedOff = (qs.get('off') || '').split(',').map((x) => x.trim()).filter((x) => BLOCKS.some((b) => b.k === x));
  const on = {};
  for (const b of BLOCKS) on[b.k] = !askedOff.includes(b.k);
  let offOrder = askedOff.filter((k, i) => askedOff.indexOf(k) === i);
  let tab = TABS.some(([k]) => k === qs.get('tab')) ? qs.get('tab') : 'path';
  let step = Math.min(STEPS.length, Math.max(1, parseInt(qs.get('step'), 10) || 1));
  function writeAddress() {
    const p = new URLSearchParams(location.search);
    ['tab', 'step', 'off', 'on', 'ans', 'play', 'intro'].forEach((k) => p.delete(k));
    const off = BLOCKS.filter((b) => !on[b.k]).map((b) => b.k);
    const q = `${p.toString()}&tab=${tab}${tab === 'path' ? `&step=${step}` : ''}${off.length ? `&off=${off.join(',')}` : ''}`;
    try { history.replaceState(null, '', `${location.pathname}?${q}${location.hash}`); } catch { /* a file:// page keeps its address */ }
  }

  // ---------- panel: the layer-2 frame and classes, layer-3 content ----------
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  document.body.classList.add('l2', 'l3');
  const home = location.pathname.split('/').pop() || './';
  const back = document.getElementById('l2link');
  if (back) { back.textContent = '← 1 · собрать'; back.setAttribute('href', home); back.title = 'обычный режим: сборка по фазам, все слои'; }
  const l3link = document.getElementById('l3link');
  if (l3link) { l3link.textContent = '2 · научить'; l3link.setAttribute('href', '?layer=2'); l3link.title = 'слой 2: skill на харнесе'; }

  const panel = document.createElement('div');
  panel.className = 'panel'; panel.id = 'l2P';
  panel.innerHTML = `<h2><span>слой 3 · отпустить</span><button type="button" id="l2Play" class="l2-play" title="проиграть слой 3: пять фаз, пять блоков, три петли">▶ проиграть</button><em id="l2Count"></em></h2>
    <div class="l2-tabs" role="tablist">${TABS.map(([k, t]) => `<button type="button" role="tab" data-l2tab="${k}">${t}</button>`).join('')}</div>
    <div class="l2-body">
      <div class="l2-pane" data-l2pane="path">
        <div class="l2-rail">${STEPS.map((s, i) => `<button type="button" data-l2step="${i + 1}" title="${esc(s.q)}">${i + 1} ${esc(s.k)}</button>`).join('')}</div>
        <div class="l2-step" aria-live="polite"><span id="l2StepTag"></span><p class="l2-lead" id="l2StepA"></p><p id="l2StepB"></p></div>
        <div class="l3-file"><i id="l3FileName"></i><pre id="l3FileBody"></pre></div>
        <div class="l2-nav"><button type="button" id="l2Prev">← назад</button><button type="button" class="l2-go" id="l2Next">дальше →</button></div>
        <p class="cap" id="l2StepP"></p>
      </div>
      <div class="l2-pane" data-l2pane="blocks">
        <div class="l2-list">${BLOCKS.map((b) => `<button type="button" class="l2-b" data-b="${b.k}" aria-pressed="true"><i></i><span><b>${esc(b.name)}</b><small>${esc(b.map)}</small></span><em></em></button>`).join('')}</div>
        <div class="l2-out" aria-live="polite"><span id="l2Tag"></span><p id="l2Out"></p></div>
        <p class="cap">пунктир на графе – блок выключен</p>
      </div>
      <div class="l2-pane" data-l2pane="loops">
        <dl class="l2-dl">${LOOPS.map(([h, w, d, id]) => `<dt>${esc(h)}<br><b>${esc(w)}</b></dt><dd>${esc(d)}<br><small>смотришь: ${w3(id)}</small></dd>`).join('')}</dl>
        <p class="cap">материалы вечера: ${['source', 'decisions', 'tree', 'path', 'kit', 'hw'].map(w3).join(' · ')}</p>
      </div>
    </div>`;
  const colR = document.getElementById('colR');
  colR.insertBefore(panel, colR.firstChild);

  // under the graph: the journal of the example
  const pulse = document.createElement('div');
  pulse.id = 'l3Pulse';
  pulse.innerHTML = `<div class="l3-jh"><i>журнал</i><span>${esc(EX.task)} · ${esc(EX.when)}</span></div>` +
    LOG.map(([t, s, d]) => `<div class="l3-jr${s === 'ok' ? '' : ' err'}"><b>${esc(t)}</b><span>${esc(s)}</span><small>${esc(d)}</small></div>`).join('') +
    `<p class="l3-help">домашка до пн 30.11: расписание раз в день и семь строк журнала · ${w3('hw')}</p>`;
  document.getElementById('colC').appendChild(pulse);

  // caption on the graph
  const cap = document.createElement('div');
  cap.id = 'l2Cap'; cap.setAttribute('aria-hidden', 'true');
  cap.innerHTML = '<span></span><b></b><small></small>';
  document.getElementById('stage').appendChild(cap);
  let capBlock = null;
  function paintCap(st, n) {
    let t = '', a = '', b = '';
    if (tab === 'path') { t = `${step} · ${st.k}`; a = st.q; b = `след: ${st.t}`; }
    else if (tab === 'blocks') {
      const k = BLOCKS.find((x) => x.k === capBlock);
      if (k) { t = `${on[k.k] ? '+' : '–'} ${k.name} · ${n}/${BLOCKS.length}`; a = on[k.k] ? k.map : k.out; }
      else { t = `блоки · ${n}/${BLOCKS.length}`; a = n === BLOCKS.length ? ALL_ON : 'выключи блок справа – на графе видно, что пропадает'; }
    } else if (tab === 'loops') { t = 'три петли'; a = 'ход агента → запуск → пересмотр'; b = 'минуты · дни · неделя'; }
    cap.hidden = !t;
    cap.children[0].textContent = t; cap.children[1].textContent = a; cap.children[2].textContent = b;
  }

  // ---------- graph ----------
  const G = { nodeSel: null, linkSel: null };
  const blockOf = (d) => d.block || (isSkill(d) || isRules(d) ? 'what' : null);
  const isOff = (d) => { const k = d && blockOf(d); return !!k && !on[k]; };
  function repaint() {
    if (!G.nodeSel) return;
    const byId = new Map(G.nodeSel.data().map((d) => [d.id, d]));
    const end = (x) => (x && typeof x === 'object' ? x : byId.get(x));
    G.nodeSel.classed('ghost', (d) => d.layer === 'ghost' || isOff(d)).classed('l2off', isOff);
    G.linkSel.classed('l2off', (l) => isOff(end(l.source)) || isOff(end(l.target)));
    const st = tab === 'path' ? STEPS[step - 1] : null;
    const loops = tab === 'loops';
    const keep = (d) => (st ? st.hot(d) || st.warm(d) : loops ? !!d.block : true);
    G.nodeSel.classed('l2dim', (d) => !keep(d));
    G.linkSel.classed('l2dim', (l) => { const a = end(l.source), b = end(l.target); if (st) return !(a && b && (st.hot(a) || st.hot(b))); if (loops) return !(a && b && a.block && b.block); return false; });
    G.nodeSel.selectAll('circle.l2focus').remove();
    if (st) G.nodeSel.filter(st.hot).insert('circle', 'path').attr('class', 'l2focus').attr('r', 14);
  }

  function paintPanel() {
    panel.querySelectorAll('[data-l2tab]').forEach((b) => { const sel = b.dataset.l2tab === tab; b.classList.toggle('on', sel); b.setAttribute('aria-selected', sel); });
    panel.querySelectorAll('[data-l2pane]').forEach((p) => { p.hidden = p.dataset.l2pane !== tab; });
    document.body.classList.toggle('l2-tab-onto', tab === 'loops');
    for (const b of BLOCKS) {
      const el = panel.querySelector(`.l2-b[data-b="${b.k}"]`);
      el.setAttribute('aria-pressed', on[b.k]);
      el.querySelector('em').textContent = on[b.k] ? 'вкл' : 'выкл';
    }
    const st = STEPS[step - 1];
    panel.querySelectorAll('[data-l2step]').forEach((b) => { const cur = +b.dataset.l2step === step; b.classList.toggle('on', cur); b.setAttribute('aria-current', cur ? 'step' : 'false'); });
    document.getElementById('l2StepTag').textContent = `фаза ${step} из ${STEPS.length} · ${st.k} · ${st.q}`;
    document.getElementById('l2StepA').textContent = st.a;
    document.getElementById('l2StepB').textContent = st.b;
    document.getElementById('l3FileName').textContent = `след · ${st.f}`;
    document.getElementById('l3FileBody').textContent = st.x;
    document.getElementById('l2StepP').innerHTML = `смотришь: ${w3(st.look)}`;
    document.getElementById('l2Prev').disabled = step === 1;
    document.getElementById('l2Next').textContent = step === STEPS.length ? 'блоки →' : 'дальше →';
    const n = BLOCKS.filter((b) => on[b.k]).length;
    document.getElementById('l2Count').textContent = `${n}/${BLOCKS.length}`;
    const last = BLOCKS.find((b) => b.k === offOrder[offOrder.length - 1]);
    document.getElementById('l2Tag').textContent = last ? `выключено · ${last.name}` : `${n} из ${BLOCKS.length}`;
    document.getElementById('l2Out').textContent = last ? last.out : ALL_ON;
    panel.querySelector('.l2-out').classList.toggle('all', !last);
    pulse.classList.toggle('l3-off', !on.log);
    paintCap(st, n);
    repaint();
  }
  const ring = (k) => { if (G.nodeSel) G.nodeSel.filter((d) => blockOf(d) === k).append('circle').attr('class', 'ring').attr('r', 6).on('animationend', function () { this.remove(); }); };
  function setTab(t) { tab = t; capBlock = null; paintPanel(); writeAddress(); }
  function setStep(k) { step = Math.min(STEPS.length, Math.max(1, k)); paintPanel(); writeAddress(); }

  // ---------- play: five phases, the blocks one by one, the loops ----------
  let playing = false, playT = null;
  const playBtn = panel.querySelector('#l2Play');
  function stopPlay() { playing = false; clearTimeout(playT); playBtn.textContent = '▶ проиграть'; document.body.classList.remove('l2-playing'); }
  function play() {
    stopPlay(); playing = true; playBtn.textContent = '■ стоп'; document.body.classList.add('l2-playing');
    const seq = STEPS.map((_, i) => [4400, () => { tab = 'path'; step = i + 1; }]);
    seq.push([1600, () => { for (const b of BLOCKS) on[b.k] = false; offOrder = BLOCKS.map((b) => b.k).reverse(); capBlock = null; tab = 'blocks'; }]);
    for (const b of BLOCKS) seq.push([2000, () => { on[b.k] = true; offOrder = offOrder.filter((x) => x !== b.k); capBlock = b.k; ring(b.k); }]);
    seq.push([0, () => { capBlock = null; tab = 'loops'; }]);
    let i = 0;
    const tick = () => { if (!playing) return; const [ms, fn] = seq[i++]; fn(); paintPanel(); writeAddress(); if (i < seq.length) playT = setTimeout(tick, ms); else stopPlay(); };
    tick();
  }

  panel.addEventListener('click', (e) => {
    if (e.target.closest('#l2Play')) { if (playing) stopPlay(); else play(); return; }
    if (e.target.closest('a')) return;
    if (playing) stopPlay();
    const t = e.target.closest('[data-l2tab]');
    if (t) { setTab(t.dataset.l2tab); return; }
    const s = e.target.closest('[data-l2step]');
    if (s) { setStep(+s.dataset.l2step); return; }
    if (e.target.closest('#l2Prev')) { setStep(step - 1); return; }
    if (e.target.closest('#l2Next')) { if (step < STEPS.length) setStep(step + 1); else setTab('blocks'); return; }
    const b = e.target.closest('.l2-b');
    if (b) {
      const k = b.dataset.b;
      on[k] = !on[k];
      offOrder = offOrder.filter((x) => x !== k);
      if (!on[k]) offOrder.push(k);
      capBlock = k;
      paintPanel(); writeAddress(); ring(k);
    }
  });
  paintPanel();

  // ---------- start card «3 · отпустить» ----------
  const intro = document.createElement('div');
  intro.id = 'l2Intro'; intro.setAttribute('role', 'dialog'); intro.setAttribute('aria-modal', 'true'); intro.setAttribute('aria-labelledby', 'l2InTitle');
  intro.innerHTML = `<div class="card">
    <div class="st-hd"><span>AI Mindset · Fall ’26 Lab · неделя 3</span><span>fig. 3.0</span></div>
    <h3 id="l2InTitle">3 · отпустить: повтор работает без тебя</h3>
    <p>найди в своей сессии, где решал ты, что повторяется каждую неделю, и отдай этот повтор правилу, команде и расписанию. каждый запуск оставляет строку журнала. пример слоя – ${esc(EX.task)}, ${esc(EX.when)}.</p>
    <ol class="l2-chain l3-chain">${STEPS.map((s, i) => `<li><b>${i + 1} ${esc(s.k)}</b><small>${esc(s.t)}</small></li>`).join('')}</ol>
    <div class="l2-calls"><i>петли</i>${LOOPS.map(([h, w]) => `<span><b>${esc(w)}</b> · ${esc(h.split(' · ')[1])}</span>`).join('')}</div>
    <div class="l2-calls"><i>W3</i>${['source', 'decisions', 'tree', 'path', 'kit', 'hw'].map((id) => `<span>${w3(id)}</span>`).join('')}</div>
    <div class="l2-in-go"><button type="button" class="l2-go" id="l2InPlay">▶ проиграть · 40 с</button><button type="button" id="l2InSteps">по фазам →</button></div>
  </div>`;
  document.body.appendChild(intro);
  intro.hidden = qs.has('tab') || qs.has('step') || qs.get('intro') === '0' || qs.get('play') === '1';
  const closeIntro = (go) => { intro.hidden = true; if (go) go(); };
  intro.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    if (e.target.closest('#l2InPlay')) closeIntro(play);
    else if (e.target.closest('#l2InSteps')) closeIntro(() => { step = 1; setTab('path'); });
    else if (!e.target.closest('.card')) closeIntro();
  });
  window.addEventListener('keydown', (e) => {
    if (!intro.hidden) {
      if (e.key === 'Escape') { e.preventDefault(); closeIntro(); }
      else if (e.key === 'Enter' || e.code === 'Space') { if (e.target.tagName === 'A') return; e.preventDefault(); e.stopPropagation(); closeIntro(play); }
      return;
    }
    if (e.code === 'Space' && !/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target.tagName)) { e.preventDefault(); e.stopPropagation(); if (playing) stopPlay(); else play(); return; }
    if (e.key === 'Escape' && playing) stopPlay();
  }, true);
  if (!intro.hidden) intro.querySelector('#l2InPlay').focus();
  if (qs.get('play') === '1') setTimeout(play, 900);

  // ---------- what app.js asks for (the layer-2 interface) ----------
  window.F26L2 = {
    layers: {
      l3when: { label: 'когда · триггер', sym: 'hourglass', fill: true, size: 120, glyph: '⧗', ax: 0.97, ay: 0.5 },
      l3agent: { label: 'кто и где · агент', sym: 'wye', fill: false, size: 130, glyph: 'Y', ax: 0.98, ay: -0.36 },
      l3log: { label: 'журнал', sym: 'gate', fill: false, size: 130, glyph: '⊓', ax: 0.98, ay: 0.08 },
      l3screen: { label: 'экран', sym: 'cross', fill: false, size: 170, glyph: '✚', ax: 0.84, ay: 0.94 },
    },
    veilNarr: 'people/ · карточка человека, в слое 3 скрыта',
    extend(nodes, links, files) {
      const paths = [...files.keys()];
      const skill = paths.find((p) => /^skills\/.*call-digest/.test(p)) || paths.find((p) => p.startsWith('skills/'));
      if (!skill) return;
      const rules = paths.find((p) => p === 'AGENTS.md');
      const calls = paths.filter((p) => /^raw\/.*call transcript/.test(p));
      const add = (id, layer, title, block, pad) => nodes.push({ id, layer, title, block, pad });
      const link = (a, b) => { if (a && b) links.push({ source: a, target: b, kind: 'wiki' }); };
      add('l3:when', 'l3when', 'когда · пн 08:30', 'when', 70);
      add('l3:agent', 'l3agent', 'агент · команда', 'who', 80);
      add('l3:log', 'l3log', 'журнал · строка на запуск', 'log', 80);
      add('l3:screen', 'l3screen', 'экран: можно ли верить', 'screen', 90);
      link('l3:when', 'l3:agent'); link('l3:agent', skill); link('l3:agent', rules);
      for (const c of calls) link(c, 'l3:agent');
      link('l3:agent', 'l3:log'); link('l3:log', 'l3:screen');
    },
    paint(nodeSel, linkSel) { G.nodeSel = nodeSel; G.linkSel = linkSel; repaint(); },
    mount() { /* nothing to hand over: the build runs as in layer 2 */ },
    ended() { /* the build tab is gone: nothing to hand over */ },
  };
})();
