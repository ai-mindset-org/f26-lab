#!/usr/bin/env python3
"""эстафета skills · стол тройки: что делать сейчас, проверка палочки, запись этапов, страница

  python3 table.py next   <стол> <ник>                      что делать сейчас
  python3 table.py lint   <SKILL.md>                        факты о тексте: стоп и глянь
  python3 table.py start  <стол> <ник> --skill F --card F   поставить skill на старт
  python3 table.py ring   <стол> [--legs 1]                 закрыть круг; --legs 1 – короткий круг в один этап
  python3 table.py take   <стол> <ник>                      палочка этого этапа и записка
  python3 table.py pass   <стол> <ник> --skill F --leg F    передать палочку дальше
  python3 table.py skip   <стол> <ник дорожки>              не ждать бегуна: этап без правки
  python3 table.py finish <стол> <ник> --verdict F          принять правки на финише
  python3 table.py pack   <стол> <ник дорожки> --out F      дорожка одним файлом: для чата без git
  python3 table.py unpack <стол> --bundle F                 принять дорожку из такого файла
  python3 table.py state  <стол> [--json]                   дорожки и счёт
  python3 table.py serve  <стол> [--port N]                 страница эстафеты на этом компьютере
                                 --lan                      по сети только просмотр
                                 --share                    общий стол тройки: запись по ссылке с ключом

Общие ключи: --round r1 · --git (pull перед чтением, commit и push после записи).
Только стандартная библиотека. Текст skills скрипт читает как данные и никогда не исполняет.
"""
import argparse
import datetime
import difflib
import hashlib
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
NICK = re.compile(r"^[a-z][a-z0-9-]{1,23}$")
ROUND = re.compile(r"^r[1-9][0-9]?$")
SKILL_NAME = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
MAX_LINES, MAX_CHARS, MAX_CHANGED, MAX_INPUT_LINES, DEFAULT_LEGS = 60, 6000, 8, 10, 2
KIT = {"call-digest": HERE.parent.parent / "w2" / "example" / "skills" / "call-digest" / "SKILL.md"}


class Refuse(Exception):
    """пайплайн отказал: причина человеку"""


# ---------- проверка текста: факты, решение за человеком ----------

STOP = [
    ("почта", r"[\w.+-]+@[\w-]+\.[A-Za-z]{2,}"),
    ("путь с именем пользователя", r"(?:/Users/|/home/|[A-Za-z]:\\Users\\)[^\s/\\`\"']+"),
    ("ключ или токен", r"sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_\w{20,}|xox[abprs]-[\w-]{10,}"
                       r"|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]+-----|Bearer\s+[\w.~+/-]{16,}"),
    ("секрет в строке", r"(?i)\b(?:api[_-]?key|token|secret|password|passwd|пароль|токен)\b\s*[:=]\s*\S{6,}"),
    ("секрет в ссылке", r"(?i)[?&](?:token|key|secret|sig|signature|access_token)=[^\s&]+"),
    ("скрытый комментарий", r"<!--"),
    ("закодированный блок", r"[A-Za-z0-9+/=]{80,}"),
    ("команда в обход человека", r"(?i)ignore (?:all |any )?(?:previous|prior|above)|disregard (?:all|previous|the above)"
                                 r"|do not (?:tell|mention|inform|reveal)|don'?t (?:tell|mention)"
                                 r"|не (?:говори|сообщай|упоминай|показывай)\s+(?:об этом\s+)?(?:пользовател|человек|владельц)"
                                 r"|забудь (?:все |предыдущие )?(?:инструкции|правила)|system prompt|системн\w+ промпт"),
    ("опасная команда", r"(?i)(?:curl|wget)[^\n|]*\|\s*(?:ba|z)?sh|\brm\s+-\w*[rf]\w*\s|base64\s+(?:-d|--decode)"
                        r"|chmod\s+777|\bmkfs\b|\bdd\s+if=|/dev/tcp/"),
]
LOOK = [  # (факт, шаблон, пропускать ли строки-запреты)
    ("сеть", r"(?i)https?://|\b(?:curl|wget|fetch|webhook|urllib|requests\.)\b", False),
    ("команды оболочки", r"(?i)```(?:bash|sh|zsh|shell)|\b(?:bash|zsh|subprocess|os\.system|sh -c)\b|^\s*\$ ", False),
    ("удаление", r"(?i)\b(?:удал[иья]\w*|сотри\w*|очист\w*|delete\w*|remove\w*)", True),
    ("отправка наружу", r"(?i)\b(?:отправ\w*|разошл\w*|опубликуй\w*|запост\w*|send\w*|publish\w*|email\w*)", True),
    ("установка программ", r"(?i)\b(?:pip3?|npm|npx|brew|apt|uv)\s+(?:install|add|i)\b|\bустанов\w*", True),
    ("чтение шире входа", r"(?i)~/|\.env\b|\.ssh|keychain|домашн\w+ папк\w+|все файлы|всю папку|home directory|all files", True),
    ("память и правила агента", r"(?i)AGENTS\.md|CLAUDE\.md|MEMORY\.md|SOUL\.md|settings(?:\.local)?\.json"
                                r"|\.claude/|\.codex/|\.agents/|память агента", True),
    ("доступ к сервису", r"(?i)mcp__|\bMCP\b|allowed-tools|календар\w*|\bпочт[аеуыой]\w*|gmail|calendar|notion|telegram", True),
    ("деньги", r"(?i)оплат\w*|плат[её]ж\w*|\bкупи\w*|\bpay\w*|purchase|wallet|кошел\w*", True),
    ("без подтверждения", r"(?i)без подтверждени\w*|не спрашива\w*|without (?:asking|confirmation)|тайно|скрытно|secretly|silently", False),
]
STOP = [(n, re.compile(p)) for n, p in STOP]
LOOK = [(n, re.compile(p), skip) for n, p, skip in LOOK]
PHONE = re.compile(r"(?<![\w.])\+?\d[\d\s()\-]{8,}\d(?!\w)")
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}")
HANDLE = re.compile(r"(?<![\w.+-])@[A-Za-z][A-Za-z0-9_]{3,}")
NEGATION = re.compile(r"(?i)^(?:[-*\d.)\s]*)(?:не |никогда|ничего не|never|do not|don'?t|без )")
NOT_A_BAN = re.compile(r"(?i)не (?:забудь|забывай|бойся|стесняйся|жди|медли|откладывай)|don'?t (?:forget|hesitate|wait)")
BROAD = re.compile(r"(?i)\balways\b|\bвсегда\b|any request|любо\w+ запрос\w*|for everything|на всё")
FM_ALLOWED = {"name", "description"}


def cut(s, n=48):
    s = " ".join(s.split())
    return s if len(s) <= n else s[: n - 1] + "…"


def norm(text):
    return text.replace("\r\n", "\n").replace("\r", "\n")


