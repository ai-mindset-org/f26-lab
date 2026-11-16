# правила развития skills

Книга эстафеты: по одному правилу на передачу. Собрано из гайдов, формулировки свои, первоисточники ниже.
Файл собирается командой `python3 relay.py rules` из `rules.json`.

## G-01 · описание отвечает «что делает» и «когда брать»

**Вопрос.** По одной строке description агент решает, брать ли skill. В ней названо, что skill делает, и ситуации или слова человека, на которых он нужен? Она написана в третьем лице?

**Правка.** Перепиши description: сначала действие и результат, затем «Бери, когда …» с двумя-тремя живыми формулировками запроса. Без «я помогу» и «ты можешь».

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions) · [OpenAI Codex · Build skills](https://developers.openai.com/codex/skills)

## G-02 · только то, чего агент не знает

**Вопрос.** Каждая строка проходит вопрос «ошибётся ли агент без этой инструкции»? Есть ли объяснения общеизвестного и повторы?

**Правка.** Убери или сожми строки, без которых агент справится. Освободившееся место отдай тому, что знает только автор: соглашения, порядок, тонкие случаи.

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)

## G-03 · строгость по хрупкости

**Вопрос.** Хрупкие места (где ошибка стоит дорого или порядок важен) заданы точной последовательностью? Гибкие места оставляют агенту выбор?

**Правка.** Найди одно место, где строгость не совпадает с хрупкостью: закрепи порядок там, где он важен, или сними лишний жёсткий запрет там, где годятся разные пути.

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)

## G-04 · умолчание вместо меню

**Вопрос.** Где skill предлагает несколько равных вариантов инструмента или подхода и оставляет выбор без опоры?

**Правка.** Назови один вариант по умолчанию и одной фразой условие, при котором берётся другой.

