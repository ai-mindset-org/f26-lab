#!/usr/bin/env python3
"""Демо-данные для system-board: вымышленный участник лабы, ни одной настоящей цифры.

    python3 demo.py        # пишет demo/data.json

Страница открывает демо сама, если рядом нет data-show.json, или по адресу ?demo.
Схема та же, что у collect.py: можно сравнивать свой json с этим полем за полем.
"""
from __future__ import annotations

import json
import random
from pathlib import Path

random.seed(26)
HERE = Path(__file__).resolve().parent

SKILLS_TEAM = ["call-digest", "weekly-review", "meeting-notes", "inbox-triage", "client-brief", "release-notes",
               "retro", "content-plan", "lead-research", "proposal", "onboarding", "okr-check"]
SKILLS_ME = ["daily-plan", "grill-me", "journal", "reading-notes", "habit-log", "trip-plan", "budget",
             "gift-ideas", "workout", "recipe", "inbox-zero", "focus-block", "voice-memo", "evening-review",
             "idea-capture", "people-notes", "learning-log", "decision-log", "shopping", "week-ahead",
             "deep-work", "drafts", "summarize-link", "translate", "rewrite", "slide-outline", "mindmap"]
SIZES = {"grill-me": 9, "daily-plan": 64, "call-digest": 38, "weekly-review": 212, "client-brief": 640,
         "content-plan": 1480, "lead-research": 2900}


def t(h: int, m: int) -> str:
    return f"{h:02d}:{m:02d}"