def digest(text):
    return hashlib.sha256(norm(text).encode("utf-8")).hexdigest()[:12]


def frontmatter(text):
    """поля шапки между первыми двумя строками ---; None, если шапки нет"""
    lines = norm(text).split("\n")
    if not lines or lines[0].strip() != "---":
        return None
    fields = {}
    for line in lines[1:]:
        if line.strip() == "---":
            return fields
        m = re.match(r"^([A-Za-z_-]+)\s*:\s*(.*)$", line)
        if m:
            fields[m.group(1)] = m.group(2).strip()
    return None


def facts(text, skill=True):
    """список находок: level стоп|глянь, line, rule, excerpt"""
    out = []
    add = lambda level, n, rule, ex="": out.append({"level": level, "line": n, "rule": rule, "excerpt": cut(ex, 60)})
    text = norm(text)
    lines = text.split("\n")
    if skill:
        if len(lines) > MAX_LINES:
            add("стоп", 0, f"{len(lines)} строк, палочка до {MAX_LINES}: сократи до ядра")
        if len(text) > MAX_CHARS:
            add("стоп", 0, f"{len(text)} знаков, палочка до {MAX_CHARS}")
        fm = frontmatter(text)
        if fm is None:
            add("стоп", 1, "нет шапки: первые строки --- name, description ---")
        else:
            if not SKILL_NAME.match(fm.get("name", "")):
                add("стоп", 1, "name в шапке: латиница, цифры и дефис", fm.get("name", ""))
            if not fm.get("description"):
                add("стоп", 1, "нет description: что делает и когда брать")
            elif BROAD.search(fm["description"]):
                add("глянь", 1, "срабатывает на всё", fm["description"])
            for key in fm:
                if key not in FM_ALLOWED:
                    add("глянь", 1, f"лишнее поле в шапке: {key}")
    for n, line in enumerate(lines, 1):
        for ch in line:
            cat = unicodedata.category(ch)
            if cat in ("Cf", "Co") or (cat == "Cc" and ch != "\t"):
                add("стоп", n, f"невидимый символ U+{ord(ch):04X}: человек его не видит, модель читает", line)
                break
        for name, rx in STOP:
            m = rx.search(line)
            if m:
                add("стоп", n, name, m.group(0) if name not in ("ключ или токен", "секрет в строке") else m.group(0)[:10] + "…")
        for m in PHONE.finditer(line):
            if sum(c.isdigit() for c in m.group(0)) >= 10 and not ISO_DATE.match(m.group(0)):
                add("стоп", n, "похоже на телефон", m.group(0))
        if HANDLE.search(line):
            add("глянь", n, "ник в мессенджере", HANDLE.search(line).group(0))
        forbids = bool(NEGATION.match(line)) and not NOT_A_BAN.search(line)
        seen = set()
        for name, rx, skip in LOOK:
            if skip and forbids:
                continue
            if rx.search(line):
                seen.add(name)
                add("глянь", n, name, line)
        if "без подтверждения" in seen and seen & {"удаление", "отправка наружу", "установка программ", "деньги"}:
            add("стоп", n, "действие без подтверждения человека", line)
    return out


def stops(found):
    return [f for f in found if f["level"] == "стоп"]


def explain(found):
    rows = []
    for f in found:
        where = f"строка {f['line']}" if f["line"] else "файл"
        rows.append(f"  {f['level']:<5}  {where:<10} {f['rule']}" + (f": «{f['excerpt']}»" if f["excerpt"] else ""))
    return "\n".join(rows)


def changed_lines(old, new):
    """(убрано, добавлено, строки диффа) между двумя версиями палочки"""
    rows = []
    for line in difflib.unified_diff(norm(old).split("\n"), norm(new).split("\n"), lineterm="", n=0):
        if line.startswith(("+++", "---", "@@")):
            continue
        rows.append({"op": line[0], "t": line[1:]})
    minus = sum(1 for r in rows if r["op"] == "-")
    plus = sum(1 for r in rows if r["op"] == "+")
    return minus, plus, rows


# ---------- стол на диске ----------

def safe(root, *parts):
    """путь внутри стола; отказ, если он выходит наружу"""
    root = Path(root).resolve()
    path = root.joinpath(*parts).resolve()
    if path != root and root not in path.parents:
        raise Refuse("путь выходит за пределы стола")
    return path


def need_nick(nick):
    if not NICK.match(nick or ""):
        raise Refuse("ник: латиница в нижнем регистре, цифры и дефис, от 2 до 24 знаков, первая буква")
    return nick


def need_round(rnd):
    if not ROUND.match(rnd or ""):
        raise Refuse("раунд пишется как r1, r2…")
    return rnd


def today():
    return datetime.date.today().isoformat()


KEYS = {"палочка", "источник", "получил", "отдал", "изменено строк", "правка", "вход", "результат", "проверка",
        "о владельце", "записка", "узнал себя", "пропуск"}


def parse_blocks(text):
    """поля «ключ: значение» из известного списка; остальные строки продолжают значение прошлого ключа"""
    out, key = {}, None
    for raw in norm(text).split("\n"):
        line = raw[2:] if raw.startswith("- ") else raw
        m = re.match(r"^([а-яё ]{3,20}|этап \d+):\s*(.*)$", line)
        if m and not raw.startswith("  ") and (m.group(1) in KEYS or m.group(1).startswith("этап ")):
            key = m.group(1)
            out[key] = m.group(2).strip()
        elif key and raw.strip():
            out[key] = (out[key] + "\n" + raw.strip()).strip()
    return out


def parse_verdicts(text):
    """строки «ник: принял · почему · узнал себя да»"""
    out = {}
    for line in norm(text).split("\n"):
        m = re.match(r"^\s*(?:- )?([a-z][a-z0-9-]{1,23}):\s*(.+)$", line)
        if m:
            parts = [p.strip() for p in m.group(2).split(" · ")]
            out[m.group(1)] = {"accept": parts[0] == "принял", "why": parts[1] if len(parts) > 1 else ""}
            if len(parts) > 2:
                out[m.group(1)]["me"] = parts[2].endswith("да")
    return out


def parse_relay(text):
    """протокол дорожки: старт, этапы, финиш"""
    relay = {"start": None, "legs": [], "finish": None}
    head, body = None, []

    def flush():
        if not head:
            return
        fields = parse_blocks("\n".join(body))
        parts = [p.strip() for p in head.split(" · ")]
        entry = {"by": parts[1] if len(parts) > 1 else "", "date": parts[2] if len(parts) > 2 else "", **fields}
        if parts[0] == "старт":
            relay["start"] = entry
        elif parts[0] == "финиш":
            relay["finish"] = entry
        elif parts[0].startswith("этап"):
            relay["legs"].append(entry)

    for line in norm(text).split("\n"):
        if line.startswith("## "):
            flush()
            head, body = line[3:].strip(), []
        elif head is not None:
            body.append(line)
    flush()
    return relay


