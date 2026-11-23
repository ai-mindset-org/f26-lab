#!/usr/bin/env python3
"""трасса сессии: журнал Claude Code или Codex → шаги агента по шести дорожкам.

  python3 tools/trace.py serve [--port 8997]      страница session.html + /api, только 127.0.0.1
  python3 tools/trace.py list                     последние сессии обоих агентов
  python3 tools/trace.py demo                     data/trace-demo.js по списку live/demo.json
  python3 tools/trace.py export <jsonl|id> [--anon] [--title …] [--from ISO] [--to ISO]
                                                  запись для data/trace-demo.js (JSON в stdout)

Дорожки: search ищу · think формулирую · make делаю · check проверяю · ask зову человека · release отпускаю.
Метки: human – реплика человека (решение), answer – итог хода, compact – компакт.
Текст реплик и мыслей обрезается до 160 знаков; --anon и ?anon=1 убирают его совсем.
"""
import json, os, re, sqlite3, sys, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

HOME = Path.home()
CLAUDE = HOME / '.claude' / 'projects'
CODEX = HOME / '.codex' / 'sessions'
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent if (HERE.parent / 'session.html').exists() else HERE  # path-map/tools или набор w3/trace
CUT = 160

PLAN_RE = re.compile(r'(brief|plan|prompt|map|ticket|readme|skill|notes?|decision|todo|spec|agents|claude)[^/]*\.(md|txt)$', re.I)
CHECK_RE = re.compile(r'(\btest\b|pytest|jest|vitest|check\.mjs|\bcheck\b|lint|plutil|--check|tsc\b|playwright|shoot|screenshot|\bqa\b|gitleaks|validate|verify|curl[^|]*-w|http_code|status\.json|frontier\.mjs|run-log|^curl |\bcurl -fs)', re.I)
READ_RE = re.compile(r'^\s*(cd [^;&]+(&&|;)\s*)?(ls|cat|sed -n|head|tail|grep|rg|find|wc|stat|file|du|which|date|jq|tree|lsof|ps|less|git (log|show|status|diff|branch|rev-parse|ls-files)|python3 -c "import json|echo)\b')
RELEASE_RE = re.compile(r'(launchctl|crontab|relay\.py to-|dispatch\.sh|orca terminal send|codex exec|claude -p|gh workflow run)', re.I)
D_SEARCH = re.compile(r'^(read|inspect|find|list|look|search|get|dump|extract|show|grep|view|sample|fetch|count|locate|explore|check (time|what|which|whether|for|if|how|where)|прочит|найд|посмотр|покаж|изуч)', re.I)
D_CHECK = re.compile(r'^(test|screenshot|render|lint|syntax|verify|validate|scan|qa|re-?check|check|compare|measure|smoke|провер|сним)', re.I)
D_THINK = re.compile(r'^(pin|save memory|order self-compaction|plan|note|записать решение|закреп)', re.I)
ERR_RE = re.compile(r'(exit code:?\s*[1-9]|"exit_code":\s*[1-9]|Traceback \(most recent|\bError:|command not found|No such file)', re.I)


def short(s, n=CUT):
    s = re.sub(r'\s+', ' ', str(s or '')).strip()
    return s if len(s) <= n else s[:n - 1] + '…'


def base(p):
    return os.path.basename(str(p or '').rstrip('/')) or str(p or '')


def bash_lane(cmd, desc=''):
    if RELEASE_RE.search(cmd): return 'release'
    if desc:
        if D_THINK.match(desc): return 'think'
        if D_SEARCH.match(desc): return 'search'
        if D_CHECK.match(desc): return 'check'
        return 'make'
    if CHECK_RE.search(cmd): return 'check'
    if READ_RE.match(cmd): return 'search'
    return 'make'


