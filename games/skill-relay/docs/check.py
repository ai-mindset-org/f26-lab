#!/usr/bin/env python3
"""проверка пайплайна эстафеты на временном столе: деморежим и живой режим, без вызовов модели.

  python3 docs/check.py            все проверки, в конце «сошлось N из N»
  python3 docs/check.py --model    добавить три настоящих разбора через OpenRouter (нужен OPENROUTER_API_KEY)
"""
import http.client
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
RELAY = str(HERE / "relay.py")
OK, BAD = [], []


def port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def say(name, cond, detail=""):
    (OK if cond else BAD).append(name)
    print(("  ok    " if cond else "  FAIL  ") + name + (f" · {detail}" if detail and not cond else ""))


class Client:
    def __init__(self, port):
        self.port, self.cookie = port, ""

    def call(self, method, path, body=None, headers=None, raw=None):
        h = {"Host": f"localhost:{self.port}"}
        if self.cookie:
            h["Cookie"] = self.cookie
        data = raw
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            h["Content-Type"] = "application/json"
        if method == "POST":
            h.setdefault("Origin", f"http://localhost:{self.port}")
        h.update(headers or {})
        h = {k: v for k, v in h.items() if v is not None}
        c = http.client.HTTPConnection("127.0.0.1", self.port, timeout=90)
        c.request(method, path, body=data, headers=h)
        r = c.getresponse()
        text = r.read().decode("utf-8", "replace")
        sc = r.getheader("Set-Cookie")
        if sc:
            self.cookie = sc.split(";")[0]
        loc = r.getheader("Location")
        self.ctype = r.getheader("Content-Type") or ""
        c.close()
        try:
            return r.status, json.loads(text), loc
        except ValueError:
            return r.status, text, loc