def parse_card(text):
    fm = frontmatter(text) or {}
    card = {"agent": fm.get("agent", ""), "total": fm.get("skills_total", ""), "skills": [], "rule": "", "question": "",
            "input": "", "sign": ""}
    sec = ""
    for line in norm(text).split("\n"):
        if line.startswith("## "):
            sec = line[3:].strip().lower()
            continue
        s = line.strip()
        if not s:
            continue
        if sec.startswith("skills") and s.startswith("- "):
            card["skills"].append(s[2:])
        elif sec.startswith("на старт") and s.startswith("- вход:"):
            card["input"] = s.split(":", 1)[1].strip()
        elif sec.startswith("на старт") and s.startswith("- признак:"):
            card["sign"] = s.split(":", 1)[1].strip()
        elif sec.startswith("правило"):
            card["rule"] = (card["rule"] + " " + s).strip()
        elif sec.startswith("вопрос"):
            card["question"] = (card["question"] + " " + s).strip()
    return card


def read_ring(rdir):
    f = rdir / "RING.md"
    if not f.exists():
        return None
    text = f.read_text(encoding="utf-8")
    m = re.search(r"^круг:\s*(.+)$", text, re.M)
    order = [p.strip() for p in re.split(r"→|->", m.group(1))] if m else []
    order = [p for p in order if NICK.match(p)]
    m2 = re.search(r"^этапов:\s*(\d+)", text, re.M)
    return {"order": order, "legs": int(m2.group(1)) if m2 else DEFAULT_LEGS}


_names = {}


def table_name(table):
    key = str(table)
    if key not in _names:
        url = git(table, "remote", "get-url", "origin", check=False).stdout.strip() if (Path(table) / ".git").exists() else ""
        _names[key] = re.sub(r"\.git$", "", url.rstrip("/").split("/")[-1]) if url else Path(table).name
    return _names[key]


def load(table, rnd="r1"):
    """состояние раунда: дорожки, круг, у кого какая палочка, что делать каждому"""
    table = Path(table).resolve()
    rdir = safe(table, need_round(rnd))
    lanes = {}
    if rdir.is_dir():
        for d in sorted(rdir.iterdir()):
            if not d.is_dir() or not NICK.match(d.name) or not (d / "SKILL.md").exists():
                continue
            skill = (d / "SKILL.md").read_text(encoding="utf-8")
            relay = parse_relay((d / "RELAY.md").read_text(encoding="utf-8")) if (d / "RELAY.md").exists() else \
                {"start": None, "legs": [], "finish": None}
            versions = []
            for n in range(0, 20):
                snap = d / "legs" / f"{n}.md"
                if not snap.exists():
                    break
                versions.append(snap.read_text(encoding="utf-8"))
            if not versions:
                versions = [skill]
            fm = frontmatter(versions[0]) or {}
            chain = digest(versions[-1]) == digest(skill)
            for k, leg in enumerate(relay["legs"], 1):
                if k >= len(versions) or leg.get("получил") != digest(versions[k - 1]) or leg.get("отдал") != digest(versions[k]):
                    chain = False
            if relay["start"] and relay["start"].get("палочка") != digest(versions[0]):
                chain = False
            card = parse_card((d / "card.md").read_text(encoding="utf-8")) if (d / "card.md").exists() else parse_card("")
            lanes[d.name] = {"owner": d.name, "skill": fm.get("name", "skill"), "card": card, "versions": versions,
                             "current": skill, "relay": relay, "chainOk": chain, "extra": extra_files(d)}
    ring = read_ring(rdir) if rdir.is_dir() else None
    order = [p for p in (ring["order"] if ring else sorted(lanes)) if p in lanes]
    n = len(order)
    legs_total = max(0, min(ring["legs"] if ring else DEFAULT_LEGS, n - 1))
    for owner, lane in lanes.items():
        idx = order.index(owner) if owner in order else -1
        lane["holders"] = [order[(idx + k) % n] for k in range(1, legs_total + 1)] if idx >= 0 else []
        done = len(lane["relay"]["legs"])
        if not ring:
            lane["status"], lane["next"] = "старт", None
        elif idx < 0:
            lane["status"], lane["next"] = "вне круга", None
        elif lane["relay"]["finish"]:
            lane["status"], lane["next"] = "дома", None
        elif done < legs_total:
            lane["status"], lane["next"] = "в пути", {"leg": done + 1, "by": lane["holders"][done]}
        else:
            lane["status"], lane["next"] = "финиш", {"leg": 0, "by": owner}
    players = {}
    for p in sorted(set(order) | set(lanes)):
        todo = sorted((l["next"]["leg"], o) for o, l in lanes.items()
                      if l["next"] and l["next"]["by"] == p and l["next"]["leg"] > 0)
        if p not in lanes:
            act = {"action": "старт"}
        elif not ring:
            act = {"action": "круг", "cards": sorted(lanes)}
        elif p not in order:
            act = {"action": "опоздал"}
        elif todo:
            act = {"action": "этап", "leg": todo[0][0], "lane": todo[0][1]}
        elif lanes[p]["status"] == "финиш":
            act = {"action": "финиш", "lane": p}
        elif all(l["status"] == "дома" for o, l in lanes.items() if o in order):
            act = {"action": "круг замкнут"}
        else:
            waits = sorted({l["next"]["by"] for o, l in lanes.items() if l["next"] and o in order} - {p})
            act = {"action": "жди", "who": waits}
        players[p] = act
    decided = accepted = 0
    for lane in lanes.values():
        fin = lane["relay"]["finish"] or {}
        for key, val in fin.items():
            if key.startswith("этап"):
                parts = [p.strip() for p in val.split(" · ")]
                decided += 1
                accepted += 1 if len(parts) > 1 and parts[1] == "принял" else 0
    score = {"lanes": len(order), "home": sum(1 for o in order if lanes[o]["status"] == "дома"),
             "legs": sum(len(lanes[o]["relay"]["legs"]) for o in order), "legsTotal": legs_total * n,
             "accepted": accepted, "decided": decided}
    return {"table": table_name(table), "round": rnd, "ringClosed": bool(ring), "ring": order, "legsTotal": legs_total,
            "lanes": lanes, "players": players, "score": score}


def extra_files(lane_dir):
    """всё в дорожке, чего там быть не должно: скрипты, вложения, скрытые файлы"""
    allowed = {"card.md", "SKILL.md", "RELAY.md"}
    bad = []
    for f in sorted(lane_dir.rglob("*")):
        rel = f.relative_to(lane_dir).as_posix()
        if f.is_dir():
            if rel != "legs":
                bad.append(rel + "/")
        elif rel in allowed or re.fullmatch(r"legs/\d+\.md", rel):
            continue
        else:
            bad.append(rel)
    return bad


# ---------- git ----------

