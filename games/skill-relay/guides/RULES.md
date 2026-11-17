# правила развития skills

Книга эстафеты: по одному правилу на передачу. Собрано из гайдов, формулировки свои, первоисточники ниже.
Файл собирается командой `python3 relay.py rules` из `rules.json`.

## G-01 · описание отвечает «что делает» и «когда брать»

**Вопрос.** По одной строке description агент решает, брать ли skill. В ней названо, что skill делает, и ситуации или слова человека, на которых он нужен? Она написана в третьем лице?

**Правка.** Перепиши description: сначала действие и результат, затем «Бери, когда …» с двумя-тремя живыми формулировками запроса. Без «я помогу» и «ты можешь».

**Практика.** В общем списке агент видит только name и description и по ним решает, брать ли skill. Стандарт даёт описанию до 1024 знаков, Claude Code обрезает его в списке на 1536 знаках вместе с when_to_use: главный случай стоит первым.

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions) · [Claude Code · Extend Claude with skills](https://code.claude.com/docs/en/skills) · [Anthropic · The complete guide to building Skills for Claude](https://claude.com/resources/guides/the-complete-guide-to-building-skills-for-claude)

## G-02 · только то, чего агент не знает

**Вопрос.** Каждая строка проходит вопрос «ошибётся ли агент без этой инструкции»? Есть ли объяснения общеизвестного и повторы?

**Правка.** Убери или сожми строки, без которых агент справится. Освободившееся место отдай тому, что знает только автор: соглашения, порядок, тонкие случаи.

**Практика.** Замер SkillsBench на 87 задачах: компактные skills прибавляют 19 пунктов к доле решённых задач, исчерпывающая документация 0,7 пункта.

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [SkillsBench · Benchmarking How Well Agent Skills Work (arXiv 2602.12670)](https://arxiv.org/abs/2602.12670)

## G-03 · строгость по хрупкости

**Вопрос.** Хрупкие места (где ошибка стоит дорого или порядок важен) заданы точной последовательностью? Гибкие места оставляют агенту выбор?

**Правка.** Найди одно место, где строгость не совпадает с хрупкостью: закрепи порядок там, где он важен, или сними лишний жёсткий запрет там, где годятся разные пути.

**Практика.** Гайд Anthropic называет это степенью свободы: на узком мосту нужны точные шаги, в открытом поле хватает направления.

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)

## G-04 · умолчание вместо меню

**Вопрос.** Где skill предлагает несколько равных вариантов инструмента или подхода и оставляет выбор без опоры?

**Правка.** Назови один вариант по умолчанию и одной фразой условие, при котором берётся другой.

**Практика.** Перечень равных вариантов заставляет агента выбирать наугад. Гайды дают один путь по умолчанию и короткое условие для запасного.

Источник: [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

## G-05 · шаги с явным входом и выходом

**Вопрос.** Skill учит, как подходить к классу задач, повелительными шагами? У каждого шага понятно, что он берёт и что оставляет следующему?

**Правка.** Перепиши одно расплывчатое место в шаг: глагол, над чем работает, что получается на выходе.

**Практика.** Skill хранит процедуру: порядок действий, который агент повторит на новой задаче. Описание без шагов агент пересказывает и пропускает.

Источник: [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [OpenAI Codex · Build skills](https://developers.openai.com/codex/skills)

## G-06 · шаблон вывода

**Вопрос.** Формат результата показан готовой заготовкой, которую агент заполняет, или описан словами?

**Правка.** Добавь или уточни шаблон результата: заголовки, порядок блоков, что стоит в каждом.

**Практика.** Заготовку агент заполняет точнее, чем следует формату, описанному словами. Строгий шаблон нужен там, где результат читает программа или другой человек.

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [anthropics/skills · skill-creator (Apache-2.0)](https://github.com/anthropics/skills/tree/main/skills/skill-creator)

## G-07 · пример «вход → выход»

**Вопрос.** Есть ли хотя бы один конкретный пример: короткий вход и то, что из него должно получиться?

**Правка.** Добавь один пример на 4–8 строк на выдуманных данных. Он должен показывать трудное место, которое шагами описать сложно.

**Практика.** Пара «вход → выход» задаёт стиль и глубину точнее описания. Примеры пишутся на выдуманных данных.

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [anthropics/skills · skill-creator (Apache-2.0)](https://github.com/anthropics/skills/tree/main/skills/skill-creator)

## G-08 · грабли из живого прогона

**Вопрос.** Есть ли раздел с конкретными ошибками, которые агент делает без подсказки? Пришла ли хоть одна из них из настоящего запуска?

**Правка.** Примерь skill на своём входе. Ошибку, которую пришлось исправлять руками, запиши одной строкой в «грабли»: что агент сделал и как надо.

**Практика.** Гайд agentskills.io называет раздел с граблями самым ценным в skill: это поправки к ошибкам, которые агент делает без подсказки. Запись появляется сразу после живой ошибки.

Источник: [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [Anthropic · The complete guide to building Skills for Claude](https://claude.com/resources/guides/the-complete-guide-to-building-skills-for-claude)

## G-09 · чек-лист для длинной работы

**Вопрос.** Если в работе больше пяти шагов или есть зависимости между ними, может ли агент отмечать пройденное и не пропустить шаг?

**Правка.** Собери шаги в чек-лист с отметками и поставь строку «не переходи дальше, пока не отмечено».

**Практика.** Чек-лист держит агента на длинной работе: видно, что пройдено, и есть куда вернуться.

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)

## G-10 · петля проверки

**Вопрос.** После работы агент сверяет результат с чем-то проверяемым и возвращается чинить, если сверка не сошлась? Перед необратимым шагом есть план и его проверка?

**Правка.** Добавь одну проверку с понятным «сошлось или нет» и строку «если нет: исправь и проверь снова».

**Практика.** Петля «сделал, проверил, исправил» в гайде Anthropic названа главным способом поднять качество. Проверка отвечает «сошлось» или «нет».

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)

## G-11 · один термин на одно понятие

**Вопрос.** Одно и то же понятие названо одним словом по всему тексту?

**Правка.** Выбери одно слово для понятия, у которого в тексте два или три имени, и замени остальные.

**Практика.** Разные слова для одного понятия агент читает как разные понятия.

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

## G-12 · без дат и «сейчас»

**Вопрос.** Есть ли в тексте то, что устареет: годы, версии «на сегодня», слова «недавно» и «новый»?

**Правка.** Замени привязку ко времени на условие («если в инструменте есть …») или вынеси старый способ в отдельную строку «раньше делали так».

**Практика.** Привязка ко времени устаревает молча. Старый способ гайд держит отдельным блоком «раньше делали так».

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

## G-13 · ядро сверху, редкое по условию

**Вопрос.** То, что нужно в каждом запуске, стоит в начале? Редкие случаи отделены и помечены условием, когда их читать?

**Правка.** Перенеси один редкий случай в конец под строку «читай, если …» или подними наверх то, что нужно всегда.

**Практика.** Тело skill грузится целиком при включении. Гайды держат его до 500 строк и около 5000 токенов, редкое выносят в файлы, которые агент открывает по условию.

Источник: [agentskills.io · Specification](https://agentskills.io/specification) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

## G-14 · одна работа на skill

**Вопрос.** Skill закрывает одну связную работу? Нет ли в нём второй задачи, которая включается по другому поводу?

**Правка.** Вынеси постороннюю задачу одной строкой «это делает другой skill» или убери её.

**Практика.** SkillsBench: задачи с одним–тремя skills прибавляют 18–19 пунктов, с четырьмя и больше 10. Узкий skill точнее включается и реже спорит с соседями.

Источник: [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [OpenAI Codex · Build skills](https://developers.openai.com/codex/skills) · [SkillsBench · Benchmarking How Well Agent Skills Work (arXiv 2602.12670)](https://arxiv.org/abs/2602.12670)

## G-15 · три проверочные задачи

**Вопрос.** Есть ли в skill две-три короткие задачи, на которых его можно проверить, включая случай, когда он включаться не должен?

**Правка.** Добавь или уточни одну проверочную задачу: запрос человека и признаки хорошего результата.

**Практика.** Гайд Anthropic: 10–20 запросов на включение с целью 90% срабатываний и запросы, на которых skill молчит. В SkillsBench skill, написанный агентом и оставленный без проверки, дал минус 8–11 пунктов к работе без skill.

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills) · [agentskills.io · Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions) · [Anthropic · The complete guide to building Skills for Claude](https://claude.com/resources/guides/the-complete-guide-to-building-skills-for-claude) · [SkillsBench · Benchmarking How Well Agent Skills Work (arXiv 2602.12670)](https://arxiv.org/abs/2602.12670)

## G-16 · объясни зачем

**Вопрос.** У важных требований названа причина, или текст держится на «всегда», «обязательно» и заглавных буквах?

**Правка.** Замени одно голое требование на требование с причиной: что сломается, если его нарушить.

**Практика.** skill-creator: причина работает сильнее нажима. Требование с объяснением модель переносит на новый случай, голое «всегда» выполняет буквально.

Источник: [anthropics/skills · skill-creator (Apache-2.0)](https://github.com/anthropics/skills/tree/main/skills/skill-creator) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)

## G-17 · границы и запасной ход

**Вопрос.** Сказано ли, на каких задачах этот skill брать не нужно? Есть ли простой путь на случай, когда основной порядок слишком тяжёл или нужного инструмента нет?

**Правка.** Добавь строку «не бери, если …» с одним-двумя случаями и строку запасного хода: что делать, когда основной путь не подходит.

**Практика.** Разбор провалов в SkillsBench: skill вредит, когда навязывает тяжёлый порядок, вытесняет более сильный обычный ход или ведёт к инструменту, который агент не может отладить. Общая причина одна: единственный «правильный» путь без границ применимости и лёгкого запасного.

Источник: [SkillsBench · Benchmarking How Well Agent Skills Work (arXiv 2602.12670)](https://arxiv.org/abs/2602.12670) · [Anthropic · The complete guide to building Skills for Claude](https://claude.com/resources/guides/the-complete-guide-to-building-skills-for-claude)

## G-18 · шаг с последствиями ждёт слова человека

**Вопрос.** Есть ли в skill шаги, которые отправляют, удаляют, платят или меняют что-то за пределами рабочей папки? Перед каждым таким шагом стоит остановка и вопрос человеку?

**Правка.** Пометь один шаг с последствиями: что агент показывает человеку и какого слова ждёт. Права на инструменты называй узко: команда и её рамка.

**Практика.** Claude Code даёт таким skills ручной запуск (disable-model-invocation) и узкие права в allowed-tools, Codex отключает неявный запуск через allow_implicit_invocation. Обзор Snyk 10 000 популярных skills: больше 64% подталкивают агента к небезопасным действиям.

Источник: [Claude Code · Extend Claude with skills](https://code.claude.com/docs/en/skills) · [OpenAI Codex · Build skills](https://developers.openai.com/codex/skills) · [Snyk · Re-Assessing the Security of the Agent Skill Ecosystem](https://research.snyk.io/blog/skill-analysis/)

## R-01 · параметры общие, личное остаётся дома

**Вопрос.** Всё, что у разных людей разное (язык, объём, читатель, папка, инструмент), вынесено в параметры с умолчаниями? В тексте нет имён, компаний, адресов и чужих данных?

**Правка.** Вынеси одно зашитое значение в параметр с умолчанием. Свои значения держи у себя в params.md рядом с копией skill: в эстафету они не возвращаются.

**Практика.** Стандарт skills переносим между харнессами. Общий текст с параметрами работает у следующего бегуна, зашитые значения ломаются на первой чужой задаче и выносят личное наружу.

Источник: правило эстафеты · [Anthropic · The complete guide to building Skills for Claude](https://claude.com/resources/guides/the-complete-guide-to-building-skills-for-claude)

# настройка skill в харнессе

## S-01 · где лежит skill

Папка с файлом SKILL.md. Claude Code: ~/.claude/skills/<имя>/ у человека и .claude/skills/<имя>/ в проекте. Codex: ~/.agents/skills/<имя>/ у человека и .agents/skills/<имя>/ в репозитории. В чате без папок текст кладётся в инструкции проекта.

Источник: [Claude Code · Extend Claude with skills](https://code.claude.com/docs/en/skills) · [OpenAI Codex · Build skills](https://developers.openai.com/codex/skills) · [agentskills.io · Specification](https://agentskills.io/specification)

## S-02 · шапка: name и description

Стандарт требует два поля. name: до 64 знаков, строчная латиница, цифры и дефис, совпадает с именем папки. description: до 1024 знаков, что делает skill и когда его брать. Незнакомые поля харнесс пропускает молча, поэтому имя поля сверяется с документацией.

Источник: [agentskills.io · Specification](https://agentskills.io/specification) · [Claude Code · Extend Claude with skills](https://code.claude.com/docs/en/skills)

## S-03 · бюджет описаний

Описания всех skills лежат в контексте постоянно. Claude Code отдаёт под этот список около 1% окна модели и обрезает одно описание на 1536 знаках. При переполнении первыми теряют описание skills, которые включаются реже всего. Главный случай ставится в первые слова.

Источник: [Claude Code · Extend Claude with skills](https://code.claude.com/docs/en/skills)

## S-04 · кто запускает

По умолчанию skill включает и человек, и агент. Для действий с последствиями ставится ручной запуск: disable-model-invocation: true в Claude Code, allow_implicit_invocation: false в agents/openai.yaml у Codex. Фоновое знание без команды: user-invocable: false.

Источник: [Claude Code · Extend Claude with skills](https://code.claude.com/docs/en/skills) · [OpenAI Codex · Build skills](https://developers.openai.com/codex/skills)

## S-05 · права на инструменты

allowed-tools разрешает перечисленные инструменты без вопроса на один ход. Запись сужается до команды: Bash(git status *) вместо Bash. Проектный skill из чужого репозитория читается до запуска: он сам выдаёт себе права.

Источник: [Claude Code · Extend Claude with skills](https://code.claude.com/docs/en/skills) · [agentskills.io · Specification](https://agentskills.io/specification)

## S-06 · три слоя загрузки

Имя и описание в контексте всегда, около 100 токенов. Тело SKILL.md грузится при включении: до 500 строк. Справочные файлы и скрипты рядом агент открывает по условию из текста, ссылки от SKILL.md идут на один уровень.

Источник: [agentskills.io · Specification](https://agentskills.io/specification) · [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [Anthropic · Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)

## S-07 · когда включается сам

paths в Claude Code ограничивает автозапуск файлами по шаблону. context: fork запускает skill в отдельном агенте без истории разговора: в тексте должно быть всё, что нужно для задачи.

Источник: [Claude Code · Extend Claude with skills](https://code.claude.com/docs/en/skills)

## S-08 · личные значения

Соглашение эстафеты: общий SKILL.md держит параметры с умолчаниями, значения под человека лежат в params.md рядом с его копией и в игру не возвращаются.

Источник: соглашение эстафеты

## S-09 · проверка перед тем, как отдать

Три вида проверки из гайда Anthropic: включается ли на 10–20 запросах, включая перефразированные и посторонние; даёт ли верный результат; что изменилось против работы без skill по числу ходов и токенов. Один и тот же запрос прогоняется 3–5 раз.

Источник: [Anthropic · The complete guide to building Skills for Claude](https://claude.com/resources/guides/the-complete-guide-to-building-skills-for-claude) · [agentskills.io · Evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills) · [agentskills.io · Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions)

## S-10 · чужой skill перед установкой

Прочитать целиком до установки: что skill читает, что запускает, куда отправляет и за что платит. Скрипты, закодированные блоки и команды «скачай и выполни» проверяются отдельно. Ключи и кошельки держатся вне досягаемости агента.

Источник: [Snyk · Re-Assessing the Security of the Agent Skill Ecosystem](https://research.snyk.io/blog/skill-analysis/) · [Agent Skills in the Wild · An Empirical Study of Security Vulnerabilities at Scale (arXiv 2601.10338)](https://arxiv.org/abs/2601.10338)

# что показывают замеры

## E-01 · skills дают прирост, когда их кто-то выверил

SkillsBench, 87 задач, 18 связок модели и харнесса: выверенные skills поднимают долю решённых задач с 33,9% до 50,5%. Skills, которые агент написал себе сам и никто не проверил, дают минус 8–11 пунктов к работе без skill.

Источник: [SkillsBench · Benchmarking How Well Agent Skills Work (arXiv 2602.12670)](https://arxiv.org/abs/2602.12670)

## E-02 · короткий и узкий сильнее подробного

Там же: компактные и обычной длины skills прибавляют 19 и 21,5 пункта, подробные 14,5, исчерпывающая документация 0,7. Один–три skills на задачу дают 18–19 пунктов, четыре и больше 10.

Источник: [SkillsBench · Benchmarking How Well Agent Skills Work (arXiv 2602.12670)](https://arxiv.org/abs/2602.12670)

## E-03 · почему skill вредит

Три повторяющихся случая: тяжёлый порядок там, где хватило бы простого хода; вытеснение более сильной обычной стратегии; инструмент, который агент не может отладить.

Источник: [SkillsBench · Benchmarking How Well Agent Skills Work (arXiv 2602.12670)](https://arxiv.org/abs/2602.12670)

## E-04 · общие библиотеки нужно читать

Snyk, ноябрь 2026, 10 000 самых популярных skills двух каталогов: больше 64% подталкивают к небезопасным действиям, 18 прямо вредоносны. Университетский замер 31 132 skills нашёл опасные шаблоны в 26,1%.

Источник: [Snyk · Re-Assessing the Security of the Agent Skill Ecosystem](https://research.snyk.io/blog/skill-analysis/) · [Agent Skills in the Wild · An Empirical Study of Security Vulnerabilities at Scale (arXiv 2601.10338)](https://arxiv.org/abs/2601.10338)

## гайды

- Anthropic · Skill authoring best practices – https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- Anthropic · Agent Skills overview – https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- Anthropic · The complete guide to building Skills for Claude – https://claude.com/resources/guides/the-complete-guide-to-building-skills-for-claude
- Claude Code · Extend Claude with skills – https://code.claude.com/docs/en/skills
- agentskills.io · Specification – https://agentskills.io/specification
- agentskills.io · Best practices for skill creators – https://agentskills.io/skill-creation/best-practices
- agentskills.io · Optimizing skill descriptions – https://agentskills.io/skill-creation/optimizing-descriptions
- agentskills.io · Evaluating skill output quality – https://agentskills.io/skill-creation/evaluating-skills
- agentskills.io · Using scripts in skills – https://agentskills.io/skill-creation/using-scripts
- OpenAI Codex · Build skills – https://developers.openai.com/codex/skills
- anthropics/skills · skill-creator (Apache-2.0) – https://github.com/anthropics/skills/tree/main/skills/skill-creator
- obra/superpowers · writing-skills (MIT) – https://github.com/obra/superpowers/tree/main/skills/writing-skills

## замеры и исследования

- SkillsBench · Benchmarking How Well Agent Skills Work (arXiv 2602.12670) – https://arxiv.org/abs/2602.12670 · 87 задач, 18 связок модели и харнесса, парное сравнение с skills и без
- Snyk · Re-Assessing the Security of the Agent Skill Ecosystem – https://research.snyk.io/blog/skill-analysis/ · 10 000 популярных skills двух каталогов, ноябрь 2026
- Agent Skills in the Wild · An Empirical Study of Security Vulnerabilities at Scale (arXiv 2601.10338) – https://arxiv.org/abs/2601.10338 · 31 132 skills, автоматический разбор шаблонов

## библиотеки skills

- anthropics/skills – https://github.com/anthropics/skills · эталонные skills: документы, skill-creator
- anthropics/knowledge-work-plugins – https://github.com/anthropics/knowledge-work-plugins · skills для нетехнической работы
- openai/skills – https://github.com/openai/skills · каталог Codex, папка .curated
- obra/superpowers – https://github.com/obra/superpowers · методика: планы, отладка, проверка перед сдачей
- K-Dense-AI/scientific-agent-skills – https://github.com/K-Dense-AI/scientific-agent-skills · исследования и анализ данных с проверками
- mvanhorn/last30days-skill – https://github.com/mvanhorn/last30days-skill · исследование темы по свежим источникам
- skills.sh – https://www.skills.sh/ · каталог с числом установок

Скачано и сверено 2026-11-17. Оригиналы для чтения агентом: `python3 relay.py guides` кладёт их в `guides/raw/`.