def claude_tool(name, inp):
    """дорожка и подпись для вызова инструмента Claude Code"""
    inp = inp if isinstance(inp, dict) else {}
    n = name or ''
    if n == 'Read':
        f = inp.get('file_path', '')
        return ('check' if re.search(r'\.(png|jpe?g|webp|gif)$', f, re.I) else 'search'), base(f)
    if n in ('Write', 'Edit', 'MultiEdit', 'NotebookEdit'):
        f = inp.get('file_path') or inp.get('notebook_path', '')
        return ('think' if PLAN_RE.search(base(f)) else 'make'), base(f)
    if n == 'Bash':
        c = inp.get('command', '')
        return bash_lane(c, inp.get('description', '')), short(inp.get('description') or c, 90)
    if n in ('Grep', 'Glob', 'LS', 'ToolSearch', 'WebSearch', 'WebFetch', 'ListMcpResourcesTool', 'ReadMcpResourceTool'):
        return 'search', short(inp.get('pattern') or inp.get('query') or inp.get('url') or '', 90)
    if n == 'Skill':
        return 'think', 'skill · ' + str(inp.get('skill', ''))
    if n in ('TodoWrite', 'TaskCreate', 'TaskUpdate', 'EnterPlanMode', 'ExitPlanMode'):
        return 'think', 'план'
    if n in ('AskUserQuestion',) or 'ask_user' in n:
        q = inp.get('questions') or [{}]
        return 'ask', short((q[0] or {}).get('question', 'вопрос человеку'), 120)
    if n in ('Agent', 'Task', 'SendMessage', 'Workflow', 'CronCreate', 'ScheduleWakeup', 'RemoteTrigger'):
        return 'release', short(inp.get('description') or inp.get('name') or inp.get('to') or n, 90)
    if n.startswith('mcp__'):
        tail = n.split('__')[-1]
        if re.search(r'(search|get|list|read|fetch|find|info|query|context|summary)', tail): return 'search', tail
        if re.search(r'(send|schedule|create_event|draft)', tail): return 'release', tail
        return 'make', tail
    return 'make', n


def codex_tool(name, ns, args):
    n = (name or '').lower()
    a = args if isinstance(args, str) else json.dumps(args, ensure_ascii=False)
    try:
        j = json.loads(a) if a.strip().startswith('{') else {}
    except Exception:
        j = {}
    if n in ('shell', 'exec_command', 'local_shell', 'container.exec'):
        c = j.get('cmd') or j.get('command') or a
        c = ' '.join(c) if isinstance(c, list) else str(c)
        c = re.sub(r"^(bash|zsh) -l?c ", '', c)
        return bash_lane(c), short(c, 90)
    if n == 'apply_patch' or '*** Begin Patch' in a:
        fs = re.findall(r'\*\*\* (?:Update|Add|Delete) File: (.+)', a)
        return 'make', ', '.join(base(f) for f in fs[:3]) or 'правка'
    if n == 'exec':  # Codex Desktop: шаг кодом, внутри exec_command / apply_patch / write_stdin
        if 'apply_patch' in a:
            fs = re.findall(r'\*\*\* (?:Update|Add|Delete) File: ([^\n*]+?)(?:\s@@|\n|\s\*\*\*|$)', a)
            return 'make', ', '.join(base(f.strip()) for f in fs[:3]) or 'правка'
        cm = re.findall(r'exec_command\(\{\s*cmd:\s*[`"\'](.{0,400})', a, re.S)
        if cm:
            c = cm[0].replace('\\n', ' ')
            return bash_lane(c), short(c, 90)
        if 'write_stdin' in a: return 'check', 'ждёт вывод процесса'
        if re.search(r'(writeFile|appendFile|fs\.write|mkdir)', a): return 'make', 'код · запись'
        if re.search(r'(screenshot|createBrowserTab|playwright|cua\.|view_image)', a): return 'check', 'код · снимок'
        if re.search(r'(readFile|readdir| rg | cat |sed -n|ls )', a): return 'search', 'код · чтение'
        return 'make', 'код'
    if n in ('update_plan',): return 'think', 'план'
    if n in ('sleep', 'wait', 'wait_agent', 'followup_task'): return 'release', 'ждёт других' if n != 'followup_task' else 'задача агенту'
    if n in ('web_search', 'web_search_call'): return 'search', 'веб-поиск'
    if n in ('view_image',) or ns == 'mcp__cua_repl': return 'check', n
    if n in ('create_thread', 'send_message', 'spawn_agent', 'send_input') or 'thread' in n: return 'release', n
    if re.search(r'(search|get|list|read|fetch|find|query)', n): return 'search', n
    return 'make', n or 'шаг'