def git(table, *args, check=True):
    r = subprocess.run(["git", "-C", str(table), *args], capture_output=True, text=True)
    if check and r.returncode != 0:
        raise Refuse(f"git {' '.join(args[:2])}: {cut(r.stderr or r.stdout, 200)}")
    return r


def pull(table):
    if git(table, "remote", check=False).stdout.strip():
        git(table, "pull", "--rebase", "--quiet")


def push(table, paths, message):
    git(table, "add", "--", *paths)
    if git(table, "diff", "--cached", "--quiet", check=False).returncode == 0:
        return "нечего отправлять"
    git(table, "commit", "--quiet", "-m", message)
    if not git(table, "remote", check=False).stdout.strip():
        return "записано локально: у стола нет удалённого репозитория"
    for attempt in range(1, 4):
        if git(table, "push", "--quiet", check=False).returncode == 0:
            return f"отправлено с попытки {attempt}"
        git(table, "pull", "--rebase", "--quiet")
    raise Refuse("push отклонён три раза подряд: позови человека")


# ---------- ходы ----------

def trail(table, rnd, who, what):
    f = safe(table, "TRAIL.md")
    head = "" if f.exists() else "# след тройки\n\nдата · раунд · ник · что произошло. Строки только дописываются в конец.\n\n"
    with f.open("a", encoding="utf-8") as fh:
        fh.write(f"{head}{today()} · {rnd} · {who} · {what}\n")


def one_line(s, n=140):
    return cut(str(s or "").replace("·", ","), n)


def do_start(table, rnd, nick, skill_text, card_text, source="свой skill"):
    need_nick(nick)
    st = load(table, rnd)
    if st["ringClosed"]:
        raise Refuse("круг уже закрыт: дождись следующего раунда или сыграй с примером")
    if nick in st["lanes"]:
        raise Refuse(f"дорожка {nick} уже стоит на старте: второй игрок с этим ником добавляет цифру")
    skill_text, card_text = norm(skill_text).strip() + "\n", norm(card_text).strip() + "\n"
    found = facts(skill_text) + [dict(f, rule="карточка: " + f["rule"]) for f in stops(facts(card_text, skill=False))]
    if stops(found):
        raise Refuse("палочка не прошла проверку:\n" + explain(stops(found)))
    if len(parse_card(card_text)["skills"]) > 7:
        raise Refuse("в карточке до семи skills")
    lane = safe(table, rnd, nick)
    (lane / "legs").mkdir(parents=True, exist_ok=True)
    name = (frontmatter(skill_text) or {}).get("name", "skill")
    (lane / "SKILL.md").write_text(skill_text, encoding="utf-8")
    (lane / "legs" / "0.md").write_text(skill_text, encoding="utf-8")
    (lane / "card.md").write_text(card_text, encoding="utf-8")
    (lane / "RELAY.md").write_text(
        f"# дорожка · {nick} · {name}\n\n## старт · {nick} · {today()}\n- палочка: {digest(skill_text)}\n- источник: {one_line(source, 60)}\n",
        encoding="utf-8")
    trail(table, rnd, nick, f"старт · {name} · {one_line(source, 60)}")
    return {"lane": nick, "skill": name, "hash": digest(skill_text), "look": [f for f in found if f["level"] == "глянь"],
            "paths": [f"{rnd}/{nick}", "TRAIL.md"], "message": f"{rnd} · {nick} · старт · {name}"}


def do_ring(table, rnd, legs=None):
    st = load(table, rnd)
    if st["ringClosed"]:
        raise Refuse("круг уже закрыт: " + " → ".join(st["ring"]))
    order = sorted(st["lanes"])
    if len(order) < 2:
        raise Refuse("для круга нужны хотя бы две дорожки на старте")
    try:
        legs = max(1, min(int(legs or DEFAULT_LEGS), len(order) - 1))
    except (TypeError, ValueError):
        raise Refuse("число этапов: 1 для короткого круга, 2 для полного")
    safe(table, rnd, "RING.md").write_text(
        f"# круг · {rnd}\n\nкруг: {' → '.join(order)}\nэтапов: {legs}\nзакрыт: {today()}\n", encoding="utf-8")
    return {"ring": order, "legs": legs, "paths": [f"{rnd}/RING.md"], "message": f"{rnd} · круг закрыт · {' → '.join(order)}"}


def do_take(table, rnd, nick):
    need_nick(nick)
    st = load(table, rnd)
    act = st["players"].get(nick, {"action": "старт"})
    if act["action"] != "этап":
        raise Refuse("сейчас палочки для тебя нет: " + say_next(st, nick))
    lane = st["lanes"][act["lane"]]
    if not lane["chainOk"]:
        raise Refuse(f"палочку {act['lane']} меняли вне эстафеты: хэши не сходятся. Позови владельца")
    prev = lane["relay"]["legs"][-1] if lane["relay"]["legs"] else None
    return {"lane": act["lane"], "leg": act["leg"], "legsTotal": st["legsTotal"], "skill": lane["skill"],
            "text": lane["current"], "hash": digest(lane["current"]), "card": lane["card"],
            "note": (prev or {}).get("записка", ""), "prev": prev, "facts": facts(lane["current"]),
            "path": f"{rnd}/{act['lane']}/SKILL.md"}


def do_check(table, rnd, nick, skill_text, fields=None):
    """всё, что пайплайн скажет о передаче, без записи"""
    take = do_take(table, rnd, nick)
    skill_text = norm(skill_text).strip() + "\n"
    minus, plus, rows = changed_lines(take["text"], skill_text)
    found = facts(skill_text)
    was = (frontmatter(take["text"]) or {}).get("name")
    now = (frontmatter(skill_text) or {}).get("name")
    if was != now:
        found.append({"level": "стоп", "line": 1, "rule": f"имя палочки меняет только владелец: было {was}", "excerpt": str(now)})
    if minus + plus > MAX_CHANGED:
        found.append({"level": "стоп", "line": 0, "excerpt": "",
                      "rule": f"изменено {minus + plus} строк, этап – одна правка до {MAX_CHANGED} строк"})
    fields = fields or {}
    for key in ("правка", "вход", "результат"):
        if not str(fields.get(key, "")).strip():
            found.append({"level": "стоп", "line": 0, "rule": f"не заполнено поле «{key}»", "excerpt": ""})
    if len([l for l in str(fields.get("вход", "")).split("\n") if l.strip()]) > MAX_INPUT_LINES:
        found.append({"level": "стоп", "line": 0, "rule": f"вход длиннее {MAX_INPUT_LINES} строк", "excerpt": ""})
    for key, val in fields.items():
        for f in stops(facts(str(val), skill=False)):
            found.append(dict(f, rule=f"поле «{key}»: {f['rule']}"))
    return {**take, "new": skill_text, "newHash": digest(skill_text), "minus": minus, "plus": plus, "diff": rows,
            "facts": found, "ok": not stops(found)}