Источник: [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

## G-05 · шаги с явным входом и выходом

**Вопрос.** Skill учит, как подходить к классу задач, повелительными шагами? У каждого шага понятно, что он берёт и что оставляет следующему?

**Правка.** Перепиши одно расплывчатое место в шаг: глагол, над чем работает, что получается на выходе.

Источник: [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [OpenAI Codex · Build skills](https://developers.openai.com/codex/skills)

## G-06 · шаблон вывода

**Вопрос.** Формат результата показан готовой заготовкой, которую агент заполняет, или описан словами?

**Правка.** Добавь или уточни шаблон результата: заголовки, порядок блоков, что стоит в каждом.

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [anthropics/skills · skill-creator (Apache-2.0)](https://github.com/anthropics/skills/tree/main/skills/skill-creator)

## G-07 · пример «вход → выход»

**Вопрос.** Есть ли хотя бы один конкретный пример: короткий вход и то, что из него должно получиться?

**Правка.** Добавь один пример на 4–8 строк на выдуманных данных. Он должен показывать трудное место, которое шагами описать сложно.

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [anthropics/skills · skill-creator (Apache-2.0)](https://github.com/anthropics/skills/tree/main/skills/skill-creator)

## G-08 · грабли из живого прогона

**Вопрос.** Есть ли раздел с конкретными ошибками, которые агент делает без подсказки? Пришла ли хоть одна из них из настоящего запуска?

**Правка.** Примерь skill на своём входе. Ошибку, которую пришлось исправлять руками, запиши одной строкой в «грабли»: что агент сделал и как надо.

Источник: [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)

## G-09 · чек-лист для длинной работы

**Вопрос.** Если в работе больше пяти шагов или есть зависимости между ними, может ли агент отмечать пройденное и не пропустить шаг?

**Правка.** Собери шаги в чек-лист с отметками и поставь строку «не переходи дальше, пока не отмечено».

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)

## G-10 · петля проверки

**Вопрос.** После работы агент сверяет результат с чем-то проверяемым и возвращается чинить, если сверка не сошлась? Перед необратимым шагом есть план и его проверка?

**Правка.** Добавь одну проверку с понятным «сошлось или нет» и строку «если нет: исправь и проверь снова».

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)

## G-11 · один термин на одно понятие

**Вопрос.** Одно и то же понятие названо одним словом по всему тексту?

**Правка.** Выбери одно слово для понятия, у которого в тексте два или три имени, и замени остальные.

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

## G-12 · без дат и «сейчас»

**Вопрос.** Есть ли в тексте то, что устареет: годы, версии «на сегодня», слова «недавно» и «новый»?

**Правка.** Замени привязку ко времени на условие («если в инструменте есть …») или вынеси старый способ в отдельную строку «раньше делали так».

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

## G-13 · ядро сверху, редкое по условию

**Вопрос.** То, что нужно в каждом запуске, стоит в начале? Редкие случаи отделены и помечены условием, когда их читать?

**Правка.** Перенеси один редкий случай в конец под строку «читай, если …» или подними наверх то, что нужно всегда.

Источник: [agentskills.io · Specification](https://agentskills.io/specification) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

## G-14 · одна работа на skill

**Вопрос.** Skill закрывает одну связную работу? Нет ли в нём второй задачи, которая включается по другому поводу?

**Правка.** Вынеси постороннюю задачу одной строкой «это делает другой skill» или убери её.

Источник: [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [OpenAI Codex · Build skills](https://developers.openai.com/codex/skills)

## G-15 · три проверочные задачи

**Вопрос.** Есть ли в skill две-три короткие задачи, на которых его можно проверить, включая случай, когда он включаться не должен?

**Правка.** Добавь или уточни одну проверочную задачу: запрос человека и признаки хорошего результата.

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills) · [agentskills.io · Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions)

## G-16 · объясни зачем

**Вопрос.** У важных требований названа причина, или текст держится на «всегда», «обязательно» и заглавных буквах?

**Правка.** Замени одно голое требование на требование с причиной: что сломается, если его нарушить.

Источник: [anthropics/skills · skill-creator (Apache-2.0)](https://github.com/anthropics/skills/tree/main/skills/skill-creator) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)

## R-01 · параметры общие, личное остаётся дома

**Вопрос.** Всё, что у разных людей разное (язык, объём, читатель, папка, инструмент), вынесено в параметры с умолчаниями? В тексте нет имён, компаний, адресов и чужих данных?

**Правка.** Вынеси одно зашитое значение в параметр с умолчанием. Свои значения держи у себя в params.md рядом с копией skill: в эстафету они не возвращаются.

Источник: правило эстафеты

## гайды

- Anthropic · Skill authoring best practices – https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- Anthropic · Agent Skills overview – https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- Claude Code · Extend Claude with skills – https://code.claude.com/docs/en/skills
- agentskills.io · Specification – https://agentskills.io/specification
- agentskills.io · Best practices for skill creators – https://agentskills.io/skill-creation/best-practices
- agentskills.io · Optimizing skill descriptions – https://agentskills.io/skill-creation/optimizing-descriptions
- agentskills.io · Evaluating skill output quality – https://agentskills.io/skill-creation/evaluating-skills
- agentskills.io · Using scripts in skills – https://agentskills.io/skill-creation/using-scripts
- OpenAI Codex · Build skills – https://developers.openai.com/codex/skills
- anthropics/skills · skill-creator (Apache-2.0) – https://github.com/anthropics/skills/tree/main/skills/skill-creator
- obra/superpowers · writing-skills (MIT) – https://github.com/obra/superpowers/tree/main/skills/writing-skills

## библиотеки skills

- anthropics/skills – https://github.com/anthropics/skills · эталонные skills: документы, skill-creator
- anthropics/knowledge-work-plugins – https://github.com/anthropics/knowledge-work-plugins · skills для нетехнической работы
- openai/skills – https://github.com/openai/skills · каталог Codex, папка .curated
- obra/superpowers – https://github.com/obra/superpowers · методика: планы, отладка, проверка перед сдачей
- K-Dense-AI/scientific-agent-skills – https://github.com/K-Dense-AI/scientific-agent-skills · исследования и анализ данных с проверками
- mvanhorn/last30days-skill – https://github.com/mvanhorn/last30days-skill · исследование темы по свежим источникам
- skills.sh – https://www.skills.sh/ · каталог с числом установок

Скачано и сверено 2026-11-16. Оригиналы для чтения агентом: `python3 relay.py guides` кладёт их в `guides/raw/`.
