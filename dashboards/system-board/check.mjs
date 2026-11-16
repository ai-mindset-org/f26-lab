// system-board · проверка: ошибки консоли, выход за ширину, снимки каждой вкладки
// node check.mjs [адрес] [папка-для-снимков]
import { createRequire } from 'module';
import { execSync } from 'child_process';
import { readdirSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
const require = createRequire(import.meta.url);
const PW = process.env.PW || execSync('npm root -g').toString().trim() + '/playwright';
const { chromium } = require(PW);
function findChrome(){
  if (process.env.CHROME) return process.env.CHROME;
  const c = homedir() + '/Library/Caches/ms-playwright';
  if (!existsSync(c)) return undefined;
  for (const x of readdirSync(c).filter(x => x.startsWith('chromium_headless_shell-')).sort().reverse()) {
    const p = `${c}/${x}/chrome-headless-shell-mac-arm64/chrome-headless-shell`; if (existsSync(p)) return p; }
}
const url = process.argv[2] || 'http://127.0.0.1:8981/';
const out = process.argv[3] || '/tmp/codex-screenshots/system-board';
mkdirSync(out, { recursive: true });
const ex = findChrome();
const b = await chromium.launch(ex ? { executablePath: ex } : {});
const tabs = ['today', 'start', 'rules', 'skills', 'folders', 'howto'];
const errs = []; let shots = 0;
for (const [w, h, dev] of [[1440, 900, 'desk'], [390, 844, 'phone']]) {
  for (const theme of ['beet', 'dark']) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('console', m => m.type() === 'error' && errs.push(`${dev}/${theme}: ${m.text()}`));
    p.on('pageerror', e => errs.push(`${dev}/${theme}: ${e.message}`));
    await p.addInitScript(t => { try { localStorage.setItem('sb-theme', t); } catch (e) {} }, theme);
    for (const tab of tabs) {
      if (theme === 'dark' && !['today', 'howto'].includes(tab)) continue;
      await p.goto(url.replace(/#.*$/, '') + '#' + tab, { waitUntil: 'networkidle' });
      await p.waitForTimeout(300);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (ov > 0) errs.push(`${dev}/${theme}/${tab}: выход за ширину ${ov}px`);
      const empty = await p.evaluate(() => [...document.querySelectorAll('.pane.on svg')].filter(s => s.closest('.pane') && s.id && !s.innerHTML.trim()).map(s => s.id));
      if (empty.length) errs.push(`${dev}/${theme}/${tab}: пустые фигуры ${empty.join(',')}`);
      await p.screenshot({ path: `${out}/${dev}-${theme}-${tab}.png`, fullPage: true }); shots++;
    }
    await p.close();
  }
}
await b.close();
console.log(errs.length ? errs.join('\n') : `ok: ${shots} снимков в ${out}, ошибок нет, выхода за ширину нет`);