def do_pass(table, rnd, nick, skill_text, fields):
    chk = do_check(table, rnd, nick, skill_text, fields)
    if not chk["ok"]:
        raise Refuse("палочка не передана:\n" + explain(stops(chk["facts"])))
    lane = safe(table, rnd, chk["lane"])
    k = chk["leg"]
    (lane / "legs" / f"{k}.md").write_text(chk["new"], encoding="utf-8")
    (lane / "SKILL.md").write_text(chk["new"], encoding="utf-8")
    block = [f"\n## этап {k} · {nick} · {today()}", f"- получил: {chk['hash']}", f"- отдал: {chk['newHash']}",
             f"- изменено строк: {chk['minus'] + chk['plus']}", f"- правка: {one_line(fields['правка'], 200)}"]
    for key in ("вход", "результат"):
        block.append(f"- {key}:")
        block += ["  " + l.strip() for l in norm(str(fields[key])).split("\n") if l.strip()]
    for key in ("проверка", "о владельце", "записка"):
        if str(fields.get(key, "")).strip():
            block.append(f"- {key}: {one_line(fields[key], 240)}")
    with (lane / "RELAY.md").open("a", encoding="utf-8") as fh:
        fh.write("\n".join(block) + "\n")
    trail(table, rnd, nick, f"этап {k} · взял {chk['skill']} у {chk['lane']} · поменял: {one_line(fields['правка'])}"
          + (f" · записка: {one_line(fields['записка'])}" if str(fields.get("записка", "")).strip() else ""))
    return {"lane": chk["lane"], "leg": k, "hash": chk["newHash"], "changed": chk["minus"] + chk["plus"],
            "look": [f for f in chk["facts"] if f["level"] == "глянь"],
            "paths": [f"{rnd}/{chk['lane']}", "TRAIL.md"], "message": f"{rnd} · {nick} · этап {k} · {chk['skill']} от {chk['lane']}"}


def do_skip(table, rnd, owner):
    """тройка решила не ждать бегуна: этап записан без правки, палочка идёт дальше"""
    need_nick(owner)
    st = load(table, rnd)
    lane = st["lanes"].get(owner)
    if not lane or not lane["next"] or lane["next"]["leg"] == 0:
        raise Refuse(f"на дорожке {owner} сейчас нет этапа, который можно пропустить")
    k, runner, h = lane["next"]["leg"], lane["next"]["by"], digest(lane["current"])
    d = safe(table, rnd, owner)
    (d / "legs" / f"{k}.md").write_text(lane["current"], encoding="utf-8")
    with (d / "RELAY.md").open("a", encoding="utf-8") as fh:
        fh.write(f"\n## этап {k} · {runner} · {today()}\n- получил: {h}\n- отдал: {h}\n- изменено строк: 0\n"
                 f"- правка: этап пропущен\n- пропуск: да\n")
    trail(table, rnd, runner, f"этап {k} · {lane['skill']} от {owner} · не дождались, палочка идёт дальше")
    return {"lane": owner, "leg": k, "runner": runner, "paths": [f"{rnd}/{owner}", "TRAIL.md"],
            "message": f"{rnd} · {runner} · этап {k} пропущен · {lane['skill']} от {owner}"}


BUNDLE_HEAD = re.compile(r"^== (r[1-9][0-9]?/(?:RING\.md|[a-z][a-z0-9-]{1,23}/(?:card\.md|SKILL\.md|RELAY\.md|legs/\d{1,2}\.md))) ==$")
BUNDLE_MAX = 60000


def do_pack(table, rnd, owner):
    """дорожка одним текстовым файлом: для чата и любого места, где нет git"""
    need_nick(owner)
    st = load(table, rnd)
    lane = st["lanes"].get(owner)
    if not lane:
        raise Refuse(f"на столе нет дорожки {owner}")
    if not lane["chainOk"]:
        raise Refuse(f"дорожку {owner} меняли вне эстафеты: хэши не сходятся, такую связку не примут")
    d = safe(table, rnd, owner)
    names = ["card.md", "SKILL.md", "RELAY.md"] + [f"legs/{n}.md" for n in range(len(lane["versions"]))]
    paths = [(f"{rnd}/{owner}/{n}", d / n) for n in names if (d / n).exists()]
    if safe(table, rnd, "RING.md").exists():
        paths.append((f"{rnd}/RING.md", safe(table, rnd, "RING.md")))
    out = [f"== эстафета skills · {rnd} · дорожка {owner} · {lane['skill']} · {digest(lane['current'])} =="]
    for rel, f in paths:
        text = norm(f.read_text(encoding="utf-8")).strip("\n")
        if any(BUNDLE_HEAD.match(l) or l.strip() == "== конец ==" for l in text.split("\n")):
            raise Refuse(f"в файле {rel} есть строка, похожая на заголовок связки: убери её")
        out += [f"== {rel} ==", text]
    return {"lane": owner, "name": f"{rnd}-{owner}.trio.md", "text": "\n".join(out + ["== конец =="]) + "\n"}


