// карта вопросов: статус каждого вопроса считается из его файла
// node frontier.mjs [папка карты] → решён · граница · ждёт; граница – что можно брать в следующей сессии агента
// есть «## Answer» – решён · есть «## Ruled out» – вне охвата · claimed_by – в работе · все blocked_by решены – граница · иначе ждёт
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2] || dirname(fileURLToPath(import.meta.url));
const T = join(dir, 'tickets');
const qs = readdirSync(T).filter((f) => /^\d+-.*\.md$/.test(f)).sort().map((f) => {
  const s = readFileSync(join(T, f), 'utf8');
  const fm = (s.match(/^---\n([\s\S]*?)\n---/) || [])[1] || '';
  const field = (k) => ((fm.match(new RegExp(`^${k}:\\s*(.*)$`, 'm')) || [])[1] || '').trim();
  return {
    id: f.split('-')[0],
    title: (s.match(/^## Question\s*\n+(.+)$/m) || [])[1] || f,
    dep: field('blocked_by').replace(/[[\]]/g, '').split(',').map((x) => x.trim()).filter(Boolean).map((x) => x.padStart(2, '0')),
    done: /^## Answer/m.test(s), out: /^## Ruled out/m.test(s), claimed: field('claimed_by'),
  };
});
const by = new Map(qs.map((q) => [q.id, q]));
const solved = (id) => { const q = by.get(id); return !!q && (q.done || q.out); };
const state = (q) => (q.out ? 'вне охвата' : q.done ? 'решён' : q.claimed ? 'в работе' : q.dep.every(solved) ? 'граница' : `ждёт ${q.dep.filter((d) => !solved(d)).join(' + ')}`);
for (const q of qs) console.log(`${state(q).padEnd(13)} ${q.id}  ${q.title}`);
const front = qs.filter((q) => state(q) === 'граница');
console.log(`\nрешено ${qs.filter((q) => q.done).length} из ${qs.length} · граница: ${front.map((q) => q.id).join(', ') || 'пусто'}`);
console.log(front.length ? 'следующая сессия агента берёт один вопрос с границы и дописывает в его файл ## Answer' : 'граница пуста: ответь на вопрос, который держит остальные, или закрой карту');