class Parser:
    """инкрементальный разбор одного файла; события накапливаются, позиция в байтах"""

    def __init__(self, path, src):
        self.path, self.src, self.pos = Path(path), src, 0
        self.ev, self.by_call, self.turn, self.meta = [], {}, 0, {'src': src, 'title': '', 'cwd': ''}

    def add(self, ts, lane, tool='', d='', **kw):
        e = {'i': len(self.ev), 't': ts, 'lane': lane, 'tool': tool, 'd': d, 'turn': self.turn}
        e.update(kw)
        self.ev.append(e)
        return e

    def say(self, ts, text):
        e = self.add(ts, 'say', 'текст', short(text))
        body = re.split(r'◇ ctx|▫ eval|⏻ можно|```', text)[0].strip()
        if body.endswith('?') or '◑' in text or re.search(r'\?\s*$', body.split('\n')[-1]): e['q'] = 1
        m = STAGE_RE.match(text.strip())
        if m: e['stage'] = m.group(1) + ' · ' + m.group(2).strip().rstrip('.*').lower()

    def human(self, ts, text):
        self.turn += 1
        self.add(ts, 'human', '', short(text))

    def feed(self):
        try:
            size = self.path.stat().st_size
        except FileNotFoundError:
            return
        if size < self.pos: self.__init__(self.path, self.src)
        if size == self.pos: return
        with open(self.path, 'rb') as f:
            f.seek(self.pos)
            chunk = f.read()
        end = chunk.rfind(b'\n')
        if end < 0: return
        self.pos += end + 1
        for raw in chunk[:end].split(b'\n'):
            head = raw[:160]
            if b'"type":"api-request' in head or b'"type":"attachment"' in head or b'token_count' in head or b'"token_usage_record"' in head:
                continue
            try:
                d = json.loads(raw)
            except Exception:
                continue
            ts = ts_of(d.get('timestamp'))
            (self.claude if self.src == 'claude' else self.codex)(d, ts)

    # ---- Claude Code
    def claude(self, d, ts):
        t = d.get('type')
        if t == 'custom-title': self.meta['title'] = d.get('customTitle', ''); return
        if d.get('cwd') and not self.meta['cwd']: self.meta['cwd'] = d['cwd']
        if t == 'system' and d.get('subtype') == 'compact_boundary': self.add(ts, 'compact', '', 'компакт'); return
        if t not in ('user', 'assistant') or d.get('isSidechain'): return
        m = d.get('message') or {}
        c = m.get('content')
        if t == 'user':
            if d.get('isMeta') or d.get('isCompactSummary'): return
            if isinstance(c, str): texts = [c]
            else:
                texts = []
                for b in c or []:
                    if b.get('type') == 'tool_result':
                        e = self.by_call.get(b.get('tool_use_id'))
                        if e is not None and (b.get('is_error') or (e['lane'] in ('check', 'make') and ERR_RE.search(str(b.get('content'))[:4000]))):
                            e['err'] = 1
                    elif b.get('type') == 'text': texts.append(b.get('text', ''))
                    elif b.get('type') == 'image': texts.append('[снимок]')
            txt = ' '.join(texts).strip()
            if not txt: return
            if txt.startswith('<command-name>/compact'): self.add(ts, 'compact', '', '/compact'); return
            if txt.startswith(('<', 'Caveat:', '[Request interrupted')): return
            self.human(ts, re.sub(r'\[Image[^\]]*\]', '[снимок]', txt))
            return
        for b in c or []:
            k = b.get('type')
            if k == 'thinking':
                self.add(ts, 'think', 'мысль', short(b.get('thinking', '')))
            elif k == 'text' and b.get('text', '').strip():
                self.say(ts, b['text'])
            elif k == 'tool_use':
                lane, lab = claude_tool(b.get('name'), b.get('input'))
                e = self.add(ts, lane, b.get('name', ''), lab)
                if b.get('name') == 'Skill': e['skill'] = str((b.get('input') or {}).get('skill', ''))
                if lane in ('make', 'think') and b.get('name') in ('Write', 'Edit', 'MultiEdit'): e['file'] = lab
                self.by_call[b.get('id')] = e

    # ---- Codex (CLI и Desktop)
    def codex(self, d, ts):
        t, p = d.get('type'), d.get('payload') or {}
        if t == 'session_meta': self.meta['cwd'] = p.get('cwd', ''); return
        if t == 'compacted': self.add(ts, 'compact', '', 'компакт'); return
        if t == 'event_msg' and p.get('type') == 'user_message':
            self.human(ts, p.get('message', '')); self.meta['um'] = 1; return
        if t != 'response_item': return
        k = p.get('type')
        if k == 'message':
            txt = ' '.join(x.get('text', '') for x in p.get('content') or [] if isinstance(x, dict)).strip()
            if p.get('role') == 'user' and not self.meta.get('um') and txt and not txt.startswith('<') and '<environment_context>' not in txt:
                self.human(ts, txt)
            elif p.get('role') == 'assistant' and txt:
                self.say(ts, txt)
        elif k == 'reasoning':
            s = ' '.join(x.get('text', '') for x in p.get('summary') or [] if isinstance(x, dict))
            self.add(ts, 'think', 'мысль', short(s))
        elif k in ('function_call', 'custom_tool_call', 'local_shell_call', 'web_search_call'):
            lane, lab = codex_tool(p.get('name') or k, p.get('namespace', ''), p.get('arguments') or p.get('input') or p.get('action') or '')
            e = self.add(ts, lane, p.get('name') or k, lab)
            if lane == 'make' and lab and lab not in ('код', 'правка', 'код · запись'): e['file'] = lab
            self.by_call[p.get('call_id')] = e
        elif k in ('function_call_output', 'custom_tool_call_output'):
            e = self.by_call.get(p.get('call_id'))
            if e is not None and ERR_RE.search(str(p.get('output'))[:4000]): e['err'] = 1

    def events(self):
        """текст, после которого в ходе нет действий, – итог хода; итог с вопросом – зов человека"""
        out, acted = [], set()
        for e in reversed(self.ev):
            if e['lane'] == 'human': continue
            if e['lane'] in ACTS: acted.add(e['turn'])
            if e['lane'] == 'say' and e['turn'] not in acted:
                e['_fin'] = 1; acted.add(e['turn'])
        for e in self.ev:
            if e['lane'] == 'say':
                fin = e.pop('_fin', 0)
                q = e.pop('q', 0)
                e = dict(e, lane='answer', asks=q) if fin else dict(e, lane='think', tool='текст')
                if fin: e['say'] = 1
            out.append(e)
        return out


