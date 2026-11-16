/* F26 self-harness · layer 2: a skill on the harness (?layer=2, synonym ?layer=skills)
 * loads before app.js. without the parameter this file does nothing and app.js runs as before.
 * with it: the finished build without the people layer, and a panel with three tabs –
 * сборка (replay the build), блоки (eight switches that dim their nodes on the graph), онтология (three word lists).
 * state lives in the address: &tab=build|blocks|onto · &off=skills,desc,mirror,reviewer,routes · &on=log,eval,mcp
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
  const TABS = [['build', 'сборка'], ['blocks', 'блоки'], ['onto', 'онтология']];

  // ---------- state from the address ----------
  const csv = (k) => (qs.get(k) || '').split(',').map((x) => x.trim()).filter((x) => BLOCKS.some((b) => b.k === x));
  const askedOn = csv('on'), askedOff = csv('off');
  const on = {};
  for (const b of BLOCKS) on[b.k] = (b.def || askedOn.includes(b.k)) && !askedOff.includes(b.k);
  // the consequence line follows the block switched off last; at start – the ones off by default, then &off= in its order
  let offOrder = [...BLOCKS.filter((b) => !on[b.k] && !askedOff.includes(b.k)).map((b) => b.k), ...askedOff.filter((k, i) => askedOff.indexOf(k) === i)];
  let tab = TABS.some(([k]) => k === qs.get('tab')) ? qs.get('tab') : 'blocks';
  function writeAddress() {
    const p = new URLSearchParams(location.search);
    ['tab', 'off', 'on'].forEach((k) => p.delete(k));
    const off = BLOCKS.filter((b) => b.def && !on[b.k]).map((b) => b.k);
    const lit = BLOCKS.filter((b) => !b.def && on[b.k]).map((b) => b.k);
    const q = `${p.toString()}&tab=${tab}${off.length ? `&off=${off.join(',')}` : ''}${lit.length ? `&on=${lit.join(',')}` : ''}`;
    try { history.replaceState(null, '', `${location.pathname}?${q}${location.hash}`); } catch { /* a file:// page keeps its address */ }
  }

  // ---------- panel ----------
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  document.body.classList.add('l2');
  const back = document.getElementById('l2link');
  if (back) { back.textContent = '← сборка'; back.setAttribute('href', location.pathname.split('/').pop() || './'); back.title = 'обычный режим: сборка по фазам, все слои'; }

  const panel = document.createElement('div');
  panel.className = 'panel'; panel.id = 'l2P';
  panel.innerHTML = `<h2><span>слой 2 · skill на харнесе</span><em id="l2Count"></em></h2>
    <div class="l2-tabs" role="tablist">${TABS.map(([k, t]) => `<button type="button" role="tab" data-l2tab="${k}">${t}</button>`).join('')}</div>
    <div class="l2-body">
      <div class="l2-pane" data-l2pane="build">
        <button type="button" class="l2-go" id="l2Build">проиграть сборку харнеса</button>
        <p class="cap">12 фаз · от пустой папки до папки, которую читает агент</p>
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

  // ---------- graph: the nodes of a block that is off turn into dashed ghosts ----------
  const G = { nodeSel: null, linkSel: null };
  const blockOf = (d) => d.block || (d.file && d.file.path.startsWith('skills/') ? 'skills' : d.id === 'agent:reviewer' ? 'reviewer' : null);
  const isOff = (d) => { const k = d && blockOf(d); return !!k && !on[k]; };
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
    const lit = BLOCKS.filter((b) => on[b.k]).length;
    document.getElementById('l2Count').textContent = `${lit}/${BLOCKS.length}`;
    const last = BLOCKS.find((b) => b.k === offOrder[offOrder.length - 1]);
    document.getElementById('l2Tag').textContent = last ? `выключено · ${last.name}` : `${lit} из ${BLOCKS.length}`;
    document.getElementById('l2Out').textContent = last ? last.out : ALL_ON;
    panel.querySelector('.l2-out').classList.toggle('all', !last);
    repaint();
  }
  function setTab(t) { tab = t; paintPanel(); writeAddress(); }

  let api = null;
  panel.addEventListener('click', (e) => {
    const t = e.target.closest('[data-l2tab]');
    if (t) { setTab(t.dataset.l2tab); return; }
    const b = e.target.closest('.l2-b');
    if (b) {
      const k = b.dataset.b;
      on[k] = !on[k];
      offOrder = offOrder.filter((x) => x !== k);
      if (!on[k]) offOrder.push(k);
      paintPanel(); writeAddress();
      // the same orange ring a fresh file gets: shows where the block sits on the map
      if (G.nodeSel) G.nodeSel.filter((d) => blockOf(d) === k).append('circle').attr('class', 'ring').attr('r', 6).on('animationend', function () { this.remove(); });
      return;
    }
    if (e.target.closest('#l2Build') && api) api.build();
  });
  paintPanel();

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
    // the replay reached the end: from «сборка» the panel moves on to «блоки»
    ended() { if (tab === 'build') setTab('blocks'); },
  };
})();
