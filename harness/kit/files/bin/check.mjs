#!/usr/bin/env node
// self-harness checks: no model, the same answer every run. node bin/check.mjs
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name.startsWith('.') ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(root).map((f) => path.relative(root, f)).filter((f) => f.endsWith('.md'));
const out = [];
const self = fs.existsSync('self.md') ? fs.readFileSync('self.md', 'utf8') : '';
for (const h of ['кто я', 'чем занят', 'как я решаю', 'как со мной работать', 'чего не трогать']) if (!self.includes(`## ${h}`)) out.push(`self.md: нет раздела «${h}»`);
const HUB = new Set(['self.md', 'AGENTS.md', 'CLAUDE.md', 'README.md']);
for (const f of files) {
  const name = path.basename(f);
  if (HUB.has(name) || name === 'README.md') continue;
  if (!/^\{[a-z]+\} .+\.md$/.test(name)) out.push(`${f}: имя без {типа}`);
  const fmm = /^---\n([\s\S]*?)\n---/.exec(fs.readFileSync(f, 'utf8'));
  if (/^(people|projects|decisions|meetings)\//.test(f) && !(fmm && /\nid:|^id:/.test('\n' + fmm[1]) && /type:/.test(fmm[1]))) out.push(`${f}: нет id или type`);
  const d = /– (\d{4}-\d{2}-\d{2})\.md$/.exec(name);
  if (f.startsWith('drafts/') && d && (Date.now() - Date.parse(d[1])) / 864e5 > 30 && !name.includes('purgatory')) out.push(`${f}: черновик старше 30 дней`);
}
console.log(out.length ? out.map((s) => '✗ ' + s).join('\n') : `✓ ${files.length} файлов · всё по правилам`);
process.exit(out.length ? 1 : 0);
