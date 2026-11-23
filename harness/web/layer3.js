/* F26 self-harness · layer 3: a routine on the harness (?layer=3, synonym ?layer=release)
 * loads before app.js and answers the same interface as layer2.js (window.F26L2), so app.js stays unchanged:
 * the finished build without the people layer, a start card «3 · отпустить», a caption on the graph, a play mode,
 * a week of runs under the graph, and a panel with four tabs –
 * сегодня (five steps, each with the file it leaves), блоки (eight switches), карта (questions answered one by one),
 * онтология (word lists with sources).
 * state lives in the address: &tab=today|blocks|map|onto · &step=1..5 · &off=… · &on=inputs,stop · &ans=03,04 · &play=1 · &intro=0
 */
(() => {
  'use strict';
  const qs = new URLSearchParams(location.search);
  if (!['3', 'release'].includes(qs.get('layer'))) return;

  // key · name · what it is on the map · what happens without it · on by default
  const BLOCKS = [
    { k: 'passport', name: 'паспорт', map: 'routines/ · кто, когда, предел, как остановить', out: 'рутина работает, но никто не помнит, когда и зачем она запускается', def: true },
    { k: 'sched', name: 'планировщик', map: 'один: launchd, cron, GitHub Actions или облачная рутина', out: 'запуск случается, только когда ты вспомнил', def: true },
    { k: 'log', name: 'журнал запусков', map: 'logs/run-log.csv · строка на каждый запуск', out: 'рутина умирает молча: неделю тишины никто не замечает', def: true },
    { k: 'code', name: 'проверка кодом', map: 'bin/check.mjs · evals/{eval} checks.md', out: 'в журнале ok, а результата нет', def: true },
    { k: 'inputs', name: 'три входа', map: 'обычный · пустой · старый · заготовка', out: 'на пустом входе агент выдумывает свежие данные', def: false },
    { k: 'stop', name: 'предел и стоп', map: 'STOP-файл и бюджет в реестре · заготовка', out: 'рутины множатся и тратят без потолка', def: false },
    { k: 'screen', name: 'экран', map: 'status.json → экран: источник, время, статус, следующий шаг', out: 'чтобы понять, жива ли рутина, надо читать логи', def: true },
    { k: 'map', name: 'карта вопросов', map: 'plans/{map} morning brief.md · восемь вопросов', out: 'каждая сессия заново решает, что делать дальше', def: true },
  ];
  const ALL_ON = 'все блоки на месте: рутина запускается, пишет журнал, проверяется и видна на экране';
  // three ways a routine starts; a skill starts only on request
  const STARTS = [['по расписанию', 'launchd · cron · GitHub Actions · облачная рутина'], ['по событию', 'новый файл в raw/'], ['по запросу', '/morning-brief – это ещё skill']];
  // the map of the example routine: the same eight questions as path-map maps/f26-w3-routine-example and the W3 deck
  const Q = [
    ['01', 'задача', 'какую повторяющуюся задачу отдаю первой', []],
    ['02', 'источник', 'что агент читает без меня', ['01']],
    ['03', 'два прогона', 'три строки с источником два раза подряд', ['02']],
    ['04', 'тихий сбой', 'как увижу, что рутина упала молча', ['02']],
    ['05', 'время или событие', 'запуск по часам или по новой заметке', ['03']],
    ['06', 'ночной прогон', 'разовый запуск в 02:07 сам пишет журнал', ['04', '05']],
    ['07', 'проверка соседом', 'другой человек находит следующий шаг', ['03']],
    ['08', 'решение недели', 'оставить, переделать, вернуть или выключить', ['06', '07']],
  ];
  const START_ANS = ['01', '02'];
  const MOVES = [
    ['создать', 'агент по брифу пишет map.md и 3–7 вопросов, каждый своим файлом'],
    ['взять', 'одна сессия берёт один вопрос с границы и дописывает в файл ответ'],
    ['обновить', 'статус считается из файлов: есть ответ – решён, все зависимости решены – граница, иначе ждёт'],
  ];
  // a week of runs, 17–23.11: ok · old (stale input) · err · silent (should have run, did not) · none (not scheduled)
  const DAYS = ['вт 17', 'ср 18', 'чт 19', 'пт 20', 'сб 21', 'вс 22', 'пн 23'];
  const GLYPH = { ok: '●', old: '◐', err: '✕', silent: '○', none: '·' };
  const WORD = { ok: 'ok', old: 'старый вход', err: 'ошибка', silent: 'не запускалась', none: 'не по расписанию' };
  const RUNS = [
    { t: 'утренняя сводка', when: '09:07 каждый день', cells: ['ok', 'ok', 'old', 'ok', 'silent', 'ok', 'err'],
      why: { old: 'заметка от 17.11, порог свежести – сутки', silent: 'мак спал, launchd не догнал запуск', err: 'пустой вход: notes/ пуст после уборки, строка 12 журнала' } },
    { t: 'разбор звонков', when: 'новый файл в raw/', cells: ['none', 'ok', 'none', 'ok', 'none', 'none', 'ok'], why: {} },
    { t: 'отчёт собственнику', when: 'пн 10:07', cells: ['none', 'none', 'none', 'none', 'none', 'none', 'ok'], why: {} },
  ];
  // the guided path of the day: name · chain line · what happens · why · the file the step leaves · nodes that pulse · nodes that stay bright
  const pathOf = (d) => (d.file && d.file.path) || '';
  const brief = (d) => /^routines\/.*morning brief/.test(pathOf(d));
  const STEPS = [
    { k: 'кандидат', c: 'что повторяется и сколько стоит', p: 'потенциал в неделе · холм, шаг 6',
      a: 'в реестре три рутины-кандидата: утренняя сводка, отчёт собственнику, уборка', b: 'кандидат съедает от 48 минут в неделю, вход цифровой, ошибку дёшево поправить',
      f: 'routines/{routine} registry.md', x: 'рутина             когда         мин/нед  проверка\nутренняя сводка    09:07 ежедн.  70       check.mjs\nотчёт собственнику пн 10:07      50       check.mjs\nуборка             1-я суббота   15       руками',
      hot: (d) => /registry/.test(pathOf(d)), warm: (d) => pathOf(d).startsWith('routines/') },
    { k: 'два прогона', c: 'руками дважды, потом три входа', p: 'свой процесс · два честных прогона',
      a: 'утренняя сводка руками: v1, одна правка правила, v2', b: 'потом пустой и старый вход: «нет данных» вместо выдумки. каждый прогон – строка журнала',
      f: 'logs/run-log.csv', x: 'run_id,version,status,check,next_action\nmanual-01,v1,needs_fix,дата проверки выдумана,правило про даты\nmanual-02,v2,ok,3 из 3 строк с источником,пустой вход\nmanual-03,v2,ok,пусто → «нет данных»,паспорт',
      hot: (d) => pathOf(d).startsWith('sessions/') || d.id === 'l3:log' || d.id === 'l3:inputs', warm: (d) => pathOf(d).startsWith('evals/'), force: ['inputs'] },
    { k: 'паспорт', c: 'кто, когда, предел, как остановить', p: 'перед передачей: время, лимит, владелец, остановка',
      a: 'паспорт рутины: владелец, один планировщик, время, предел, куда пишет, как остановить', b: 'без хозяина и стопа запуск не ставится',
      f: 'routines/{routine} morning brief.md', x: 'владелец: я\nпланировщик: launchd, один\nвремя: 09:07 каждый день, Europe/Lisbon\nсам: читает notes/, пишет три строки\nне делает: ничего не отправляет\nпредел: 1 запуск в день, 3 минуты\nпишет: logs/run-log.csv, status.json\nстоп: файл STOP рядом с паспортом\nпересмотр: 30.11',
      hot: (d) => brief(d) || d.id === 'l3:sched' || d.id === 'l3:stop', warm: (d) => pathOf(d).startsWith('routines/'), force: ['stop'] },
    { k: 'журнал и экран', c: 'запуск пишет строку, экран её читает', p: 'планировщик проснулся · четыре поля экрана',
      a: 'планировщик проснулся: строка в run-log.csv, четыре поля в status.json', b: 'экран отвечает на один вопрос: нужна ли моя помощь',
      f: 'status.json', x: '{\n  "source": "logs/run-log.csv",\n  "updated_at": "2026-11-23T09:07",\n  "status": "needs_attention",\n  "next_action": "проверить строку 12 журнала"\n}',
      hot: (d) => ['l3:log', 'l3:status', 'l3:screen'].includes(d.id) || pathOf(d) === 'bin/check.mjs', warm: (d) => pathOf(d).startsWith('evals/') },
    { k: 'неделя', c: 'семь записей → оставить, поправить, остановить', p: 'до 30.11 · семь наблюдений',
      a: 'к 30.11 в журнале семь записей: запуск, ошибка или пропуск', b: 'сбой становится решением в decisions/ и строкой правила, лишнее уходит в архив',
      f: 'decisions/{decision} morning brief week.md', x: 'семь записей: 4 ok · 1 старый вход · 1 тишина · 1 ошибка\nрешение: оставить, поправить вход\nправило: пустой вход → «нет данных»\nтишина: launchd догоняет запуск при пробуждении\nследующий пересмотр: 07.12',
      hot: (d) => pathOf(d).startsWith('decisions/') || /\{rule\} memory/.test(pathOf(d)) || d.id === 'l3:q08', warm: (d) => /^evals\/.*who am i –/.test(pathOf(d)) || d.id === 'l3:log' },
  ];
  const ENTITIES = [
    ['рутина', 'skill, который запускается без твоего запроса'],
    ['триггер', 'время или событие, которое будит рутину'],
    ['запуск', 'один проход рутины по одному входу'],
    ['журнал', 'строка на каждый запуск: когда, что, исход'],
    ['состояние', 'четыре поля: источник, время, статус, следующий шаг'],
    ['экран', 'страница, которая читает состояние'],
    ['паспорт', 'кто владеет, когда, предел, как остановить'],
    ['вопрос', 'файл карты: что надо решить и от чего зависит'],
    ['граница', 'открытые вопросы с решёнными зависимостями'],
    ['пересмотр', 'через неделю: оставить, поправить, остановить'],
  ];
  const MECHANICS = [
    ['карта', 'вопросы и решения: меняется, когда что-то решено'],
    ['журнал', 'факты: растёт строкой на каждый запуск'],
    ['экран', 'читает карту и журнал, сам ничего не хранит'],
    ['паспорт', 'правила запуска: меняется только руками'],
  ];
  const ABSTRACTIONS = [
    ['холм задачи', 'слева ищу, как; справа делаю и отпускаю', 'https://basecamp.com/shapeup/3.4-chapter-13'],
    ['граница', 'брать только вопросы с решёнными зависимостями', 'https://brycewatson.com/research/wayfinder/'],
    ['ползунок автономности', 'доля агента растёт по шагу, человек держит ползунок', 'https://youtu.be/LCEmiRjPEtQ'],
    ['скрипт, который ничего не делает', 'сначала шаги записаны, потом автоматизируются по одному', 'https://blog.danslimmon.com/2019/07/15/do-nothing-scripting-the-key-to-gradual-automation/'],
    ['файл прогресса', 'следующая сессия начинает с журнала и git, без пересказа', 'https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents'],
    ['окупаемость', 'минуты в неделю × недели против часов сборки', 'https://xkcd.com/1205/'],
    ['тишина как сигнал', 'рутина, которой неделю не хватились, кандидат на выключение', 'https://lakshminp.com/2026/04/ai-agent-cron-jobs-worth-it'],
  ];
  const TABS = [['today', 'сегодня'], ['blocks', 'блоки'], ['map', 'карта'], ['onto', 'онтология']];

  // ---------- state from the address ----------
  const csv = (k) => (qs.get(k) || '').split(',').map((x) => x.trim()).filter((x) => BLOCKS.some((b) => b.k === x));
  const askedOn = csv('on'), askedOff = csv('off');
  const on = {};
  for (const b of BLOCKS) on[b.k] = (b.def || askedOn.includes(b.k)) && !askedOff.includes(b.k);
  let offOrder = [...BLOCKS.filter((b) => !on[b.k] && !askedOff.includes(b.k)).map((b) => b.k), ...askedOff.filter((k, i) => askedOff.indexOf(k) === i)];
  let tab = TABS.some(([k]) => k === qs.get('tab')) ? qs.get('tab') : 'today';
  let step = Math.min(STEPS.length, Math.max(1, parseInt(qs.get('step'), 10) || 1));
  const ans = new Set(START_ANS);
  for (const n of (qs.get('ans') || '').split(',')) if (Q.some(([id]) => id === n.trim())) ans.add(n.trim());
  const forced = (k) => tab === 'today' && (STEPS[step - 1].force || []).includes(k);
  const lit = (k) => on[k] || forced(k);
  // status of a question, read from the answers the way build.py reads it from the files
  const qState = (id) => { if (ans.has(id)) return 'done'; const q = Q.find((x) => x[0] === id); return q[3].every((b) => ans.has(b)) ? 'front' : 'wait'; };
  const frontier = () => Q.filter(([id]) => qState(id) === 'front').map(([id]) => id);
  function writeAddress() {
    const p = new URLSearchParams(location.search);
    ['tab', 'step', 'off', 'on', 'ans', 'play', 'intro'].forEach((k) => p.delete(k));
    const off = BLOCKS.filter((b) => b.def && !on[b.k]).map((b) => b.k);
    const extra = BLOCKS.filter((b) => !b.def && on[b.k]).map((b) => b.k);
    const more = [...ans].filter((x) => !START_ANS.includes(x)).sort();
    const q = `${p.toString()}&tab=${tab}${tab === 'today' ? `&step=${step}` : ''}${off.length ? `&off=${off.join(',')}` : ''}${extra.length ? `&on=${extra.join(',')}` : ''}${more.length ? `&ans=${more.join(',')}` : ''}`;
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
  panel.innerHTML = `<h2><span>слой 3 · отпустить</span><button type="button" id="l2Play" class="l2-play" title="проиграть слой 3: шаги, блоки, карта">▶ проиграть</button><em id="l2Count"></em></h2>
    <div class="l2-tabs" role="tablist">${TABS.map(([k, t]) => `<button type="button" role="tab" data-l2tab="${k}">${t}</button>`).join('')}</div>
    <div class="l2-body">
      <div class="l2-pane" data-l2pane="today">
        <div class="l2-rail">${STEPS.map((s, i) => `<button type="button" data-l2step="${i + 1}" title="${esc(s.c)}">${i + 1} ${esc(s.k)}</button>`).join('')}</div>
        <div class="l2-step" aria-live="polite"><span id="l2StepTag"></span><p class="l2-lead" id="l2StepA"></p><p id="l2StepB"></p></div>
        <div class="l3-file"><i id="l3FileName"></i><pre id="l3FileBody"></pre></div>
        <div class="l2-nav"><button type="button" id="l2Prev">← назад</button><button type="button" class="l2-go" id="l2Next">дальше →</button></div>
        <p class="cap" id="l2StepP"></p>
      </div>
      <div class="l2-pane" data-l2pane="blocks">
        <div class="l2-list">${BLOCKS.map((b) => `<button type="button" class="l2-b" data-b="${b.k}" aria-pressed="true"><i></i><span><b>${esc(b.name)}</b><small>${esc(b.map)}</small></span><em></em></button>`).join('')}</div>
        <div class="l2-out" aria-live="polite"><span id="l2Tag"></span><p id="l2Out"></p></div>
        <p class="cap">пунктир на карте – блок выключен. две заготовки: в наборе их пока нет</p>
      </div>
      <div class="l2-pane" data-l2pane="map">
        <p class="l3-sum"><b>карта</b> хранит вопросы и решения. <b>журнал</b> хранит факты запусков. <b>экран</b> читает оба.</p>
        <ol class="l3-q" id="l3Q"></ol>
        <div class="l3-qnav"><button type="button" class="l2-go" id="l3Answer">ответить на вопрос с границы →</button><button type="button" id="l3Reset">сначала</button></div>
        <p class="l3-qout" id="l3QOut" aria-live="polite"></p>
        <h3>как карта делается и обновляется</h3>
        <dl class="l2-dl l2-short">${MOVES.map(([w, d]) => `<dt>${esc(w)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>
        <p class="cap">у себя: <code>node map/frontier.mjs</code> в наборе w3 печатает решённое, границу и ждущее</p>
      </div>
      <div class="l2-pane" data-l2pane="onto">
        <h3>десять сущностей</h3>
        <dl class="l2-dl l2-short">${ENTITIES.map(([w, d]) => `<dt>${esc(w)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>
        <h3>четыре файла</h3>
        <dl class="l2-dl l2-short">${MECHANICS.map(([w, d]) => `<dt>${esc(w)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>
        <h3>семь абстракций</h3>
        <dl class="l2-dl">${ABSTRACTIONS.map(([w, d, u]) => `<dt><a href="${esc(u)}" target="_blank" rel="noopener" title="источник: ${esc(u)}">${esc(w)}&nbsp;↗</a></dt><dd>${esc(d)}</dd>`).join('')}</dl>
      </div>
    </div>`;
  const colR = document.getElementById('colR');
  colR.insertBefore(panel, colR.firstChild);

  // under the graph: how a routine starts, then the week of runs
  const starts = document.createElement('div');
  starts.id = 'l2Routes';
  starts.innerHTML = `<i>запуск</i>${STARTS.map(([w, d]) => `<span><b>${esc(w)}</b> · ${esc(d)}</span>`).join('')}`;
  document.getElementById('colC').appendChild(starts);
  const pulse = document.createElement('div');
  pulse.id = 'l3Pulse';
  const help = [];
  RUNS.forEach((r) => r.cells.forEach((c, i) => { if (c === 'err' || c === 'silent') help.push(`${DAYS[i]} · ${r.t}: ${r.why[c]}`); }));
  pulse.innerHTML = `<div class="l3-ph"><i>журнал недели</i>${DAYS.map((d) => `<span><small>${d.split(' ')[0]} </small>${d.split(' ')[1]}</span>`).join('')}<em>нужна помощь · ${help.length}</em></div>` +
    RUNS.map((r, ri) => `<div class="l3-pr"><b title="${esc(r.when)}">${esc(r.t)}<small>${esc(r.when)}</small></b>${r.cells.map((c, i) => `<button type="button" class="l3-c ${c}" data-r="${ri}" data-d="${i}" title="${esc(`${DAYS[i]} · ${WORD[c]}`)}">${GLYPH[c]}</button>`).join('')}<em>${r.cells.filter((c) => c === 'ok').length} ok</em></div>`).join('') +
    `<p class="l3-help">${help.map(esc).join('<br>')}</p>`;
  document.getElementById('colC').appendChild(pulse);

  // caption on the graph
  const cap = document.createElement('div');
  cap.id = 'l2Cap'; cap.setAttribute('aria-hidden', 'true');
  cap.innerHTML = '<span></span><b></b><small></small>';
  document.getElementById('stage').appendChild(cap);
  let capBlock = null, capRun = null, capQ = null;
  function paintCap(st, n) {
    let t = '', a = '', b = '';
    if (capRun) { t = capRun[0]; a = capRun[1]; b = capRun[2]; }
    else if (tab === 'today') { t = `${step} · ${st.k}`; a = st.a; b = `файл шага: ${st.f}`; }
    else if (tab === 'blocks') {
      const k = BLOCKS.find((x) => x.k === capBlock);
      if (k) { t = `${on[k.k] ? '+' : '–'} ${k.name} · ${n}/${BLOCKS.length}`; a = on[k.k] ? k.map : k.out; }
      else { t = `блоки · ${n}/${BLOCKS.length}`; a = n === BLOCKS.length ? ALL_ON : 'выключи блок справа – на графе видно, что пропадает'; }
    } else if (tab === 'map') {
      const f = frontier(), done = Q.filter(([id]) => ans.has(id)).length;
      t = `карта · решено ${done} из ${Q.length}`;
      a = capQ || (f.length ? `граница: ${f.map((id) => `${id} ${Q.find((q) => q[0] === id)[1]}`).join(' · ')}` : 'все вопросы решены: рутина прошла неделю');
      b = 'оранжевый – можно брать сейчас · пунктир – ждёт зависимостей · чёрный – решено';
    }
    cap.hidden = !t;
    cap.children[0].textContent = t; cap.children[1].textContent = a; cap.children[2].textContent = b;
  }

  // ---------- graph ----------
  const G = { nodeSel: null, linkSel: null };
  const blockOf = (d) => d.block || (pathOf(d).startsWith('routines/') ? 'passport' : (pathOf(d) === 'bin/check.mjs' || /^evals\/\{eval\} checks/.test(pathOf(d))) ? 'code' : null);
  const isOff = (d) => { const k = d && blockOf(d); return !!k && !lit(k); };
  function repaint() {
    if (!G.nodeSel) return;
    const byId = new Map(G.nodeSel.data().map((d) => [d.id, d]));
    const end = (x) => (x && typeof x === 'object' ? x : byId.get(x));
    const qOf = (d) => d.q && qState(d.q);
    G.nodeSel.classed('ghost', (d) => d.layer === 'ghost' || isOff(d) || (!!d.q && lit('map') && qOf(d) === 'wait'))
      .classed('l2off', isOff).classed('l3done', (d) => !!d.q && qOf(d) === 'done').classed('l3front', (d) => !!d.q && qOf(d) === 'front');
    G.linkSel.classed('l2off', (l) => isOff(end(l.source)) || isOff(end(l.target)));
    const st = tab === 'today' ? STEPS[step - 1] : null;
    const onMap = tab === 'map';
    const keep = (d) => (st ? st.hot(d) || st.warm(d) : onMap ? d.block === 'map' || brief(d) : true);
    G.nodeSel.classed('l2dim', (d) => !keep(d));
    G.linkSel.classed('l2dim', (l) => { const a = end(l.source), b = end(l.target); if (st) return !(a && b && (st.hot(a) || st.hot(b))); if (onMap) return !(a && b && a.block === 'map' && b.block === 'map'); return false; });
    G.nodeSel.selectAll('circle.l2focus').remove();
    if (st) G.nodeSel.filter(st.hot).insert('circle', 'path').attr('class', 'l2focus').attr('r', 14);
    if (onMap) G.nodeSel.filter((d) => !!d.q && qOf(d) === 'front').insert('circle', 'path').attr('class', 'l2focus').attr('r', 11);
  }

  function paintMap() {
    document.getElementById('l3Q').innerHTML = Q.map(([id, t, d, dep]) => {
      const s = qState(id);
      return `<li class="${s}"><b>${id}</b><span>${esc(t)}<small>${esc(d)}</small></span><em>${s === 'done' ? 'решён' : s === 'front' ? 'граница' : `ждёт ${dep.filter((x) => !ans.has(x)).join(' + ')}`}</em></li>`;
    }).join('');
    const f = frontier();
    const btn = document.getElementById('l3Answer');
    btn.disabled = !f.length;
    btn.textContent = f.length ? `ответить на ${f[0]} · ${Q.find((q) => q[0] === f[0])[1]} →` : 'все вопросы решены';
  }

  function paintPanel() {
    panel.querySelectorAll('[data-l2tab]').forEach((b) => { const sel = b.dataset.l2tab === tab; b.classList.toggle('on', sel); b.setAttribute('aria-selected', sel); });
    panel.querySelectorAll('[data-l2pane]').forEach((p) => { p.hidden = p.dataset.l2pane !== tab; });
    document.body.classList.toggle('l2-tab-onto', tab === 'onto' || tab === 'map');
    document.body.classList.toggle('l3-tab-map', tab === 'map');
    for (const b of BLOCKS) {
      const el = panel.querySelector(`.l2-b[data-b="${b.k}"]`);
      el.setAttribute('aria-pressed', on[b.k]);
      el.querySelector('em').textContent = on[b.k] ? 'вкл' : 'выкл';
      document.body.classList.toggle(`l3-off-${b.k}`, !on[b.k]);
    }
    const st = STEPS[step - 1];
    panel.querySelectorAll('[data-l2step]').forEach((b) => { const cur = +b.dataset.l2step === step; b.classList.toggle('on', cur); b.setAttribute('aria-current', cur ? 'step' : 'false'); });
    document.getElementById('l2StepTag').textContent = `шаг ${step} из ${STEPS.length} · ${st.k}`;
    document.getElementById('l2StepA').textContent = st.a;
    document.getElementById('l2StepB').textContent = st.b;
    document.getElementById('l3FileName').textContent = st.f;
    document.getElementById('l3FileBody').textContent = st.x;
    document.getElementById('l2StepP').textContent = `в деке сегодня: ${st.p}`;
    document.getElementById('l2Prev').disabled = step === 1;
    document.getElementById('l2Next').textContent = step === STEPS.length ? 'карта →' : 'дальше →';
    const n = BLOCKS.filter((b) => lit(b.k)).length;
    document.getElementById('l2Count').textContent = `${n}/${BLOCKS.length}`;
    const last = BLOCKS.find((b) => b.k === offOrder[offOrder.length - 1]);
    document.getElementById('l2Tag').textContent = last ? `выключено · ${last.name}` : `${n} из ${BLOCKS.length}`;
    document.getElementById('l2Out').textContent = last ? last.out : ALL_ON;
    panel.querySelector('.l2-out').classList.toggle('all', !last);
    pulse.classList.toggle('l3-off', !lit('log'));
    paintMap();
    paintCap(st, n);
    repaint();
  }
  const reset = () => { capRun = null; capQ = null; };
  function setTab(t) { tab = t; reset(); paintPanel(); writeAddress(); }
  function setStep(k) { step = Math.min(STEPS.length, Math.max(1, k)); reset(); paintPanel(); writeAddress(); }
  function answerNext() {
    const f = frontier(); if (!f.length) return;
    const id = f[0]; ans.add(id);
    const opened = Q.filter(([x, , , dep]) => !ans.has(x) && dep.includes(id) && qState(x) === 'front').map(([x, t]) => `${x} ${t}`);
    capQ = `${id} решён: ответ дописан в tickets/${id}.md${opened.length ? `. на границу вышли ${opened.join(', ')}` : ''}`;
    document.getElementById('l3QOut').textContent = capQ;
    if (G.nodeSel) G.nodeSel.filter((d) => d.q === id).append('circle').attr('class', 'ring').attr('r', 6).on('animationend', function () { this.remove(); });
  }
  function resetMap() { ans.clear(); START_ANS.forEach((x) => ans.add(x)); capQ = null; document.getElementById('l3QOut').textContent = ''; }

  const ring = (k) => { if (G.nodeSel) G.nodeSel.filter((d) => blockOf(d) === k).append('circle').attr('class', 'ring').attr('r', 6).on('animationend', function () { this.remove(); }); };

  // ---------- play: five steps, the blocks one by one, the map answered to the end, the words ----------
  let playing = false, playT = null;
  const playBtn = panel.querySelector('#l2Play');
  function stopPlay() { playing = false; clearTimeout(playT); playBtn.textContent = '▶ проиграть'; document.body.classList.remove('l2-playing'); }
  function play() {
    stopPlay(); playing = true; playBtn.textContent = '■ стоп'; document.body.classList.add('l2-playing');
    const seq = STEPS.map((_, i) => [4400, () => { tab = 'today'; step = i + 1; reset(); }]);
    seq.push([1600, () => { for (const b of BLOCKS) on[b.k] = false; offOrder = BLOCKS.map((b) => b.k).reverse(); capBlock = null; tab = 'blocks'; }]);
    for (const b of BLOCKS) seq.push([1900, () => { on[b.k] = true; offOrder = offOrder.filter((x) => x !== b.k); capBlock = b.k; ring(b.k); }]);
    seq.push([2200, () => { capBlock = null; resetMap(); tab = 'map'; }]);
    for (let i = START_ANS.length; i < Q.length; i++) seq.push([2000, () => { answerNext(); }]);
    seq.push([0, () => { tab = 'onto'; reset(); }]);
    let i = 0;
    const tick = () => { if (!playing) return; const [ms, fn] = seq[i++]; fn(); paintPanel(); writeAddress(); if (i < seq.length) playT = setTimeout(tick, ms); else stopPlay(); };
    tick();
  }

  const clickPanel = (e) => {
    if (e.target.closest('#l2Play')) { if (playing) stopPlay(); else play(); return; }
    if (playing) stopPlay();
    const t = e.target.closest('[data-l2tab]');
    if (t) { setTab(t.dataset.l2tab); return; }
    const s = e.target.closest('[data-l2step]');
    if (s) { setStep(+s.dataset.l2step); return; }
    if (e.target.closest('#l2Prev')) { setStep(step - 1); return; }
    if (e.target.closest('#l2Next')) { if (step < STEPS.length) setStep(step + 1); else setTab('map'); return; }
    if (e.target.closest('#l3Answer')) { answerNext(); paintPanel(); writeAddress(); return; }
    if (e.target.closest('#l3Reset')) { resetMap(); paintPanel(); writeAddress(); return; }
    const b = e.target.closest('.l2-b');
    if (b) {
      const k = b.dataset.b;
      on[k] = !on[k];
      offOrder = offOrder.filter((x) => x !== k);
      if (!on[k]) offOrder.push(k);
      capBlock = k; reset();
      paintPanel(); writeAddress(); ring(k);
    }
  };
  panel.addEventListener('click', clickPanel);
  // a cell of the week: its line of the journal goes to the caption
  pulse.addEventListener('click', (e) => {
    const c = e.target.closest('.l3-c'); if (!c) return;
    if (playing) stopPlay();
    const r = RUNS[+c.dataset.r], d = +c.dataset.d, v = r.cells[d];
    capRun = [`журнал · ${DAYS[d]}`, `${r.t}: ${WORD[v]}`, r.why[v] || (v === 'ok' ? 'строка в run-log.csv, результат на месте, check.mjs прошёл' : `запуск ${r.when}`)];
    pulse.querySelectorAll('.l3-c.sel').forEach((x) => x.classList.remove('sel')); c.classList.add('sel');
    paintCap(STEPS[step - 1], BLOCKS.filter((b) => lit(b.k)).length);
  });
  paintPanel();

  // ---------- start card «3 · отпустить» ----------
  // что показать по пунктам: каждый пункт открывает свою вкладку слоя
  const PTS = [
    ['сегодня', 'пять шагов, у каждого свой файл', 'today:1'],
    ['блоки', 'выключи блок – видно, что сломается', 'blocks'],
    ['карта', 'ответ на вопрос с границы сдвигает границу', 'map'],
    ['журнал недели', 'тихий день и ошибка, клик – строка журнала', 'today:4'],
    ['онтология', 'сущности, файлы, источники', 'onto'],
  ];
  // виды из тула «путь задачи» открываются только на локальном показе
  const LOCAL = /^(127\.0\.0\.1|localhost|192\.168\.)/.test(location.hostname);
  const PM = `http://${location.hostname}:8993/`;
  const TOOLS = [['путь задачи', PM + 'index.html'], ['карты', PM + 'maps.html'], ['трасса сессии', `http://127.0.0.1:8997/session.html?follow=new`], ['дерево решений', PM + 'tree.html?case=relay'], ['трасса недели', PM + 'week.html']];
  // волна ясности: пять шагов слоя на пяти фазах задачи (как трасса недели в path-map/week.html)
  const WAVE = (() => {
    const Y = (v) => 108 - v * 84, f = (v) => v.toFixed(1);
    const P = [[8, .1], [86, .34, 1], [172, .7], [250, .88, 2], [362, .93, 3], [420, .72], [476, .26, 4], [540, .46], [596, .8, 5], [636, .82]].map(([x, v, n]) => ({ x, y: Y(v), n }));
    const path = (p) => p.map((b, i) => { if (!i) return `M${f(b.x)} ${f(b.y)}`; const a = p[i - 2] || p[i - 1], c = p[i - 1], e = p[i + 1] || b, t = .17; return `C${f(c.x + (b.x - a.x) * t)} ${f(c.y + (b.y - a.y) * t)} ${f(b.x - (e.x - c.x) * t)} ${f(b.y - (e.y - c.y) * t)} ${f(b.x)} ${f(b.y)}`; }).join('');
    const PHB = [[0, 140, 'разбираюсь'], [140, 206, 'ясно'], [206, 330, 'делаю с агентом'], [330, 516, 'работает само'], [516, 640, 'пересматриваю']];
    let o = `<svg viewBox="0 0 640 150" role="img" aria-label="волна ясности по пяти шагам слоя">`;
    PHB.forEach(([a, b, t], i) => { o += `<rect class="b${i % 2 ? ' alt' : ''}" x="${a}" y="0" width="${b - a}" height="112"/><text class="bt" x="${a + 6}" y="13">${i + 1} ${esc(t)}</text>`; });
    o += `<path class="cv" d="${path(P)}"/><path class="cv lost" d="${path(P.slice(5, 8))}"/>`;
    o += `<text class="lt" x="476" y="106" text-anchor="middle">тихий день · ошибка</text><text class="ct" x="172" y="${Y(.7) - 8}" text-anchor="middle">ясно</text>`;
    P.filter((p) => p.n).forEach((p) => { const st = STEPS[p.n - 1]; o += `<g class="pt${p.n === 4 ? ' lost' : ''}" data-go="today:${p.n}" tabindex="0" role="button"><title>${esc(st.c)}</title><rect class="hit" x="${p.x - 44}" y="0" width="88" height="150"/><circle cx="${p.x}" cy="${p.y}" r="7"/><text x="${p.x}" y="132" text-anchor="middle">${p.n} ${esc(st.k)}</text></g>`; });
    return o + '</svg>';
  })();
  const intro = document.createElement('div');
  intro.id = 'l2Intro'; intro.setAttribute('role', 'dialog'); intro.setAttribute('aria-modal', 'true'); intro.setAttribute('aria-labelledby', 'l2InTitle');
  intro.innerHTML = `<div class="card">
    <div class="st-hd"><span>AI Mindset · Fall ’26 Lab · неделя 3</span><span>fig. 3.0</span></div>
    <h3 id="l2InTitle">3 · отпустить: рутина работает без тебя</h3>
    <p>skill из недели 2 начинает запускаться сам: по времени или по событию. каждый запуск оставляет строку в журнале, экран показывает, нужна ли твоя помощь. пример слоя – утренняя сводка <code>morning brief</code>.</p>
    <figure class="l3-wave">${WAVE}<figcaption>волна ясности · отдал рутине – ясность тихо уходит, сбой роняет её, неделя возвращает решением · точка открывает шаг</figcaption></figure>
    <ol class="l2-chain l3-chain">${STEPS.map((s, i) => `<li><b>${i + 1} ${esc(s.k)}</b><small>${esc(s.c)}</small></li>`).join('')}</ol>
    <div class="l3-pts-h">что показать · каждый пункт открывает свою вкладку</div><ol class="l3-pts">${PTS.map(([t, d, go], i) => `<li><button type="button" data-go="${go}"><b>${i + 1} · ${esc(t)}</b><small>${esc(d)}</small></button></li>`).join('')}</ol>
    ${LOCAL ? `<div class="l2-calls l3-tools"><i>виды</i>${TOOLS.map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(t)} ↗</a>`).join('')}</div>` : ''}
    <div class="l2-calls"><i>запуск</i>${STARTS.map(([w, d]) => `<span><b>${esc(w)}</b> · ${esc(d)}</span>`).join('')}</div>
    <div class="l2-in-go"><button type="button" class="l2-go" id="l2InPlay">▶ проиграть · 55 с</button><button type="button" id="l2InSteps">по шагам →</button></div>
  </div>`;
  document.body.appendChild(intro);
  intro.hidden = qs.has('tab') || qs.has('step') || qs.get('intro') === '0' || qs.get('play') === '1';
  const closeIntro = (go) => { intro.hidden = true; if (go) go(); };
  intro.addEventListener('click', (e) => {
    if (e.target.closest('#l2InPlay')) closeIntro(play);
    else if (e.target.closest('#l2InSteps')) closeIntro(() => { step = 1; setTab('today'); });
    else if (e.target.closest('[data-go]')) { const [t, n] = e.target.closest('[data-go]').dataset.go.split(':'); closeIntro(() => { if (n) step = +n; setTab(t); }); }
    else if (!e.target.closest('.card')) closeIntro();
  });
  window.addEventListener('keydown', (e) => {
    if (!intro.hidden) {
      if (e.key === 'Escape') { e.preventDefault(); closeIntro(); }
      else if (e.key === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); closeIntro(play); }
      return;
    }
    if (e.code === 'Space' && !/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)) { e.preventDefault(); e.stopPropagation(); if (playing) stopPlay(); else play(); return; }
    if (e.key === 'Escape' && playing) stopPlay();
  }, true);
  if (!intro.hidden) intro.querySelector('#l2InPlay').focus();
  if (qs.get('play') === '1') setTimeout(play, 900);

  // ---------- what app.js asks for (the layer-2 interface) ----------
  window.F26L2 = {
    layers: {
      l3sched: { label: 'планировщик', sym: 'hourglass', fill: true, size: 120, glyph: '⧗', ax: 0.97, ay: 0.5 },
      l3log: { label: 'журнал запусков', sym: 'gate', fill: false, size: 130, glyph: '⊓', ax: 0.98, ay: 0.08 },
      l3status: { label: 'состояние', sym: 'square', fill: true, size: 80, glyph: '■', ax: 0.92, ay: 0.74 },
      l3screen: { label: 'экран', sym: 'cross', fill: false, size: 170, glyph: '✚', ax: 0.84, ay: 0.94 },
      l3inputs: { label: 'три входа', sym: 'wye', fill: false, size: 130, glyph: 'Y', ax: 0.98, ay: -0.36 },
      l3stop: { label: 'предел и стоп', sym: 'hexagon', fill: true, size: 110, glyph: '⬢', ax: 0.6, ay: 0.6 },
      l3map: { label: 'карта вопросов', sym: 'diamond', fill: true, size: 140, glyph: '◆', ax: -0.56, ay: -0.62 },
      l3q: { label: 'вопрос карты', sym: 'circle', fill: false, size: 60, glyph: '○', ax: -0.6, ay: -0.66 },
    },
    veilNarr: 'people/ · карточка человека, в слое 3 скрыта',
    extend(nodes, links, files) {
      const paths = [...files.keys()];
      const routine = paths.find((p) => /^routines\/.*morning brief/.test(p)) || paths.find((p) => p.startsWith('routines/'));
      if (!routine) return;
      const registry = paths.find((p) => /^routines\/.*registry/.test(p));
      const check = paths.find((p) => p === 'bin/check.mjs');
      const checks = paths.find((p) => /^evals\/\{eval\} checks/.test(p));
      const add = (id, layer, title, block, pad) => nodes.push({ id, layer, title, block, pad });
      const link = (a, b) => { if (a && b) links.push({ source: a, target: b, kind: 'wiki' }); };
      add('l3:sched', 'l3sched', 'планировщик · 09:07', 'sched', 70);
      add('l3:log', 'l3log', 'logs/run-log.csv', 'log', 70);
      add('l3:status', 'l3status', 'status.json', 'screen', 50);
      add('l3:screen', 'l3screen', 'экран: нужна ли помощь', 'screen', 90);
      add('l3:inputs', 'l3inputs', 'входы: обычный · пустой · старый', 'inputs', 110);
      add('l3:stop', 'l3stop', 'STOP · предел', 'stop', 50);
      add('l3:map', 'l3map', 'plans/{map} morning brief.md', 'map', 110);
      link('l3:sched', routine); link(routine, 'l3:log'); link('l3:log', 'l3:status'); link('l3:status', 'l3:screen');
      link(check, 'l3:log'); link('l3:inputs', checks || check); link('l3:stop', registry || routine); link('l3:stop', routine);
      link('l3:map', routine); link('l3:screen', 'l3:map');
      for (const [id, t, , dep] of Q) {
        nodes.push({ id: `l3:q${id}`, layer: 'l3q', title: `${id} ${t}`, block: 'map', q: id, pad: 50 });
        link(`l3:q${id}`, 'l3:map');
        for (const b of dep) link(`l3:q${b}`, `l3:q${id}`);
      }
    },
    paint(nodeSel, linkSel) { G.nodeSel = nodeSel; G.linkSel = linkSel; repaint(); },
    mount() { /* nothing to hand over: the build runs as in layer 2 */ },
    ended() { /* the build tab is gone: nothing to hand over */ },
  };
})();