ACTS = ('search', 'make', 'check', 'release', 'ask')
STAGE_RE = re.compile(r'^[*#\s]*шаг\s*(\d+)\s*[·.:–-]\s*([^*\n]{2,40})', re.I)


def ts_of(v):
    if not v: return None
    try:
        return round(time.mktime(time.strptime(v[:19], '%Y-%m-%dT%H:%M:%S')) - time.timezone, 1)
    except Exception:
        return None


# ---- список сессий
def codex_names():
    try:
        c = sqlite3.connect(f"file:{HOME / '.codex' / 'state_5.sqlite'}?mode=ro", uri=True, timeout=2)
        r = {Path(x[2]).name: (x[0] or x[1].split('\n')[0])[:80] for x in c.execute('select coalesce(name,""), coalesce(title,""), rollout_path from threads')}
        c.close()
        return r
    except Exception:
        return {}


def codex_proj(p):
    try:
        with open(p, 'rb') as f:
            m = re.search(rb'"cwd":"([^"]+)"', f.read(6000))
        return re.sub(r'[/_.]', '-', m.group(1).decode()) if m else ''
    except Exception:
        return ''


def title_of(path):
    """custom-title или первая реплика: читаем начало и хвост, весь файл не трогаем"""
    try:
        with open(path, 'rb') as f:
            f.seek(max(0, os.path.getsize(path) - 400000))
            tail = f.read().decode('utf8', 'ignore')
        m = re.findall(r'"customTitle":"([^"]{1,90})"', tail)
        if m: return m[-1]
        m = re.findall(r'"lastPrompt":"([^"]{1,200})', tail)
        if m: return short(m[-1].encode().decode('unicode_escape', 'ignore') if '\\u' in m[-1] else m[-1], 70)
    except Exception:
        pass
    return ''


def sessions(src='all', limit=24):
    out = []
    if src in ('all', 'claude'):
        for p in CLAUDE.glob('*/*.jsonl'):
            st = p.stat()
            out.append({'src': 'claude', 'id': p.stem, 'path': str(p), 'proj': p.parent.name, 'mtime': st.st_mtime, 'born': st.st_birthtime, 'size': st.st_size})
    if src in ('all', 'codex'):
        paths = set()
        try:  # треды Codex Desktop и CLI: файл журнала берём из базы приложения
            c = sqlite3.connect(f"file:{HOME / '.codex' / 'state_5.sqlite'}?mode=ro", uri=True, timeout=2)
            paths |= {r[0] for r in c.execute('select rollout_path from threads where archived=0 order by updated_at_ms desc limit 60') if r[0]}
            c.close()
        except Exception:
            pass
        for back in range(0, 2):
            paths |= {str(x) for x in (CODEX / time.strftime('%Y/%m/%d', time.localtime(time.time() - back * 86400))).glob('rollout-*.jsonl')}
        for sp in paths:
            p = Path(sp)
            if not p.exists(): continue
            st = p.stat()
            out.append({'src': 'codex', 'id': p.stem.split('-', 6)[-1], 'path': str(p), 'proj': codex_proj(p), 'mtime': st.st_mtime, 'born': st.st_birthtime, 'size': st.st_size})
    out.sort(key=lambda x: -x['mtime'])
    out = out[:limit + 12]
    names = codex_names() if any(x['src'] == 'codex' for x in out) else {}
    now = time.time()
    for x in out:
        x['title'] = names.get(Path(x['path']).name, '') if x['src'] == 'codex' else title_of(x['path'])
        x['live'] = now - x['mtime'] < 90
    return [x for x in out if not x['title'].startswith('Name this chat')][:limit]


