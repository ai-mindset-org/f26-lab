#!/usr/bin/env python3
"""system-board · сборщик дашборда «что происходит в системе агентов».

Читает папки агента (Claude Code, Codex), волты Obsidian, папки skills и
необязательный файл сообщений Telegram. Ничего не меняет: только чтение.
Пишет data.json (полный, остаётся на твоей машине) или data-show.json (для показа).

    python3 collect.py                    # config.json рядом, иначе config.example.json
    python3 collect.py --show             # без названий, текстов и имён файлов
    python3 collect.py --config my.json

Нужен только Python 3.10+, без пакетов.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
HOME = Path.home()
SHOW = "--show" in sys.argv
TODAY = dt.date.today()
NOW = dt.datetime.now()
DAY0 = dt.datetime.combine(TODAY, dt.time.min)
TEXT_EXT = {".md", ".py", ".sh", ".js", ".mjs", ".json", ".txt", ".yaml", ".yml", ".html", ".css"}


def arg(name: str, default: str | None = None) -> str | None:
    if name in sys.argv:
        i = sys.argv.index(name)
        return sys.argv[i + 1] if i + 1 < len(sys.argv) else default
    return default


def load_config() -> dict:
    p = arg("--config")
    for cand in ([Path(p)] if p else [HERE / "config.json", HERE / "config.example.json"]):
        if cand.exists():
            return json.loads(cand.read_text(encoding="utf-8"))
    return {}


CFG = load_config()


def P(s: str | None) -> Path | None:
    return Path(os.path.expanduser(s)) if s else None


def tilde(p) -> str:
    return str(p).replace(str(HOME), "~")


def read(p: Path | None) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="replace") if p else ""
    except OSError:
        return ""


def est_tokens(text: str) -> int:
    """Оценка без токенайзера: кириллица ≈2.6 символа на токен, латиница ≈3.8."""
    cyr = len(re.findall(r"[А-Яа-яЁё]", text))
    return int(cyr / 2.6 + (len(text) - cyr) / 3.8)


def hm(ts: float) -> str:
    return dt.datetime.fromtimestamp(ts).strftime("%H:%M")


TS_RE = re.compile(r'"timestamp":"([^"]+)"')


def parse_ts(s: str) -> dt.datetime | None:
    try:
        return dt.datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone().replace(tzinfo=None)
    except ValueError:
        return None


def segments(times: list[dt.datetime], gap_min: int = 20) -> list[list[str]]:
    """Склеивает метки активности в отрезки: пауза дольше gap_min режет отрезок."""
    out, s, e = [], None, None
    for t in sorted(times):
        if s is None:
            s = e = t
        elif (t - e).total_seconds() > gap_min * 60:
            out.append([s, e]); s = e = t
        else:
            e = t
    if s is not None:
        out.append([s, e])
    return [[a.strftime("%H:%M"), max(b, a + dt.timedelta(minutes=3)).strftime("%H:%M")] for a, b in out]


# ── 1. что грузится всегда ────────────────────────────────────────────────
def always_loaded() -> list[dict]:
    out = []
    for f in CFG.get("always", []):
        p = P(f["path"])
        t = read(p)
        if t:
            out.append({"label": f["label"], "path": tilde(p), "when": f.get("when", ""),
                        "lines": t.count("\n") + 1, "tokens": est_tokens(t)})
    return out


def rule_sections(path: str | None) -> list[dict]:
    t = read(P(path)).splitlines()
    heads = [(i, l[3:].strip()) for i, l in enumerate(t) if l.startswith("## ")]
    out = []
    for n, (i, h) in enumerate(heads):
        end = heads[n + 1][0] if n + 1 < len(heads) else len(t)
        body = "\n".join(t[i + 1:end])
        title = re.sub(r"\s*\((CRITICAL|critical)[^)]*\)", "", h)
        title = re.sub(r"\s*[–-]\s*\d{4}-\d{2}-\d{2}.*$", "", title).strip()
        out.append({"title": title, "critical": "CRITICAL" in h or "⛔" in body[:300],
                    "lines": end - i, "tokens": est_tokens(body)})
    return out


# ── 2. хуки по событиям сессии ─────────────────────────────────────────────
LIFE = ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop", "PreCompact", "PostCompact", "SessionEnd"]


def hooks(claude_dir: Path) -> list[dict]:
    try:
        s = json.loads(read(claude_dir / "settings.json") or "{}")
    except json.JSONDecodeError:
        s = {}
    out = []
    for ev in LIFE:
        names = []
        for m in s.get("hooks", {}).get(ev, []):
            for h in m.get("hooks", []):
                hit = re.findall(r"([\w.-]+\.(?:sh|py|js|mjs))", h.get("command", ""))
                names.append(hit[0] if hit else "inline")
        out.append({"event": ev, "count": len(names), "scripts": list(dict.fromkeys(names))})
    return out


# ── 3. skills: размер и обновления ─────────────────────────────────────────
def frontmatter(t: str) -> dict:
    m = re.match(r"---\n(.*?)\n---", t, re.S)
    d = {}
    if m:
        for line in m.group(1).splitlines():
            if ":" in line and not line.startswith(" "):
                k, v = line.split(":", 1)
                d[k.strip()] = v.strip().strip('"')
    return d


def skills() -> dict:
    seen, rows, counts = set(), [], {}
    for sd in CFG.get("skill_dirs", []):
        root = P(sd["path"])
        if not root or not root.exists():
            continue
        n = 0
        for d in sorted(root.iterdir()):
            sk = d / "SKILL.md"
            if not sk.is_file():
                continue
            n += 1
            fm = frontmatter(read(sk))
            name = fm.get("name") or d.name
            if name in seen:
                continue
            seen.add(name)
            lines, files, newest = 0, 0, sk.stat().st_mtime
            for f in d.rglob("*"):
                if not f.is_file() or f.name == ".DS_Store" or "node_modules" in f.parts:
                    continue
                files += 1
                try:
                    newest = max(newest, f.stat().st_mtime)
                    if f.suffix in TEXT_EXT:
                        lines += sum(1 for _ in f.open(errors="replace"))
                except OSError:
                    pass
            rows.append({"n": name, "s": sd["label"], "l": lines, "f": files,
                         "d": fm.get("description", "")[:200], "m": newest})
        counts[sd["label"]] = n
    days = [(TODAY - dt.timedelta(days=i)).isoformat() for i in range(13, -1, -1)]
    by_day = {d: Counter() for d in days}
    for r in rows:
        d = dt.date.fromtimestamp(r["m"]).isoformat()
        if d in by_day:
            by_day[d][r["s"]] += 1
    recent = sorted(rows, key=lambda r: -r["m"])[:16]
    return {
        "counts": counts, "total": len(rows), "header_tokens": sum(est_tokens(r["d"]) + 8 for r in rows),
        "all": [{k: r[k] for k in ("n", "s", "l", "f", "d")} for r in sorted(rows, key=lambda r: r["l"])],
        "ladder": [{"name": r["n"], "lines": r["l"]} for want in CFG.get("ladder", []) for r in rows if r["n"] == want],
        "updates": [{"day": d, "by": dict(c)} for d, c in by_day.items()],
        "recent": [{"n": r["n"], "s": r["s"], "when": dt.datetime.fromtimestamp(r["m"]).strftime("%d.%m %H:%M"),
                    "t": hm(r["m"]) if dt.date.fromtimestamp(r["m"]) == TODAY else None} for r in recent],
    }


# ── 4. сессии сегодня: Claude Code и Codex ─────────────────────────────────
def first_prompt(line: str) -> str:
    """Первые слова первой просьбы: без вставок, картинок и служебных блоков."""
    try:
        d = json.loads(line)
    except json.JSONDecodeError:
        return ""
    c = (d.get("message") or d.get("payload") or {}).get("content", "")
    if isinstance(c, list):
        c = " ".join(x.get("text", "") for x in c if isinstance(x, dict))
    c = re.sub(r"<[^>]+>.*?</[^>]+>|<[^>]+>|\[Image[^\]]*\]|https?://\S+", " ", c, flags=re.S)
    c = re.sub(r"\s+", " ", c).strip()
    if c.startswith(("#", "Caveat", "AGENTS", "<")) or len(c) < 4:
        return ""
    return c[:60]



CMD_RE = re.compile(r"<command-name>/?([\w:.-]+)</command-name>")
BUILTIN = {"clear", "compact", "model", "rename", "resume", "exit", "context", "cost", "config", "status",
           "login", "effort", "fast", "mcp", "help", "permissions", "plugin", "memory"}


def proj_name(enc: str) -> str:
    """Папка проекта Claude кодирует путь через «-»: сверяем с путями из config."""
    for x in CFG.get("vaults", []) + CFG.get("roots", []) + CFG.get("places", []):
        p = P(x.get("path", ""))
        if p and re.sub(r"[/.]", "-", str(p)) == enc:
            return tilde(p)
    return "~" if enc == re.sub(r"[/.]", "-", str(HOME)) else enc.split("-")[-1]


def claude_sessions(claude_dir: Path) -> dict:
    sess, runs, routes, hum, agt = [], Counter(), Counter(), Counter(), Counter()
    proj_root = claude_dir / "projects"
    if proj_root.exists():
        for proj in proj_root.iterdir():
            if not proj.is_dir():
                continue
            for f in proj.glob("*.jsonl"):
                try:
                    if f.stat().st_mtime < DAY0.timestamp():
                        continue
                except OSError:
                    continue
                times, title, prompts, tools, sk, first = [], "", 0, 0, Counter(), ""
                with f.open(errors="replace") as fh:
                    for line in fh:
                        if '"customTitle"' in line:
                            mt = re.search(r'"customTitle":"([^"]*)"', line)
                            if mt:
                                title = mt.group(1)
                        m = TS_RE.search(line)
                        t = parse_ts(m.group(1)) if m else None
                        if not t or t.date() != TODAY:
                            continue
                        times.append(t)
                        if '"type":"user"' in line and '"tool_result"' not in line and '"isMeta":true' not in line \
                                and '"isCompactSummary"' not in line and "<task-notification" not in line:
                            prompts += 1; hum[t.hour] += 1
                            if not first:
                                first = first_prompt(line)
                        elif '"type":"assistant"' in line and '"tool_use"' in line:
                            k = line.count('"type":"tool_use"'); tools += k; agt[t.hour] += k
                        for ms in re.finditer(r'"name":"Skill","input":\{"skill":"([^"]+)"', line):
                            runs[ms.group(1)] += 1; sk[ms.group(1)] += 1; routes["claude_auto"] += 1
                        if "<command-name>" in line and '"type":"user"' in line:
                            for mc in CMD_RE.finditer(line.replace("\\", "")):
                                if mc.group(1) not in BUILTIN:
                                    runs[mc.group(1)] += 1; sk[mc.group(1)] += 1; routes["claude_slash"] += 1
                if times:
                    sess.append({"tool": "claude", "project": proj_name(proj.name),
                                 "title": title or first, "segs": segments(times), "start": min(times).strftime("%H:%M"),
                                 "prompts": prompts, "tools": tools, "skills": [k for k, _ in sk.most_common(4)]})
    sess.sort(key=lambda s: s["start"])
    return {"sessions": sess, "runs": runs.most_common(16), "routes": dict(routes),
            "hum": [hum.get(h, 0) for h in range(24)], "agt": [agt.get(h, 0) for h in range(24)]}


def codex_sessions(codex_dir: Path) -> dict:
    d = codex_dir / "sessions" / f"{TODAY:%Y/%m/%d}"
    sess, runs, agt = [], Counter(), Counter()
    for f in sorted(d.glob("*.jsonl")) if d.exists() else []:
        times, cwd, tools, sk, first = [], "", 0, Counter(), ""
        with f.open(errors="replace") as fh:
            for line in fh:
                if not first and '"role":"user"' in line and '"input_text"' in line:
                    first = first_prompt(line)
                if not cwd and '"session_meta"' in line:
                    mc = re.search(r'"cwd":"([^"]+)"', line)
                    if mc:
                        cwd = tilde(mc.group(1))
                m = TS_RE.search(line)
                t = parse_ts(m.group(1)) if m else None
                if not t or t.date() != TODAY:
                    continue
                times.append(t)
                if re.search(r'"type":"(custom_tool_call|function_call|local_shell_call)"', line):
                    tools += 1; agt[t.hour] += 1
                    if "SKILL.md" in line:
                        for n in set(re.findall(r"skills/([A-Za-z0-9_.:-]+)/SKILL\.md", line)):
                            runs[n] += 1; sk[n] += 1
        if times:
            sess.append({"tool": "codex", "project": cwd, "title": first or Path(cwd).name, "segs": segments(times),
                         "start": min(times).strftime("%H:%M"), "prompts": 0, "tools": tools,
                         "skills": [k for k, _ in sk.most_common(4)]})
    sess.sort(key=lambda s: s["start"])
    return {"sessions": sess, "runs": runs.most_common(16), "agt": [agt.get(h, 0) for h in range(24)]}


# ── 5. Telegram: свой файл или экспорт Telegram Desktop ────────────────────
def telegram() -> list[dict]:
    p = P(CFG.get("telegram"))
    if not p:
        return []
    p = p if p.is_absolute() else HERE / p
    try:
        data = json.loads(read(p) or "{}")
    except json.JSONDecodeError:
        return []
    out = []
    msgs = data.get("messages", [])
    if msgs and "t" in msgs[0]:                                    # свой формат: t, chat, me, text
        for m in msgs:
            t = dt.datetime.strptime(m["t"], "%Y-%m-%d %H:%M")
            if t.date() == TODAY:
                out.append({"t": t.strftime("%H:%M"), "chat": m.get("chat", "чат"), "me": bool(m.get("me")),
                            "text": m.get("text", "") if m.get("me") else ""})
    else:                                                           # экспорт Telegram Desktop (result.json)
        me_id = str(CFG.get("telegram_me", ""))
        for c in data.get("chats", {}).get("list", [data] if msgs else []):
            for m in c.get("messages", []):
                t = dt.datetime.fromisoformat(m.get("date", "1970-01-01T00:00:00"))
                if t.date() != TODAY or m.get("type") != "message":
                    continue
                me = bool(me_id) and str(m.get("from_id", "")).endswith(me_id)
                txt = m.get("text", "")
                if isinstance(txt, list):
                    txt = "".join(x if isinstance(x, str) else x.get("text", "") for x in txt)
                out.append({"t": t.strftime("%H:%M"), "chat": c.get("name", "чат"), "me": me,
                            "text": txt[:120] if me else ""})
    return sorted(out, key=lambda m: m["t"])


# ── 6. Obsidian: файлы сегодня и коммиты ───────────────────────────────────
TYPE_RE = re.compile(r"\{([\w-]+)\}")
# теги проектов, которые не считаются типом заметки: из config, поле not_types
NOT_TYPE = {t.lower() for t in CFG.get("not_types", [])}


def vault_files() -> dict:
    files, by_type = [], Counter()
    for v in CFG.get("vaults", []):
        root = P(v["path"])
        if not root or not root.exists():
            continue
        try:
            r = subprocess.run(["find", str(root), "-name", "*.md", "-newermt", TODAY.isoformat(),
                                "-not", "-path", "*/.git/*", "-not", "-path", "*/.trash/*",
                                "-not", "-path", "*/node_modules/*", "-not", "-path", "*/.obsidian/*",
                                "-not", "-path", "*/.claude/*", "-not", "-path", "*/.agents/*"],
                               capture_output=True, text=True, timeout=30)
        except subprocess.TimeoutExpired:
            continue
        for line in r.stdout.splitlines():
            f = Path(line)
            try:
                st = f.stat()
            except OSError:
                continue
            born = getattr(st, "st_birthtime", st.st_mtime)
            created = dt.date.fromtimestamp(born) == TODAY
            tags = [t for t in TYPE_RE.findall(f.name)
                    if t.lower() not in NOT_TYPE and not t.isupper() and not re.fullmatch(r"[a-z]+\d+", t)]
            typ = tags[0] if tags else ""
            if created:
                by_type[typ or "без типа"] += 1
            files.append({"vault": v["name"], "name": f.stem, "type": typ, "created": created,
                          "t": hm(born if created else st.st_mtime), "m": st.st_mtime})
    files.sort(key=lambda x: -x["m"])
    for x in files:
        x.pop("m")
    return {"files": files[:400], "created": sum(x["created"] for x in files),
            "modified": sum(not x["created"] for x in files), "by_type": by_type.most_common(10)}


# коммиты автоматики (бэкап, синхронизация): префиксы из config, поле auto_commits
AUTO_RE = re.compile("^(" + "|".join(re.escape(x) for x in CFG.get("auto_commits", ["vault backup", "vault sync"])) + ")")


def commits() -> list[dict]:
    out = []
    for v in CFG.get("vaults", []) + CFG.get("repos", []):
        root = P(v["path"])
        if not root or not (root / ".git").exists():
            continue
        try:
            r = subprocess.run(["git", "-C", str(root), "log", f"--since={TODAY.isoformat()} 00:00",
                                "--format=%ct|%s"], capture_output=True, text=True, timeout=15)
        except subprocess.TimeoutExpired:
            continue
        for line in r.stdout.splitlines():
            ts, _, subj = line.partition("|")
            out.append({"t": hm(int(ts)), "repo": v["name"], "subject": subj[:90], "auto": bool(AUTO_RE.match(subj))})
    return sorted(out, key=lambda c: c["t"])


# ── 7. память, папки, места ────────────────────────────────────────────────
def memory() -> dict:
    d = P(CFG.get("memory_dir"))
    types = Counter()
    if d and d.exists():
        for f in d.glob("*.md"):
            if f.name != "MEMORY.md":
                head = read(f)[:700]
                m = re.search(r"^\s+type:\s*(\w+)", head, re.M) or re.search(r"^type:\s*(\w+)", head, re.M)
                types[m.group(1) if m else "?"] += 1
    return dict(types.most_common())


def count_md(root: Path) -> int:
    try:
        r = subprocess.run(["find", str(root), "-name", "*.md", "-not", "-path", "*/.git/*",
                            "-not", "-path", "*/node_modules/*", "-not", "-path", "*/.trash/*"],
                           capture_output=True, text=True, timeout=25)
        return r.stdout.count("\n")
    except subprocess.TimeoutExpired:
        return -1


def roots() -> list[dict]:
    out = []
    for r in CFG.get("roots", []):
        root = P(r["path"])
        if not root or not root.exists():
            continue
        subs = sorted(x for x in root.iterdir() if x.is_dir() and not x.name.startswith("."))
        if r.get("count") == "projects":
            parts = []
            for b in subs:
                try:
                    n = sum(1 for x in b.iterdir() if x.is_dir())
                except OSError:
                    continue
                if n:
                    parts.append([b.name + "/", n, "проектов"])
        else:
            parts = [[b.name + "/", count_md(b), "md"] for b in subs]
        parts = sorted([p for p in parts if p[1] > 0], key=lambda p: -p[1])[:7]
        out.append({"root": tilde(root), "role": r.get("role", ""),
                    "parts": [[a, f"{n} {u}"] for a, n, u in parts]})
    return out


def places() -> list[dict]:
    pl = CFG.get("places", [])
    if not pl:
        return []
    live = Counter()
    try:
        r = subprocess.run(["orca", "terminal", "list"], capture_output=True, text=True, timeout=8)
        for line in r.stdout.splitlines():
            m = re.match(r"term_\S+\s+.*?\s+connected\s+host=(\S+)\s+(\S+)", line)
            if m:
                live[tilde(m.group(2))] += 1
    except (OSError, subprocess.TimeoutExpired):
        pass
    return [{**p, "live": live.get(p["path"], 0)} for p in pl]


def main() -> None:
    claude_dir = P(CFG.get("claude_dir", "~/.claude"))
    codex_dir = P(CFG.get("codex_dir", "~/.codex"))
    always = always_loaded()
    sk = skills()
    cl = claude_sessions(claude_dir)
    cx = codex_sessions(codex_dir)
    vf = vault_files()
    try:
        mcp = sorted(json.loads(read(HOME / ".claude.json") or "{}").get("mcpServers", {}).keys())
    except json.JSONDecodeError:
        mcp = []
    data = {
        "owner": CFG.get("owner", ""), "generated": NOW.strftime("%Y-%m-%d %H:%M"), "now": NOW.strftime("%H:%M"),
        "mode": "show" if SHOW else "full", "compact_window": CFG.get("compact_window", 400_000),
        "always": always, "sections": rule_sections((CFG.get("always") or [{}])[0].get("path")),
        "hooks": hooks(claude_dir), "skills": sk,
        "sessions": cl["sessions"] + cx["sessions"],
        "runs": {"claude": cl["runs"], "codex": cx["runs"]},
        "routes": {**cl["routes"], "codex_read": sum(n for _, n in cx["runs"])},
        "hum": cl["hum"], "agt": [a + b for a, b in zip(cl["agt"], cx["agt"])],
        "telegram": telegram(), "vault": vf, "commits": commits(),
        "memory": memory(), "roots": roots(), "places": places(),
        "lanes": CFG.get("lanes", []), "servers": CFG.get("servers", []), "mcp": mcp,
        "links": CFG.get("links", {}),
    }
    data["budget"] = {"always": sum(a["tokens"] for a in always), "skill_headers": sk["header_tokens"],
                      "window": data["compact_window"]}
    if SHOW:
        # показ: личное вырезается здесь, до страницы. остаются числа, время и типы
        for s in data["sessions"]:
            s["title"] = s["project"] = ""
        for m in data["telegram"]:
            m["text"] = ""
        for f in data["vault"]["files"]:
            f["name"] = ""
        for c in data["commits"]:
            c["subject"] = c["subject"].split(":")[0] if c["auto"] else ""
        public = set(CFG.get("public_skill_sources", []))
        for x in data["skills"]["all"]:
            x["d"] = ""
            if x["s"] not in public:
                x["n"] = "личный skill"
        for x in data["skills"]["recent"]:
            if x["s"] not in public:
                x["n"] = "личный skill"
    out = HERE / ("data-show.json" if SHOW else "data.json")
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print(f"{out.name}: skills {sk['total']} · сессий {len(cl['sessions'])}+{len(cx['sessions'])} · "
          f"telegram {len(data['telegram'])} · файлов сегодня {vf['created']} новых, {vf['modified']} правок · "
          f"коммитов {len(data['commits'])} · до первого слова ≈{data['budget']['always'] + sk['header_tokens']}")


if __name__ == "__main__":
    main()