def do_unpack(table, rnd, text):
    """принять дорожку из файла: только одна дорожка, только вперёд, хэши и проверка текста на месте"""
    text = norm(text)
    if len(text) > BUNDLE_MAX:
        raise Refuse("связка больше 60 КБ: это не дорожка эстафеты")
    files, cur = {}, None
    for line in text.split("\n"):
        m = BUNDLE_HEAD.match(line)
        if m:
            cur = m.group(1)
            if cur in files:
                raise Refuse(f"файл {cur} встречается в связке дважды")
            files[cur] = []
        elif line.strip() == "== конец ==":
            cur = None
        elif cur:
            files[cur].append(line)
    files = {k: "\n".join(v).strip("\n") + "\n" for k, v in files.items()}
    lanes = {k.split("/")[1] for k in files if not k.endswith("/RING.md")}
    if {k.split("/")[0] for k in files} - {rnd}:
        raise Refuse(f"связка другого раунда: на столе {rnd}")
    if len(lanes) != 1:
        raise Refuse("в связке должна быть ровно одна дорожка")
    owner = lanes.pop()
    base = f"{rnd}/{owner}/"
    versions = []
    while f"{base}legs/{len(versions)}.md" in files:
        versions.append(files[f"{base}legs/{len(versions)}.md"])
    if not versions or base + "SKILL.md" not in files or base + "RELAY.md" not in files:
        raise Refuse("в связке не хватает файлов дорожки: SKILL.md, RELAY.md, legs/0.md")
    if len([k for k in files if k.startswith(base + "legs/")]) != len(versions):
        raise Refuse("версии палочки в связке идут с пропуском")
    for rel, body in files.items():
        bad = stops(facts(body, skill=rel.endswith("SKILL.md") or "/legs/" in rel))
        if bad:
            raise Refuse(f"{rel} не прошёл проверку:\n" + explain(bad))
    relay = parse_relay(files[base + "RELAY.md"])
    ok = bool(relay["start"]) and relay["start"].get("палочка") == digest(versions[0]) \
        and len(relay["legs"]) == len(versions) - 1 and digest(files[base + "SKILL.md"]) == digest(versions[-1])
    for k, leg in enumerate(relay["legs"], 1):
        ok = ok and leg.get("получил") == digest(versions[k - 1]) and leg.get("отдал") == digest(versions[k])
    if not ok:
        raise Refuse("цепочка хэшей в связке не сходится: палочку меняли вне эстафеты")
    st = load(table, rnd)
    local = st["lanes"].get(owner)
    if local:
        if len(local["versions"]) > len(versions) or (local["relay"]["finish"] and not relay["finish"]):
            raise Refuse(f"твоя дорожка {owner} новее, чем в связке")
        if any(digest(a) != digest(b) for a, b in zip(local["versions"], versions)):
            raise Refuse(f"связка расходится с твоей дорожкой {owner}: одна и та же версия выглядит по-разному")
    ring_rel = f"{rnd}/RING.md"
    ring_file = safe(table, rnd, "RING.md")
    if ring_rel in files and ring_file.exists():
        line = lambda t: next((l for l in norm(t).split("\n") if l.startswith("круг:")), "")
        if line(files[ring_rel]) != line(ring_file.read_text(encoding="utf-8")):
            raise Refuse("в связке другой круг: сверьте порядок ников в тройке")
    paths = [f"{rnd}/{owner}"]
    for rel, body in files.items():
        if rel == ring_rel and ring_file.exists():
            continue
        f = safe(table, *rel.split("/"))
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(body, encoding="utf-8")
        if rel == ring_rel:
            paths.append(ring_rel)
    name = (frontmatter(versions[-1]) or {}).get("name", "skill")
    had = len(local["relay"]["legs"]) if local else 0
    if not local:
        trail(table, rnd, owner, f"старт · {name} · из файла")
    for k, leg in enumerate(relay["legs"], 1):
        if k <= had:
            continue
        if leg.get("пропуск"):
            trail(table, rnd, leg["by"], f"этап {k} · {name} от {owner} · не дождались, палочка идёт дальше · из файла")
        else:
            trail(table, rnd, leg["by"], f"этап {k} · взял {name} у {owner} · поменял: {one_line(leg.get('правка'))}"
                  + (f" · записка: {one_line(leg['записка'])}" if leg.get("записка") else "") + " · из файла")
    if relay["finish"] and not (local and local["relay"]["finish"]):
        took = [v.split(" · ")[0] for k, v in relay["finish"].items() if k.startswith("этап") and v.split(" · ")[1:2] == ["принял"]]
        no = [v.split(" · ")[0] for k, v in relay["finish"].items() if k.startswith("этап") and v.split(" · ")[1:2] != ["принял"]]
        trail(table, rnd, owner, f"финиш · {name} · принял: {', '.join(took) or 'никого'} · не принял: {', '.join(no) or 'никого'} · из файла")
    return {"lane": owner, "skill": name, "versions": len(versions), "paths": paths + ["TRAIL.md"],
            "message": f"{rnd} · дорожка {owner} принята из файла · v{len(versions) - 1}"}


def do_finish(table, rnd, nick, verdicts):
    """verdicts: {ник бегуна: {"accept": bool, "why": str, "me": bool}}"""
    need_nick(nick)
    st = load(table, rnd)
    lane = st["lanes"].get(nick)
    if not lane or lane["status"] != "финиш":
        raise Refuse("твоя палочка ещё не дома: " + say_next(st, nick))
    block = [f"\n## финиш · {nick} · {today()}"]
    took, refused, me = [], [], []
    for k, leg in enumerate(lane["relay"]["legs"], 1):
        if leg.get("пропуск"):
            continue
        v = verdicts.get(leg["by"])
        if not v:
            raise Refuse(f"нет решения по правке {leg['by']}")
        why = one_line(v.get("why", ""), 160)
        for f in stops(facts(why, skill=False)):
            raise Refuse(f"решение по {leg['by']}: {f['rule']}")
        block.append(f"- этап {k}: {leg['by']} · {'принял' if v.get('accept') else 'не принял'} · {why}")
        (took if v.get("accept") else refused).append(leg["by"])
        if "me" in v:
            me.append(f"{leg['by']} – {'да' if v['me'] else 'нет'}")
    if me:
        block.append(f"- узнал себя: {' · '.join(me)}")
    with safe(table, rnd, nick, "RELAY.md").open("a", encoding="utf-8") as fh:
        fh.write("\n".join(block) + "\n")
    trail(table, rnd, nick, f"финиш · {lane['skill']} · принял: {', '.join(took) or 'никого'} · не принял: {', '.join(refused) or 'никого'}")
    return {"lane": nick, "accepted": took, "declined": refused,
            "paths": [f"{rnd}/{nick}", "TRAIL.md"], "message": f"{rnd} · {nick} · финиш · {lane['skill']}"}


def say_next(st, nick):
    act = st["players"].get(nick, {"action": "старт"})
    a = act["action"]
    if a == "старт":
        return "поставь свой skill на старт: визитка и SKILL.md"
    if a == "круг":
        return f"на старте {', '.join(act['cards'])}. Все в сборе – закройте круг: table.py ring"
    if a == "опоздал":
        return "круг закрыли без тебя: жди следующего раунда или сыграй с примером"
    if a == "этап":
        lane = st["lanes"][act["lane"]]
        return f"этап {act['leg']} из {st['legsTotal']}: у тебя палочка {lane['skill']} от {act['lane']}. Забери, поменяй одну вещь, передай дальше"
    if a == "финиш":
        return "твоя палочка дома: посмотри правки и реши, какие принять"
    if a == "круг замкнут":
        s = st["score"]
        return f"круг замкнут: дома {s['home']} из {s['lanes']}, принято правок {s['accepted']} из {s['decided']}"
    return "палочки пока у " + ", ".join(act.get("who", [])) + ": подожди и спроси снова"