def main() -> None:
    skills_all = []
    for src, names in (("команда", SKILLS_TEAM), ("личные", SKILLS_ME)):
        for n in names:
            lines = SIZES.get(n) or int(10 ** random.uniform(1.0, 3.1))
            skills_all.append({"n": n, "s": src, "l": lines, "f": max(1, lines // 180 + random.randint(0, 2)),
                               "d": f"демо: что делает {n} и когда его брать"})
    skills_all.sort(key=lambda s: s["l"])
    updates = []
    for i, day in enumerate(["03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16"]):
        by = {}
        if random.random() < .6:
            by["личные"] = random.randint(1, 3)
        if random.random() < .35:
            by["команда"] = random.randint(1, 2)
        updates.append({"day": f"2026-11-{day}", "by": by})
    updates[-1]["by"] = {"личные": 2, "команда": 1}
    recent = [
        {"n": "daily-plan", "s": "личные", "when": "16.11 09:12", "t": "09:12"},
        {"n": "call-digest", "s": "команда", "when": "16.11 13:40", "t": "13:40"},
        {"n": "evening-review", "s": "личные", "when": "16.11 18:05", "t": "18:05"},
        {"n": "content-plan", "s": "команда", "when": "15.11 17:20", "t": None},
        {"n": "journal", "s": "личные", "when": "14.11 22:10", "t": None},
        {"n": "weekly-review", "s": "команда", "when": "13.11 19:02", "t": None},
        {"n": "grill-me", "s": "личные", "when": "12.11 11:45", "t": None},
        {"n": "reading-notes", "s": "личные", "when": "10.11 21:30", "t": None},
    ]
    sessions = [
        {"tool": "claude", "project": "~/notes", "title": "план дня по календарю и задачам", "segs": [[t(8, 40), t(9, 15)]],
         "start": t(8, 40), "prompts": 4, "tools": 31, "skills": ["daily-plan"]},
        {"tool": "claude", "project": "~/notes", "title": "разбор звонка с клиентом", "segs": [[t(11, 5), t(11, 50)], [t(13, 30), t(13, 55)]],
         "start": t(11, 5), "prompts": 7, "tools": 64, "skills": ["call-digest"]},
        {"tool": "claude", "project": "~/work/site", "title": "лендинг: блок цен", "segs": [[t(12, 10), t(12, 58)]],
         "start": t(12, 10), "prompts": 5, "tools": 88, "skills": []},
        {"tool": "claude", "project": "~/notes", "title": "первый skill: обещания после звонка", "segs": [[t(14, 20), t(15, 40)]],
         "start": t(14, 20), "prompts": 11, "tools": 120, "skills": ["grill-me", "call-digest"]},
        {"tool": "claude", "project": "~/notes", "title": "тест skill в чистом чате", "segs": [[t(15, 50), t(16, 5)]],
         "start": t(15, 50), "prompts": 2, "tools": 14, "skills": ["call-digest"]},
        {"tool": "claude", "project": "~/notes", "title": "дашборд своей системы", "segs": [[t(16, 30), t(17, 45)]],
         "start": t(16, 30), "prompts": 9, "tools": 140, "skills": []},
        {"tool": "claude", "project": "~/notes", "title": "вечерний разбор дня", "segs": [[t(18, 0), t(18, 12)]],
         "start": t(18, 0), "prompts": 3, "tools": 18, "skills": ["evening-review"]},
        {"tool": "codex", "project": "~/work/site", "title": "site", "segs": [[t(10, 0), t(10, 40)], [t(13, 0), t(13, 20)]],
         "start": t(10, 0), "prompts": 0, "tools": 52, "skills": []},
        {"tool": "codex", "project": "~/notes", "title": "notes", "segs": [[t(15, 0), t(15, 18)]],
         "start": t(15, 0), "prompts": 0, "tools": 22, "skills": ["call-digest"]},
        {"tool": "codex", "project": "~/work/bot", "title": "bot", "segs": [[t(16, 40), t(17, 30)]],
         "start": t(16, 40), "prompts": 0, "tools": 47, "skills": []},
    ]
    hum = [0] * 24
    agt = [0] * 24
    for s in sessions:
        h = int(s["start"][:2])
        hum[h] += s["prompts"]
        agt[h] += s["tools"]
    telegram = [{"t": t(9, 20), "chat": "чат лабы", "me": True, "text": "сделала папку контекста, self.md на 40 строк"},
                {"t": t(9, 31), "chat": "чат лабы", "me": False, "text": ""},
                {"t": t(9, 44), "chat": "чат лабы", "me": False, "text": ""},
                {"t": t(12, 2), "chat": "тройка", "me": False, "text": ""},
                {"t": t(12, 15), "chat": "тройка", "me": True, "text": "кто тестирует skill друг у друга вечером?"},
                {"t": t(15, 45), "chat": "чат лабы", "me": True, "text": "call-digest нашёл 3 обещания из 4, четвёртое без срока – ушло в «уточнить»"},
                {"t": t(16, 10), "chat": "чат лабы", "me": False, "text": ""},
                {"t": t(16, 12), "chat": "чат лабы", "me": False, "text": ""},
                {"t": t(18, 20), "chat": "тройка", "me": False, "text": ""}]
    files = []
    for tm, typ, name, new in [((8, 55), "plan", "{plan} день – 2026-11-16", True), ((11, 52), "meeting", "{meeting} звонок с клиентом – 2026-11-16", True),
                               ((11, 58), "log", "{log} skill runs", False), ((13, 50), "draft", "{draft} письмо клиенту – 2026-11-16", True),
                               ((14, 40), "skill", "SKILL", True), ((15, 41), "eval", "{eval} call-digest", True),
                               ((15, 59), "log", "{log} skill runs", False), ((17, 40), "guide", "{guide} мой дашборд – 2026-11-16", True),
                               ((18, 10), "review", "{review} вечер – 2026-11-16", True)]:
        files.append({"vault": "~/notes", "name": name, "type": typ, "created": new, "t": t(*tm)})
    files.reverse()
    by_type = {}
    for f in files:
        if f["created"]:
            by_type[f["type"]] = by_type.get(f["type"], 0) + 1
    commits = [{"t": t(h, m), "repo": "notes", "subject": "", "auto": a} for h, m, a in
               [(9, 0, True), (11, 0, True), (12, 58, False), (13, 0, True), (15, 0, True), (15, 42, False), (17, 0, True), (17, 46, False)]]
    always = [{"label": "правила агента", "path": "~/notes/AGENTS.md", "when": "каждая сессия", "lines": 84, "tokens": 2100},
              {"label": "о себе", "path": "~/notes/context/self.md", "when": "каждая сессия", "lines": 41, "tokens": 900},
              {"label": "индекс памяти", "path": "~/.claude/memory/MEMORY.md", "when": "строка на память", "lines": 22, "tokens": 640}]
    sections = [{"title": t_, "critical": c, "lines": l, "tokens": tk} for t_, c, l, tk in [
        ("кто я и чем занимаюсь", False, 9, 260), ("как со мной говорить", True, 7, 190), ("где что лежит", True, 12, 330),
        ("имена файлов", True, 6, 150), ("что агент не делает без спроса", True, 8, 210), ("skills: когда какой", False, 14, 380),
        ("проекты сейчас", False, 10, 270), ("черновики и отправка", False, 5, 120), ("проверка результата", False, 6, 160)]]
    hooks = [{"event": e, "count": c, "scripts": s} for e, c, s in [
        ("SessionStart", 2, ["load-today.sh", "inline"]), ("UserPromptSubmit", 1, ["inline"]), ("PreToolUse", 0, []),
        ("PostToolUse", 1, ["log-skill-run.sh"]), ("Stop", 1, ["inline"]), ("PreCompact", 0, []), ("PostCompact", 0, []),
        ("SessionEnd", 1, ["handoff.sh"])]]
    header_tokens = sum(len(s["d"]) // 3 + 8 for s in skills_all)
    data = {
        "owner": "Маша · демо", "generated": "2026-11-16 18:30", "now": "18:30", "mode": "demo", "compact_window": 200000,
        "always": always, "sections": sections, "hooks": hooks,
        "skills": {"counts": {"команда": len(SKILLS_TEAM), "личные": len(SKILLS_ME)}, "total": len(skills_all),
                   "header_tokens": header_tokens, "all": skills_all,
                   "ladder": [{"name": n, "lines": SIZES[n]} for n in ("grill-me", "call-digest", "weekly-review", "lead-research")],
                   "updates": updates, "recent": recent},
        "sessions": sessions,
        "runs": {"claude": [["call-digest", 4], ["daily-plan", 1], ["grill-me", 1], ["evening-review", 1]],
                 "codex": [["call-digest", 2], ["release-notes", 1]]},
        "routes": {"claude_auto": 5, "claude_slash": 2, "codex_read": 3},
        "hum": hum, "agt": agt, "telegram": telegram,
        "vault": {"files": files, "created": sum(f["created"] for f in files), "modified": sum(not f["created"] for f in files),
                  "by_type": sorted(by_type.items(), key=lambda x: -x[1])},
        "commits": commits,
        "memory": {"feedback": 9, "project": 6, "user": 3, "reference": 4},
        "roots": [{"root": "~/notes", "role": "волт Obsidian: контекст, заметки, журнал",
                   "parts": [["meetings/", "86 md"], ["context/", "12 md"], ["projects/", "40 md"], ["logs/", "9 md"], ["drafts/", "17 md"]]},
                  {"root": "~/.claude", "role": "харнесс агента: правила, skills, память",
                   "parts": [["skills/", "39 папок"], ["memory/", "22 md"], ["CLAUDE.md", "84 строки"]]},
                  {"root": "~/work", "role": "код и сайты", "parts": [["site/", "проект"], ["bot/", "проект"]]}],
        "places": [], "lanes": [{"name": "cron", "where": "мак", "use": "план дня в 8:30"},
                                {"name": "Codex automations", "where": "приложение Codex", "use": "вечерний разбор"}],
        "servers": [], "mcp": ["calendar", "telegram"],
        "links": {"kit": "https://github.com/ai-mindset-org/f26-lab/tree/main/dashboards/system-board"},
    }
    data["budget"] = {"always": sum(a["tokens"] for a in always), "skill_headers": header_tokens, "window": 200000}
    (HERE / "demo").mkdir(exist_ok=True)
    (HERE / "demo" / "data.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print(f"demo/data.json: {len(sessions)} сессий · {len(skills_all)} skills · {len(files)} заметок")


if __name__ == "__main__":
    main()
