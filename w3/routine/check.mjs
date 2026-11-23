// проверка кодом: одинаково каждый раз, без модели
// node check.mjs <вход> <ответ> → печатает, что увидела; код 0 – ok, 1 – надо править правило
import { existsSync, readFileSync } from 'node:fs';

const [input, out] = process.argv.slice(2);
const read = (p) => (p && existsSync(p) ? readFileSync(p, 'utf8').trim() : '');
const inp = read(input), res = read(out);
const fail = (m) => { console.log(m); process.exit(1); };
const pass = (m) => { console.log(m); process.exit(0); };

if (!res) fail('пустой ответ');
if (!inp) {
  if (/нет данных/i.test(res)) pass('пустой вход → «нет данных»');
  fail('вход пуст, а в ответе что-то есть: агент выдумал');
}

// три строки, у каждой источник [N…] или честное «неизвестно»
const WANT = ['сделано', 'мешает', 'следующий шаг'];
const lines = res.split('\n').map((s) => s.trim().replace(/^[-*•\d.)\s]+/, '')).filter(Boolean);
const body = lines.filter((l) => WANT.some((w) => l.toLowerCase().startsWith(w)));
const missing = WANT.filter((w) => !body.some((l) => l.toLowerCase().startsWith(w)));
if (missing.length) fail(`нет строк: ${missing.join(', ')}`);
const ids = [...inp.matchAll(/\[(N\d+)/g)].map((m) => m[1]);
const noSource = body.filter((l) => !ids.some((id) => l.includes(id)));
if (noSource.length) fail(`без источника: ${noSource.length} из ${body.length}`);

// даты и дни недели в ответе должны быть во входе
const dates = [...res.matchAll(/\b\d{1,2}\.\d{1,2}\b/g)].map((m) => m[0]).filter((d) => !inp.includes(d));
if (dates.length) fail(`дата, которой нет во входе: ${dates.join(', ')}`);
const DAYS = ['понедельник', 'вторник', 'сред', 'четверг', 'пятниц', 'суббот', 'воскресен'];
const days = DAYS.filter((d) => res.toLowerCase().includes(d) && !inp.toLowerCase().includes(d));
if (days.length) fail(`день недели, которого нет во входе: ${days.join(', ')}`);

// старый вход: самая свежая заметка старше двух дней – ответ обязан это сказать (TODAY=2026-11-23 – проверить на дате учебного входа)
const now = process.env.TODAY ? new Date(`${process.env.TODAY}T12:00:00`) : new Date();
const noteDates = [...inp.matchAll(/\[N\d+,\s*(\d{1,2})\.(\d{1,2})/g)].map((m) => new Date(now.getFullYear(), +m[2] - 1, +m[1]));
if (noteDates.length) {
  const fresh = new Date(Math.max(...noteDates));
  const ageH = (now - fresh) / 36e5;
  if (ageH > 48 && !/устарел/i.test(res)) fail(`вход старше двух дней (${fresh.toLocaleDateString('ru-RU')}), ответ этого не говорит`);
}
pass(`${body.length} из 3 строк с источником${/устарел/i.test(res) ? ', старый вход назван' : ''}`);