def public_state(st, mode="live"):
    """состояние для страницы"""
    lanes = []
    for owner in st["ring"] + sorted(set(st["lanes"]) - set(st["ring"])):
        l = st["lanes"][owner]
        versions = []
        for n, text in enumerate(l["versions"]):
            leg = l["relay"]["legs"][n - 1] if n and n - 1 < len(l["relay"]["legs"]) else None
            v = {"n": n, "by": owner if n == 0 else (leg or {}).get("by", "?"), "hash": digest(text), "text": text}
            if n:
                v["minus"], v["plus"], v["diff"] = changed_lines(l["versions"][n - 1], text)
                v["leg"] = leg
            versions.append(v)
        found = facts(l["current"])
        lanes.append({"owner": owner, "skill": l["skill"], "card": l["card"], "versions": versions, "holders": l["holders"],
                      "status": l["status"], "next": l["next"], "finish": l["relay"]["finish"], "chainOk": l["chainOk"],
                      "extra": l["extra"], "stop": len(stops(found)), "look": len(found) - len(stops(found)), "facts": found})
    players = {p: dict(a, say=say_next(st, p)) for p, a in st["players"].items()}
    return {"mode": mode, "table": st["table"], "round": st["round"], "ringClosed": st["ringClosed"], "ring": st["ring"],
            "legsTotal": st["legsTotal"], "lanes": lanes, "players": players, "score": st["score"],
            "limits": {"lines": MAX_LINES, "changed": MAX_CHANGED, "input": MAX_INPUT_LINES}, "kit": sorted(KIT)}


def card_from(nick, d):
    skills = [s.strip() for s in str(d.get("skills", "")).split("\n") if s.strip()][:8]
    return "\n".join([
        "---", "game: trio-swap", f"nick: {nick}", f"agent: {one_line(d.get('agent') or 'не указан', 40)}",
        f"skills_total: {one_line(d.get('total') or len(skills), 6)}", "---", f"# визитка · {nick}", "", "## skills",
        *[f"- {one_line(s.lstrip('- '), 120)}" for s in skills], "", "## на старт",
        f"- вход: {one_line(d.get('input') or 'не указан', 120)}", f"- признак: {one_line(d.get('sign') or 'не указан', 160)}",
        "", "## правило после ошибки", one_line(d.get("rule") or "не указано", 240), "", "## вопрос соседям",
        one_line(d.get("question") or "не указан", 240), ""])


# ---------- страница ----------

def serve(table, rnd, port, lan, use_git, share=False):
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
    import hmac
    import secrets
    import socket
    import threading
    key = secrets.token_urlsafe(9) if share else ""
    web = HERE / "web"
    lock = threading.Lock()
    types = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
             ".json": "application/json; charset=utf-8", ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml",
             ".txt": "text/plain; charset=utf-8"}

    class H(BaseHTTPRequestHandler):
        server_version = "trio-table"

        def log_message(self, *a):
            pass

        def local(self):
            host = (self.headers.get("Host") or "").split(":")[0]
            return host in ("localhost", "127.0.0.1")

        def keyed(self):
            return bool(key) and hmac.compare_digest((self.headers.get("X-Trio-Key") or "").encode(), key.encode())

        def same_origin(self):
            origin = self.headers.get("Origin")
            return not origin or origin in ("http://" + (self.headers.get("Host") or ""), "https://" + (self.headers.get("Host") or ""))

        def send(self, code, body, ctype="application/json; charset=utf-8"):
            data = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'")
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            if not lan and not share and not self.local():
                return self.send(403, {"error": "страница открывается только с этого компьютера"})
            path = self.path.split("?")[0]
            if share and path.startswith("/api/") and not self.keyed():
                return self.send(403, {"error": "нужен ключ стола: открой ссылку, которую прислал ведущий тройки"})
            if path == "/api/pack":
                from urllib.parse import parse_qs, urlsplit
                try:
                    with lock:
                        r = do_pack(table, rnd, (parse_qs(urlsplit(self.path).query).get("lane") or [""])[0])
                    return self.send(200, {"name": r["name"], "text": r["text"]})
                except Refuse as e:
                    return self.send(409, {"error": str(e)})
            if path == "/api/state":
                try:
                    with lock:
                        if use_git:
                            pull(table)
                        return self.send(200, public_state(load(table, rnd), "стол" if share or not lan else "смотреть"))
                except Refuse as e:
                    return self.send(409, {"error": str(e)})
            rel = "index.html" if path in ("/", "") else path.lstrip("/")
            try:
                f = safe(web, rel)
            except Refuse:
                return self.send(403, {"error": "нет"})
            if not f.is_file() or f.suffix not in types:
                return self.send(404, {"error": "нет такой страницы"})
            self.send(200, f.read_bytes(), types[f.suffix])

        def do_POST(self):
            if share:
                if not self.keyed():
                    return self.send(403, {"error": "нужен ключ стола: открой ссылку, которую прислал ведущий тройки"})
            elif lan:
                return self.send(403, {"error": "по сети стол только смотрят: запись идёт с компьютера, где он открыт"})
            elif not self.local():
                return self.send(403, {"error": "запрос пришёл с чужой страницы"})
            if not self.same_origin():
                return self.send(403, {"error": "запрос пришёл с чужой страницы"})
            if (self.headers.get("Content-Type") or "").split(";")[0].strip() != "application/json":
                return self.send(415, {"error": "нужен application/json"})
            size = int(self.headers.get("Content-Length") or 0)
            if size <= 0 or size > 65536:
                return self.send(413, {"error": "запрос больше 64 КБ"})
            try:
                d = json.loads(self.rfile.read(size).decode("utf-8"))
                if not isinstance(d, dict):
                    raise ValueError
            except (ValueError, UnicodeDecodeError):
                return self.send(400, {"error": "тело запроса не читается как JSON"})
            path, nick = self.path.split("?")[0], str(d.get("nick", ""))
            try:
                with lock:
                    if use_git:
                        pull(table)
                    if path == "/api/check":
                        return self.send(200, do_check(table, rnd, nick, str(d.get("skill", "")), d.get("fields") or {}))
                    if path == "/api/lint":
                        return self.send(200, {"facts": facts(str(d.get("skill", "")))})
                    if path == "/api/start":
                        skill = str(d.get("skill", ""))
                        source = "свой skill"
                        if d.get("kit"):
                            if d["kit"] not in KIT or not KIT[d["kit"]].is_file():
                                raise Refuse("в ките нет такого skill")
                            skill, source = KIT[d["kit"]].read_text(encoding="utf-8"), f"кит {d['kit']}"
                        r = do_start(table, rnd, need_nick(nick), skill, card_from(nick, d.get("card") or {}), source)
                    elif path == "/api/ring":
                        r = do_ring(table, rnd, d.get("legs"))
                    elif path == "/api/pass":
                        r = do_pass(table, rnd, nick, str(d.get("skill", "")), d.get("fields") or {})
                    elif path == "/api/unpack":
                        r = do_unpack(table, rnd, str(d.get("bundle", "")))
                    elif path == "/api/skip":
                        r = do_skip(table, rnd, str(d.get("lane", "")))
                    elif path == "/api/finish":
                        r = do_finish(table, rnd, nick, d.get("verdicts") or {})
                    else:
                        return self.send(404, {"error": "нет такого действия"})
                    r["sync"] = push(table, r.pop("paths"), r.pop("message")) if use_git else "записано в папку стола"
                    return self.send(200, r)
            except Refuse as e:
                return self.send(409, {"error": str(e)})

    host = "0.0.0.0" if lan or share else "127.0.0.1"
    for p in range(port, port + 20):
        try:
            srv = ThreadingHTTPServer((host, p), H)
            port = p
            break
        except OSError:
            continue
    else:
        sys.exit("нет свободного порта рядом с " + str(port))
    ip = "localhost"
    if lan or share:
        try:
            probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            probe.connect(("10.255.255.255", 1))
            ip = probe.getsockname()[0]
            probe.close()
        except OSError:
            pass
    how = "общий стол: запись по ссылке с ключом" if share else "только просмотр по сети" if lan else "запись с этого компьютера"
    print(f"эстафета · стол {table_name(table)} · раунд {rnd} · {how}" + (" · git: pull и push включены" if use_git else ""))
    print(f"открой: http://localhost:{port}/" + (f"?k={key}" if share else ""))
    if share:
        print(f"тройке: http://{ip}:{port}/?k={key}")
        print("ключ даёт запись в стол: ссылку отправляй только своей тройке и только в закрытой сети")
    elif lan:
        print(f"по сети: http://{ip}:{port}/")
    sys.stdout.flush()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


