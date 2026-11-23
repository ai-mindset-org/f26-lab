// экран рутины: читает run-log.csv, пишет status.json (четыре поля) и status.html (одна страница, открывается двойным кликом)
// node status.mjs · STALE_HOURS=26 – сколько часов тишины считать «рутина молчит»
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const LOG = join(here, 'run-log.csv');
const STALE_H = Number(process.env.STALE_HOURS || 26);

// csv с полями в кавычках
const parse = (line) => { const out = []; let cur = '', q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; };
const rows = existsSync(LOG) ? readFileSync(LOG, 'utf8').trim().split('\n') : [];
const head = rows.length ? parse(rows[0]) : [];
const runs = rows.slice(1).filter(Boolean).map((l) => Object.fromEntries(parse(l).map((v, i) => [head[i], v])));
const last = runs[runs.length - 1];
const when = (s) => (s ? new Date(s.replace(/([+-]\d\d)(\d\d)$/, '$1:$2')) : null);

let status, next;
if (!last) { status = 'unknown'; next = 'сделать первый ручной запуск: ./run.sh --demo'; }
else {
  const age = (Date.now() - when(last.started_at)) / 36e5;
  status = { ok: 'ok', needs_fix: 'needs_attention', error: 'error', stopped: 'stopped' }[last.status] || 'unknown';
  next = last.next_action;
  if (status === 'ok' && age > STALE_H) { status = 'silent'; next = `рутина молчит ${Math.round(age)} ч: проверить планировщик`; }
}
const state = { source: 'run-log.csv', updated_at: last ? last.started_at : null, status, next_action: next };
writeFileSync(join(here, 'status.json'), JSON.stringify(state, null, 2) + '\n');

const GLYPH = { ok: '●', needs_fix: '◐', error: '✕', stopped: '■' };
const WORD = { ok: 'всё в порядке', needs_attention: 'нужна правка', error: 'ошибка', stopped: 'остановлена', silent: 'молчит', unknown: 'ещё не запускалась' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const warn = status !== 'ok';
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>morning brief · состояние</title>
<style>
:root{--ink:#111;--bg:#fcfaf6;--muted:#7a7a7a;--hair:#e4e0d8;--accent:#e8862a;--accent-ink:#b85c00}
@media (prefers-color-scheme:dark){:root{--ink:#eee;--bg:#111;--muted:#999;--hair:#2c2c2c;--accent-ink:#f0a050}}
body{margin:0;background:var(--bg);color:var(--ink);font:13px/1.5 "JetBrains Mono",ui-monospace,Menlo,monospace;font-variant-ligatures:none}
main{max-width:760px;margin:0 auto;padding:28px 16px}
h1{font-size:13px;letter-spacing:.16em;text-transform:uppercase;font-weight:500;margin:0 0 14px}
.q{font-size:22px;font-weight:700;margin:0 0 4px}.q b{color:${warn ? 'var(--accent-ink)' : 'var(--ink)'}}
dl{display:grid;grid-template-columns:130px 1fr;border:1px solid var(--ink);margin:16px 0}
dt,dd{margin:0;padding:7px 10px;border-bottom:1px solid var(--hair)}dt{color:var(--muted)}
.strip{display:flex;gap:6px;font-size:18px;margin:8px 0 2px}.strip span{width:22px;text-align:center}.strip .x{color:var(--accent-ink)}
table{width:100%;border-collapse:collapse;font-size:11.5px;margin-top:14px}td,th{text-align:left;padding:4px 6px;border-bottom:1px solid var(--hair);vertical-align:top}th{color:var(--muted);font-weight:400}
.cap{color:var(--muted);font-size:11px}
</style></head><body><main>
<h1>утренняя сводка · состояние</h1>
<p class="q">нужна моя помощь? <b>${warn ? 'да' : 'нет'}</b> · ${esc(WORD[status])}</p>
<dl><dt>источник</dt><dd>${esc(state.source)}</dd><dt>время</dt><dd>${esc(state.updated_at || '–')}</dd><dt>статус</dt><dd>${esc(status)}</dd><dt>следующий шаг</dt><dd>${esc(state.next_action)}</dd></dl>
<p class="cap">последние запуски, старые слева: ● ok · ◐ нужна правка · ✕ ошибка · ■ остановлена</p>
<div class="strip">${runs.slice(-14).map((r) => `<span class="${r.status === 'ok' ? '' : 'x'}" title="${esc(`${r.started_at} · ${r.status} · ${r.check}`)}">${GLYPH[r.status] || '?'}</span>`).join('')}</div>
<table><tr><th>запуск</th><th>вход</th><th>статус</th><th>проверка</th></tr>${runs.slice(-7).reverse().map((r) => `<tr><td>${esc(r.run_id)}</td><td>${esc(r.input)}</td><td>${esc(r.status)}</td><td>${esc(r.check)}</td></tr>`).join('')}</table>
<p class="cap">страница собрана ${esc(new Date().toISOString().slice(0, 16).replace('T', ' '))} UTC из run-log.csv · пересобрать: node status.mjs</p>
</main></body></html>
`;
writeFileSync(join(here, 'status.html'), html);
console.log(JSON.stringify(state));