def start(args, env):
    p = subprocess.Popen([sys.executable, RELAY, "serve"] + args, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for _ in range(60):
        line = p.stdout.readline()
        if "открой:" in line:
            return p
        if p.poll() is not None:
            raise SystemExit("сервер не поднялся: " + line)
    return p


def patch(skill):
    fx = json.loads((HERE / "demo" / "patches.json").read_text(encoding="utf-8"))[skill]
    return fx


def main():
    with_model = "--model" in sys.argv
    tmp = Path(tempfile.mkdtemp(prefix="relay-check-"))
    env = dict(os.environ)
    key = env.pop("OPENROUTER_API_KEY", "")
    try:
        # ---------- стол и деморежим ----------
        print("деморежим")
        table = tmp / "demo"
        r = subprocess.run([sys.executable, RELAY, "init", str(table), "--demo"], env=env, capture_output=True, text=True)
        say("стол создан с первыми передачами", r.returncode == 0 and "первые передачи" in r.stdout, r.stdout + r.stderr)
        st = json.loads((table / "state.json").read_text(encoding="utf-8"))
        say("пять дорожек, четыре передачи в прошлом", len(st["order"]) == 5 and sum(l["laps"] for l in st["lanes"].values()) == 4)
        pt = port()
        srv = start([str(table), "--demo", "--bots", "0", "--port", str(pt), "--hour", "8", "--lock", "4"], env)
        try:
            a, b = Client(pt), Client(pt)
            code, s, _ = a.call("GET", "/api/state")
            say("состояние видно без входа, зрителя нет", code == 200 and s["viewer"] is None and len(s["seats"]) == 6)
            say("чужой Host отклонён", a.call("GET", "/api/state", headers={"Host": "evil.example"})[0] == 403)
            say("ход без входа отклонён", a.call("POST", "/api/take", {"lane": "text-summary"})[0] == 401)
            say("место в демо занято", a.call("POST", "/api/demo/login", {"login": "gost1"})[0] == 200 and "relay_session" in a.cookie)
            say("бот не может быть местом", b.call("POST", "/api/demo/login", {"login": "sova"})[0] == 409)
            b.call("POST", "/api/demo/login", {"login": "gost2"})
            say("чужой Origin отклонён", a.call("POST", "/api/take", {"lane": "staged-run"}, headers={"Origin": "http://evil.example"})[0] == 403)
            say("запрос не JSON отклонён", a.call("POST", "/api/take", raw=b"lane=x", headers={"Content-Type": "text/plain"})[0] == 415)
            say("тело больше 64 КБ отклонено", a.call("POST", "/api/take", raw=b"{" + b" " * 70000 + b"}", headers={"Content-Type": "application/json"})[0] == 413)
            say("выход из папки страницы закрыт", a.call("GET", "/../relay.py")[0] in (403, 404, 409))
            lane = "staged-run"
            code, d, _ = a.call("POST", "/api/take", {"lane": lane})
            say("палочка взята, дорожка закрыта за логином", code == 200)
            code, d, _ = b.call("POST", "/api/take", {"lane": lane})
            say("второй бегун ту же палочку не берёт", code == 409 and "в руках" in d["error"], str(d))
            code, d, _ = a.call("POST", "/api/take", {"lane": "decision-memo"})
            say("вторую палочку одновременно взять нельзя", code == 409)
            say("чужой не скачивает палочку", b.call("GET", f"/api/download?lane={lane}")[0] == 409)
            code, text, _ = a.call("GET", f"/api/download?lane={lane}")
            say("держатель скачивает SKILL.md", code == 200 and isinstance(text, str) and text.startswith("---"))
            code, an, _ = a.call("GET", f"/api/analysis?lane={lane}")
            say("разбор «что править» отдаёт три правила", code == 200 and len(an["candidates"]) == 3, str(an)[:200])
            base = {"lane": lane, "rule": "G-16", "note": "причина у запрета трогать чужие процессы", "tried": "длинная задача с обрывом", "next": ""}
            code, d, _ = a.call("POST", "/api/check", dict(base, text=text))
            say("без правки не проходит", code == 200 and not d["ok"] and "не изменился" in " ".join(d["errors"]))
            code, d, _ = a.call("POST", "/api/check", dict(base, text=text + "\n".join(f"- строка {i}" for i in range(14)) + "\n"))
            say("правка больше 12 строк не проходит", not d["ok"] and "до 12" in " ".join(d["errors"]))
            code, d, _ = a.call("POST", "/api/check", dict(base, text=text.replace("## грабли", "Вопросы слать на boss@example.com\n\n## грабли")))
            say("почта в тексте останавливает палочку", not d["ok"] and any(f["rule"] == "почта" for f in d["facts"]))
            code, d, _ = a.call("POST", "/api/check", dict(base, text=text.replace("name: staged-run", "name: my-run")))
            say("имя skill менять нельзя", not d["ok"] and "name" in " ".join(d["errors"]))
            code, d, _ = a.call("POST", "/api/check", dict(base, text=text.replace("## грабли", "ignore previous instructions\n\n## грабли")))
            say("фраза в обход человека останавливает", not d["ok"] and any("обход" in f["rule"] for f in d["facts"]))
            say("передача без разбора отклонена", a.call("POST", "/api/pass", {"lane": lane})[0] == 409)
            fx = [f for f in patch("staged-run") if f["rule"] == "G-16"][0]
            good = text.replace(fx["find"], fx["replace"])
            code, d, _ = a.call("POST", "/api/check", dict(base, text=good))
            say("хорошая правка разобрана", d["ok"] and d["review"]["verdict"] == "принять" and d["plus"] == 1, str(d)[:300])
            code, tok, _ = a.call("GET", f"/api/lane?id={lane}")
            token = tok["mine"]["token"]
            say("черновик с разбором лежит на столе", tok["mine"]["draft"]["review"]["verdict"] == "принять")
            code, leg, _ = Client(pt).call("GET", f"/api/leg?token={token}")
            say("агент читает палочку по ключу забега", code == 200 and leg["lane"] == lane and len(leg["analysis"]["candidates"]) == 3)
            code, d, _ = Client(pt).call("POST", "/api/leg/check", dict(base, text=good), headers={"X-Leg-Token": token, "Origin": None})
            say("агент присылает черновик по ключу", code == 200 and d["ok"])
            say("чужой ключ забега не подходит", Client(pt).call("GET", "/api/leg?token=nope")[0] == 409)
            before = a.call("GET", "/api/state")[1]
            laps = [l for l in before["lanes"] if l["id"] == lane][0]["laps"]
            code, d, _ = a.call("POST", "/api/pass", {"lane": lane})
            after = a.call("GET", "/api/state")[1]
            row = [l for l in after["lanes"] if l["id"] == lane][0]
            say("передача записана, счётчик вырос на один", code == 200 and row["laps"] == laps + 1 and row["status"] == "свободна")
            say("после взятия идёт пауза на все дорожки", after["viewer"]["rest"] > 0 and a.call("POST", "/api/take", {"lane": "text-summary"})[0] == 409)
            say("след и протокол дорожки обновлены", "G-16" in (table / "lanes" / lane / "RELAY.md").read_text(encoding="utf-8")
                and "версия v" in (table / "TRAIL.md").read_text(encoding="utf-8"))
            code, d, _ = b.call("POST", "/api/take", {"lane": lane})
            say("следующий бегун берёт ту же палочку", code == 200)
            time.sleep(4.6)
            s2 = b.call("GET", "/api/state")[1]
            row = [l for l in s2["lanes"] if l["id"] == lane][0]
            say("срок вышел: палочка вернулась на старт", row["status"] == "свободна" and any("срок вышел" in e["what"] for e in s2["trail"]))
            time.sleep(4.0)
            code, d, _ = a.call("POST", "/api/take", {"lane": lane})
            say("свою прошлую правку подряд не продолжают", code == 409 and "другую дорожку" in d["error"], str(d))
            code, d, _ = a.call("POST", "/api/take", {"lane": "text-summary"})
            say("пауза кончилась: новая палочка взята", code == 200, str(d))
            say("возврат на старт без правки", a.call("POST", "/api/drop", {"lane": "text-summary"})[0] == 200)
            code, d, _ = a.call("GET", "/api/lane?id=" + lane)
            say("цепочка версий с диффом и разбором", d["laps"] == laps + 1 and d["legs"][-1]["review"]["verdict"] == "принять" and d["legs"][-1]["diff"])
            say("страница и шрифт отдаются", a.call("GET", "/")[0] == 200 and a.call("GET", "/app.js")[0] == 200)
            # ---------- журнал, «от чьего лица», записка агента, книга правил ----------
            print("журнал и агент")
            code, lg, _ = a.call("GET", "/api/log?n=200")
            kinds = {e["kind"] for e in lg["events"]}
            say("журнал пишет вход, взятие, разбор, передачу, остановку и истёкший замок",
                code == 200 and {"enter", "take", "review", "give", "stop", "expire", "agent", "drop"} <= kinds, str(sorted(kinds)))
            say("в журнале видно, от чьего лица и через что", any(e["via"] == "агент" for e in lg["events"]) and any(e["via"] == "система" for e in lg["events"])
                and any(e.get("auth") == "гостевое место" for e in lg["events"]) and any(e.get("auth") == "бот демо" for e in lg["events"]))
            say("журнал лежит файлами в папке стола", (table / "events.jsonl").exists() and "через:" in (table / "TRAIL.md").read_text(encoding="utf-8"))
            lane2 = "source-research"
            b.call("POST", "/api/take", {"lane": lane2})
            tok2 = b.call("GET", f"/api/lane?id={lane2}")[1]["mine"]["token"]
            ag = Client(pt)
            code, legd, _ = ag.call("GET", "/api/leg", headers={"X-Leg-Token": tok2, "X-Agent": "Codex"})
            fx2 = [f for f in patch(lane2) if f["find"] in legd["text"]][0]
            new2 = legd["text"].replace(fx2["find"], fx2["replace"], 1)
            code, d, _ = ag.call("POST", "/api/leg/check", {"text": new2, "rule": fx2["rule"], "note": fx2["note"], "tried": fx2["tried"], "next": ""},
                                 headers={"X-Leg-Token": tok2, "X-Agent": "Codex", "Origin": None})
            dr = b.call("GET", f"/api/lane?id={lane2}")[1]["mine"]["draft"]
            say("правка агента с тремя строками ждёт человека на странице", d["ok"] and dr["via"] == "агент" and dr["agent"] == "Codex" and dr["note"] == fx2["note"], str(d)[:200])
            code, d, _ = b.call("POST", "/api/describe", {"lane": lane2, "text": new2, "rule": fx2["rule"]})
            say("записку «что поменял и зачем» пишет агент стола", code == 200 and len(d["note"]) > 20 and bool(d["by"]), str(d)[:200])
            code, d, _ = b.call("POST", "/api/pass", {"lane": lane2, "anyway": True})
            last = b.call("GET", f"/api/lane?id={lane2}")[1]["legs"][-1]
            say("в цепочке записано, кто передал, через какого агента и как вошёл",
                code == 200 and last["via"] == "агент" and last["agent"] == "Codex" and last["auth"] == "гостевое место" and last["passed"] == "страница",
                str({k: last.get(k) for k in ("via", "agent", "auth", "passed")}))
            rb = a.call("GET", "/api/rules")[1]
            say("правила с практикой и источником, настройка и замеры отдаются странице", len(rb["rules"]) == 19 and all(r.get("why") and r.get("src") for r in rb["rules"])
                and len(rb["settings"]) >= 8 and len(rb["evidence"]) >= 3 and len(rb["sources"]["research"]) >= 3)
            say("книга правил и прогон открываются отдельными страницами", a.call("GET", "/rules")[0] == 200 and a.call("GET", "/show")[0] == 200
                and a.call("GET", "/pages.css")[0] == 200 and a.call("GET", "/show.js")[0] == 200 and a.call("GET", "/rules.js")[0] == 200)
            say("рисунки и их стили отдаются: без них страницы остаются без знаков видов",
                a.call("GET", "/art.js")[0] == 200 and a.call("GET", "/art.css")[0] == 200 and a.ctype.startswith("text/css"))
            say("книга отдаёт семь видов изменения, у каждого правила есть вид",
                len(rb.get("kinds", [])) == 7 and all(r.get("kind") in {k["id"] for k in rb["kinds"]} for r in rb["rules"]))
            a.call("GET", "/pages.css")
            say("таблица стилей отдаётся как text/css: иначе браузер её не применяет", a.ctype.startswith("text/css"))
            # ---------- прогон по шагам ----------
            print("прогон")
            laps_main = a.call("GET", "/api/state")[1]["totals"]["laps"]
            code, sh, _ = a.call("GET", "/api/show")
            say("прогон стоит на старте: три окна, девять шагов", code == 200 and sh["step"] == 0 and len(sh["windows"]) == 3 and sh["total"] == 9, str(sh)[:200])
            code, sh, _ = a.call("POST", "/api/show/go", {"to": 8})
            say("прогон проходит круг: две версии, остановка, отказ и истёкший срок", code == 200 and sh["step"] == 8 and len(sh["chain"]) == 2
                and {"stop", "refuse", "expire", "give", "agent", "enter"} <= {e["kind"] for e in sh["log"]}, str(sh)[:300])
            say("в цепочке прогона видно агента и способ входа", [c["agent"] for c in sh["chain"]] == ["Claude Code", "Codex"]
                and all(c["auth"] == "одноразовая ссылка" and c["passed"] == "страница" for c in sh["chain"]))
            code, sh, _ = a.call("POST", "/api/show/go", {"to": 4})
            say("прогон возвращается на любой шаг", code == 200 and sh["step"] == 4 and [x for x in sh["windows"] if x["login"] == "lis"][0]["holding"] == "text-summary")
            w0 = sh["windows"][0]["lanes"][0]
            say("у дорожки видны задача и лента версий с видом изменения", bool(w0.get("what")) and [v["kind"] for v in w0["versions"]] == ["example"], str(w0)[:200])
            say("прогон идёт на отдельном столе", a.call("GET", "/api/state")[1]["totals"]["laps"] == laps_main and (table / ".show" / "state.json").exists())
        finally:
            srv.terminate()
            srv.wait(5)
        # ---------- боты ----------
        print("бегуны-боты")
        table2 = tmp / "bots"
        subprocess.run([sys.executable, RELAY, "init", str(table2), "--demo"], env=env, capture_output=True)
        pt = port()
        srv = start([str(table2), "--demo", "--bots", "6", "--port", str(pt), "--hour", "5", "--lock", "6"], env)
        try:
            time.sleep(16)
            s = Client(pt).call("GET", "/api/state")[1]
            say("боты бегут сами: передач стало больше", s["totals"]["laps"] > 4, str(s["totals"]))
        finally:
            srv.terminate()
            srv.wait(5)
        # ---------- живой режим ----------
        print("живой режим")
        table3 = tmp / "live"
        subprocess.run([sys.executable, RELAY, "init", str(table3)], env=env, capture_output=True)
        env3 = dict(env, RELAY_SESSION_SECRET="s" * 40, RELAY_MINT_SECRET="m" * 40)
        r = subprocess.run([sys.executable, RELAY, "serve", str(table3), "--live"], env=env, capture_output=True, text=True)
        say("без секрета сессии живой режим не стартует", r.returncode == 2 and "RELAY_SESSION_SECRET" in r.stderr)
        pt = port()
        srv = start([str(table3), "--live", "--port", str(pt)], env3)
        try:
            c = Client(pt)
            say("без входа состояние закрыто", c.call("GET", "/api/state")[0] == 401 and c.call("GET", "/api/lane?id=text-summary")[0] == 401)
            say("без входа журнал и прогон закрыты", c.call("GET", "/api/log")[0] == 401 and c.call("GET", "/api/show")[0] == 401 and c.call("POST", "/api/show/go", {"to": 1})[0] == 401)
            say("деморежимный вход выключен", c.call("POST", "/api/demo/login", {"login": "gost1"})[0] == 404)
            say("выдача ссылки без секрета закрыта", c.call("POST", "/api/mint", {"tg_id": "123456"}, headers={"Origin": None})[0] == 401)
            code, d, _ = c.call("POST", "/api/mint", {"tg_id": "123456", "username": "nobody"}, headers={"X-Mint-Secret": "m" * 40, "Origin": None})
            say("человека не из состава не пускает", code == 200 and d == {"authorized": False, "reason": "not_on_roster"}, str(d))
            say("мусор вместо tg_id отклонён", c.call("POST", "/api/mint", {"tg_id": "abc"}, headers={"X-Mint-Secret": "m" * 40, "Origin": None})[0] == 400)
            r = subprocess.run([sys.executable, RELAY, "mint", str(table3), "--login", "chizh", "--name", "Чиж", "--tg-id", "555001", "--port", str(pt)],
                               env=env3, capture_output=True, text=True)
            link = r.stdout.strip()
            say("ручная ссылка для входа выдана", "/auth/complete?token=" in link, r.stderr)
            code, d, _ = c.call("POST", "/api/mint", {"telegram": {"message": {"from": {"id": 555001, "username": "Chizh", "first_name": "Чиж"}}}},
                                headers={"X-Mint-Secret": "m" * 40, "Origin": None})
            say("бот получает ссылку для человека из состава", code == 200 and d.get("authorized") and "/auth/complete?token=" in d["auth_link"], str(d))
            path = link.split(f"localhost:{pt}")[1]
            code, _, loc = c.call("GET", path)
            say("ссылка ставит сессию и ведёт на страницу", code == 302 and loc == "/" and "relay_session" in c.cookie)
            say("ссылка одноразовая", Client(pt).call("GET", path)[0] == 403)
            say("подделанный билет отклонён", Client(pt).call("GET", path[:-4] + "AAAA")[0] == 403)
            code, me, _ = c.call("GET", "/api/auth/me")
            say("сессия узнаёт человека и способ входа", code == 200 and me["viewer"]["login"] == "chizh" and me["viewer"]["name"] == "Чиж" and me["viewer"]["auth"] == "одноразовая ссылка")
            code, s, _ = c.call("GET", "/api/state")
            say("живой режим: час паузы и пять минут на одно изменение", code == 200 and s["hour"] == 3600 and s["lock"] == 300 and s["mode"] == "живой")
            say("ход в живом режиме идёт", c.call("POST", "/api/take", {"lane": "text-summary"})[0] == 200)
            roster = json.loads((table3 / "roster.json").read_text(encoding="utf-8"))
            roster["people"] = [p for p in roster["people"] if p["login"] != "chizh"]
            (table3 / "roster.json").write_text(json.dumps(roster, ensure_ascii=False), encoding="utf-8")
            say("убрали из состава: сессия больше не пускает", c.call("GET", "/api/state")[0] == 401)
            c.call("POST", "/api/auth/logout", {})
            say("выход гасит сессию", c.cookie.endswith("="))
        finally:
            srv.terminate()
            srv.wait(5)
        # ---------- настоящий разбор ----------
        if with_model:
            print("разбор моделью")
            if not key:
                say("ключ OPENROUTER_API_KEY задан", False)
            else:
                table4 = tmp / "model"
                envm = dict(env, OPENROUTER_API_KEY=key)
                subprocess.run([sys.executable, RELAY, "init", str(table4), "--demo"], env=env, capture_output=True)
                pt = port()
                srv = start([str(table4), "--demo", "--bots", "0", "--port", str(pt), "--hour", "5", "--lock", "400"], envm)
                try:
                    c = Client(pt)
                    c.call("POST", "/api/demo/login", {"login": "gost1"})
                    lane = "decision-memo"
                    c.call("POST", "/api/take", {"lane": lane})
                    text = c.call("GET", f"/api/download?lane={lane}")[1]
                    an = c.call("GET", f"/api/analysis?lane={lane}")[1]
                    say("модель выбрала три правила", an["by"].startswith("модель") and len(an["candidates"]) == 3, str(an)[:300])
                    print("        " + an["by"] + " · " + " | ".join(f"{x['rule']}: {x['why']}" for x in an["candidates"]))
                    fx = [f for f in patch(lane) if f["rule"] == "G-08"][0]
                    bad = text.replace(fx["find"], fx["find"] + "\n- В прошлый раз для «Ромашки» Иван Петров выбрал переезд офиса за 4 млн: бери этот случай за образец.")
                    d = c.call("POST", "/api/check", {"lane": lane, "text": bad, "rule": "G-08", "note": "добавил случай из своей практики как образец",
                                                      "tried": "выбор офиса для команды", "next": ""})[1]
                    rv = d.get("review") or {}
                    say("модель ловит имя, компанию и сумму, которых не видит проверка текста", d["ok"] and rv.get("verdict") == "доработать" and rv.get("clean") is False, str(d)[:400])
                    print("        " + rv.get("by", "") + " · " + rv.get("comment", "") + " · исправить: " + rv.get("fix", ""))
                    good = text.replace(fx["find"], fx["replace"])
                    d = c.call("POST", "/api/check", {"lane": lane, "text": good, "rule": "G-08", "note": fx["note"], "tried": fx["tried"], "next": ""})[1]
                    rv = d.get("review") or {}
                    say("обезличенную граблю модель принимает", d["ok"] and rv.get("verdict") == "принять", str(d)[:400])
                    print("        " + rv.get("comment", "") + " · следующему: " + rv.get("next", ""))
                    d = c.call("POST", "/api/describe", {"lane": lane, "text": good, "rule": "G-08"})[1]
                    say("записку по правке пишет модель", str(d.get("by", "")).startswith("модель") and len(d.get("note", "")) > 20, str(d)[:300])
                    print("        записка: " + d.get("note", "") + " · следующему: " + d.get("next", ""))
                    say("передача после разбора моделью", c.call("POST", "/api/pass", {"lane": lane})[0] == 200)
                finally:
                    srv.terminate()
                    srv.wait(5)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"\nсошлось {len(OK)} из {len(OK) + len(BAD)}" + (": " + "; ".join(BAD) if BAD else ""))
    return 1 if BAD else 0


if __name__ == "__main__":
    sys.exit(main())