# ---------- командная строка ----------

def main(argv=None):
    ap = argparse.ArgumentParser(description="эстафета skills · стол тройки", add_help=True)
    ap.add_argument("cmd", choices=["next", "lint", "start", "ring", "take", "pass", "skip", "finish", "pack", "unpack", "state", "serve"])
    ap.add_argument("table")
    ap.add_argument("nick", nargs="?")
    ap.add_argument("--round", default="r1")
    ap.add_argument("--git", action="store_true")
    ap.add_argument("--skill")
    ap.add_argument("--card")
    ap.add_argument("--kit")
    ap.add_argument("--leg")
    ap.add_argument("--legs", type=int)
    ap.add_argument("--verdict")
    ap.add_argument("--out")
    ap.add_argument("--bundle")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--port", type=int, default=8990)
    ap.add_argument("--lan", action="store_true")
    ap.add_argument("--share", action="store_true")
    a = ap.parse_args(argv)
    read = lambda p: Path(p).read_text(encoding="utf-8")
    try:
        if a.cmd == "lint":
            src = Path(a.table)
            if src.is_dir():
                found = []
                for f in sorted(src.rglob("*.md")):
                    found += [dict(x, rule=f"{f.name}: {x['rule']}") for x in facts(read(f), skill=f.name == "SKILL.md")]
            else:
                found = facts(read(src))
            print(f"lint · {a.table}")
            if found:
                print(explain(found))
            print(f"итог: {len(stops(found))} стоп, {len(found) - len(stops(found))} глянь. "
                  "Имена людей и компаний скрипт не видит: проверь глазами.")
            return 1 if stops(found) else 0
        table, rnd = Path(a.table).resolve(), need_round(a.round)
        if not table.is_dir():
            raise Refuse(f"нет папки стола: {table}")
        if a.cmd == "serve":
            return serve(table, rnd, a.port, a.lan, a.git, a.share)
        if a.git:
            pull(table)
        if a.cmd == "state":
            st = load(table, rnd)
            if a.json:
                print(json.dumps(public_state(st), ensure_ascii=False, indent=1))
                return 0
            print(f"стол: {st['table']} · раунд {rnd} · круг: {' → '.join(st['ring']) or 'нет дорожек'}"
                  f"{'' if st['ringClosed'] else ' (не закрыт)'}")
            for o in st["ring"]:
                l = st["lanes"][o]
                legs = " ".join(f"[{leg['by']}{': пропуск' if leg.get('пропуск') else ''}]" for leg in l["relay"]["legs"])
                nxt = f"→ {l['next']['by']}" if l["next"] else ""
                print(f"  {o:<10} {l['skill']:<18} {l['status']:<8} {legs} {nxt}{'' if l['chainOk'] else '  цепочка хэшей разорвана'}")
            s = st["score"]
            print(f"этапов пройдено {s['legs']} из {s['legsTotal']} · дома {s['home']} из {s['lanes']} · "
                  f"принято правок {s['accepted']} из {s['decided']}")
            return 0
        if a.cmd == "ring":
            r = do_ring(table, rnd, a.legs)
            print(f"круг закрыт: {' → '.join(r['ring'])} · этапов {r['legs']}")
        elif a.cmd == "unpack":
            r = do_unpack(table, rnd, read(a.bundle or a.nick))
            print(f"принята дорожка {r['lane']} · {r['skill']} · версий {r['versions']}")
        elif a.cmd == "pack":
            r = do_pack(table, rnd, need_nick(a.nick))
            if a.out:
                Path(a.out).write_text(r["text"], encoding="utf-8")
                print(f"дорожка {r['lane']} сложена в {a.out}: отправь файл в чат тройки")
            else:
                sys.stdout.write(r["text"])
            return 0
        else:
            nick = need_nick(a.nick)
            if a.cmd == "next":
                print(say_next(load(table, rnd), nick))
                return 0
            if a.cmd == "take":
                t = do_take(table, rnd, nick)
                print(f"этап {t['leg']} из {t['legsTotal']} · палочка {t['skill']} от {t['lane']} · {t['hash']} · файл {t['path']}")
                if t["card"]["question"]:
                    print(f"вопрос владельца: {t['card']['question']}")
                if t["note"]:
                    print(f"записка от {t['prev']['by']}: {t['note']}")
                if t["facts"]:
                    print(explain(t["facts"]))
                return 0
            if a.cmd == "start":
                if a.kit and a.kit not in KIT:
                    raise Refuse("в ките есть: " + ", ".join(sorted(KIT)))
                skill = read(KIT[a.kit]) if a.kit else read(a.skill)
                r = do_start(table, rnd, nick, skill, read(a.card), f"кит {a.kit}" if a.kit else "свой skill")
                print(f"на старте: {r['skill']} · {r['hash']}")
            elif a.cmd == "pass":
                r = do_pass(table, rnd, nick, read(a.skill), parse_blocks(read(a.leg)))
                print(f"передано: этап {r['leg']} · дорожка {r['lane']} · {r['hash']} · изменено строк {r['changed']}")
            elif a.cmd == "skip":
                r = do_skip(table, rnd, nick)
                print(f"этап {r['leg']} на дорожке {r['lane']} пропущен: {r['runner']} не добежал")
            elif a.cmd == "finish":
                r = do_finish(table, rnd, nick, parse_verdicts(read(a.verdict)))
                print(f"финиш: принял {', '.join(r['accepted']) or 'никого'} · не принял {', '.join(r['declined']) or 'никого'}")
            if r.get("look"):
                print(explain(r["look"]))
        print(push(table, r["paths"], r["message"]) if a.git else "записано в папку стола")
        return 0
    except Refuse as e:
        print(f"отказ: {e}", file=sys.stderr)
        return 1
    except FileNotFoundError as e:
        print(f"отказ: нет файла {e.filename}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
