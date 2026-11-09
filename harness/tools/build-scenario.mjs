#!/usr/bin/env node
// kit/ → web/scenario.json (replay mode data). Run after any kit edit.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from './timeline.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kit = path.join(root, 'kit');
const files = path.join(kit, 'files');
const tl = buildTimeline(kit);
let n = 0x3a7f1;
for (const e of tl.events) if (e.type === 'commit') e.hash = (n = (n * 7919 + 104729) % 0xfffffff).toString(16).padStart(7, '0').slice(0, 7);
const out = path.join(root, 'web', 'scenario.json');
// the build time changes only with the content: new.sh leaves a clean engine clone behind
const stable = (file, obj) => {
  let prev = null; try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* first build */ }
  const same = prev && JSON.stringify({ ...prev, generated: 0 }) === JSON.stringify({ ...obj, generated: 0 });
  obj.generated = same ? prev.generated : new Date().toISOString();
  if (!same) fs.writeFileSync(file, JSON.stringify(obj));
  return obj.generated;
};
tl.generated = stable(out, tl);
const paths = new Set();
for (const e of tl.events) { if (e.type === 'file') paths.add(e.path); if (e.type === 'rename') { paths.delete(e.from); paths.add(e.to); } }
// documents for guide.html and access.html: kit markdown rendered with the default answers
const { renderTemplate } = await import('./timeline.mjs');
const answers = JSON.parse(fs.readFileSync(path.join(kit, 'answers.json'), 'utf8'));
const DOC_DIRS = ['tools', 'rules', 'ontology', 'skills', 'routines', 'evals', 'context', 'projects', 'people'];
const DOC_FILES = ['README.md', 'AGENTS.md', 'self.md', 'notes/{index} F26 people – 2026-11-09.md'];
const docs = {};
for (const d of DOC_DIRS) for (const f of fs.readdirSync(path.join(files, d)).filter((x) => x.endsWith('.md'))) DOC_FILES.push(`${d}/${f}`);
for (const rel of DOC_FILES) { const p = path.join(files, rel); if (fs.existsSync(p)) docs[rel] = renderTemplate(fs.readFileSync(p, 'utf8'), answers); }
stable(path.join(root, 'web', 'kit-docs.json'), { generated: tl.generated, docs });
console.log(`docs → web/kit-docs.json · ${Object.keys(docs).length} файлов`);
console.log(`scenario → ${path.relative(root, out)} · ${tl.phases.length} фаз · ${tl.events.length} событий · ${paths.size} файлов · ${(tl.duration / 1000).toFixed(0)} с`);