def find(ident):
    if os.path.exists(ident): return ident, ('codex' if '/.codex/' in ident else 'claude')
    for x in sessions('all', 2000):
        if x['id'] == ident or x['id'].startswith(ident): return x['path'], x['src']
    raise SystemExit('нет сессии ' + ident)


CACHE = {}


def trace(path, src, after=0, anon=False):
    pr = CACHE.get(path)
    if pr is None: pr = CACHE[path] = Parser(path, src)
    pr.feed()
    ev = pr.events()
    if anon: ev = [dict(e, d='' if e['lane'] in ('human', 'answer', 'think') else e['d']) for e in ev]
    return {'meta': dict(pr.meta, id=Path(path).stem, bytes=pr.pos, n=len(ev), now=time.time()), 'events': ev[after:], 'after': after}


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def j(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        u = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        if u.path == '/api/sessions':
            ss = sessions(q.get('src', 'all'), int(q.get('limit', 24)))
            f = q.get('proj')
            if f: ss = [x for x in ss if f in x['proj'] or f in x['path']]
            return self.j({'sessions': [{k: v for k, v in x.items() if k != 'path'} for x in ss], 'now': time.time()})
        if u.path == '/api/trace':
            try:
                path, src = find(q.get('id', ''))
            except SystemExit as e:
                return self.j({'error': str(e)}, 404)
            return self.j(trace(path, src, int(q.get('after', 0)), q.get('anon') == '1'))
        return super().do_GET()


def record(ident, anon=False, lo=None, hi=None, title=None):
    path, src = find(ident)
    r = trace(path, src, 0, anon)
    ev = r['events']
    if lo: lo = ts_of(lo); ev = [e for e in ev if (e['t'] or 0) >= lo]
    if hi: hi = ts_of(hi); ev = [e for e in ev if (e['t'] or 0) <= hi]
    if ev:
        t0 = ev[0]['turn'] - (1 if ev[0]['lane'] == 'human' else 0)
        ev = [dict(e, i=i, turn=max(0, e['turn'] - t0)) for i, e in enumerate(ev)]
    meta = dict(r['meta'], n=len(ev), id=r['meta']['id'][:8])
    meta.pop('cwd', None); meta.pop('bytes', None); meta.pop('now', None); meta.pop('um', None)
    if title: meta['title'] = title
    return {'meta': meta, 'events': ev}


def main():
    a = sys.argv[1:] or ['serve']
    if a[0] == 'serve':
        port = int(a[a.index('--port') + 1]) if '--port' in a else 8997
        print(f'трасса сессии: http://127.0.0.1:{port}/session.html?follow=new')
        ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
    elif a[0] == 'list':
        for x in sessions('all', 20):
            print(f"{time.strftime('%d.%m %H:%M', time.localtime(x['mtime']))} {'●' if x['live'] else ' '} {x['src']:6} {x['id'][:13]}  {x['title'][:60]}")
    elif a[0] == 'export':
        json.dump(record(a[1], '--anon' in a, a[a.index('--from') + 1] if '--from' in a else None, a[a.index('--to') + 1] if '--to' in a else None,
                         a[a.index('--title') + 1] if '--title' in a else None), sys.stdout, ensure_ascii=False)
    elif a[0] == 'demo':
        out = []
        for c in json.loads((ROOT / 'live' / 'demo.json').read_text()):
            if '--kit' in a and not c.get('kit'): continue
            r = record(c['id'], c.get('anon'), c.get('from'), c.get('to'), c['title'])
            r['meta']['note'] = c.get('note', '')
            out.append(dict(key=c['key'], **r))
            print(c['key'], len(r['events']), 'событий')
        (ROOT / 'data' / 'trace-demo.js').write_text('/* записи трассы · python3 tools/trace.py demo */\nwindow.PMTRACE_DEMO = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')


if __name__ == '__main__':
    main()
