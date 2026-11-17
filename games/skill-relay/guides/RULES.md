# одно изменение: виды и правила

Книга эстафеты. Участник берёт skill, вносит одно изменение по одному правилу и коммитит его за пять минут: в дорожке лежит новая версия.
Собрано из гайдов, формулировки свои, первоисточники ниже. Файл собирается командой `python3 relay.py rules` из `rules.json`.

| вид изменения | что это | правила |
|---|---|---|
| добавить протокол | Порядок действий: шаг с входом и выходом, чек-лист, остановка перед шагом с последствиями. | G-03, G-05, G-09, G-18 |
| добавить логику | Условие и ветка: умолчание с условием замены, редкий случай под «читай, если», параметр с умолчанием. | G-04, G-12, G-13, R-01 |
| добавить границу | Когда skill брать и когда оставить: описание, строка «не бери, если», одна работа на skill. | G-01, G-14, G-17 |
| добавить пример | Образец результата: пример «вход → выход» на выдуманных данных или шаблон вывода. | G-06, G-07 |
| добавить граблю | Ошибка из живой примерки и причина требования: что сломалось и как надо. | G-08, G-16 |
| добавить проверку | Способ понять, что получилось: проверка с ответом «сошлось или нет», проверочная задача. | G-10, G-15 |
| убрать лишнее | Меньше текста при том же смысле: убрать известное агенту, оставить одно слово на понятие. | G-02, G-11 |

# пять принципов изменения skill

- **одно изменение за раз.** Если за круг меняется одно, видно, что именно помогло или сломало. Два изменения сразу нельзя ни оценить, ни откатить по отдельности. В игре: один коммит несёт одно изменение по одному правилу, до 12 строк.
- **дописывать поверх.** Когда инструкцию каждый раз переписывают целиком, детали стираются: авторы ACE называют это схлопыванием контекста. Точечные добавки сохраняют накопленное. В игре: остальной текст skill остаётся нетронутым, разбор проверяет «остальное цело».
- **изменение растёт из наблюдения.** Правка, выведенная из следа реального прогона, точнее правки по догадке: GEPA и текстовые градиенты строят изменение из разбора ошибок. В игре: разбор показывает три места, где skill слабее всего; грабля пишется из живой примерки.
- **оставить или откатить.** Новая версия остаётся, только если на тех же задачах стало лучше. Если хуже, возвращается прошлая принятая версия. В игре: проверка текста и разбор перед коммитом; каждая версия лежит в логе, прошлую можно взять обратно.
- **версии и защищённое ядро.** У skill есть части, которые изменение не трогает: что он делает и для чего. Каждая принятая правка становится новой версией с записью, кто и зачем. В игре: имя и раздел параметров не меняются; у дорожки лента версий с автором и агентом.

# где правило лежит в SKILL.md

| часть файла | что в ней | правила |
|---|---|---|
| шапка | Агент видит её всегда и по ней решает, брать ли skill. | G-01, G-14 |
| параметры | Умолчания общие. Личные значения остаются у человека. | G-04, R-01 |
| шаги | Порядок работы: вход, действие, выход. | G-03, G-05, G-09, G-16, G-18 |
| формат | Как выглядит результат. | G-06 |
| пример | Один вход и один выход. | G-07 |
| грабли | Ошибки из живых прогонов. | G-08 |
| проверка | Сверка результата и проверочные задачи. | G-10, G-15 |
| границы | Чего skill не делает и что делать, когда не получилось. | G-17 |
| весь текст | Правила, которые чистят skill целиком. | G-02, G-11, G-12, G-13 |

# добавить протокол

Порядок действий: шаг с входом и выходом, чек-лист, остановка перед шагом с последствиями.

## G-03 · строгость по хрупкости

**Просто.** Строго там, где легко сломать. Свободно там, где есть выбор.

**Вопрос.** Хрупкие места (где ошибка стоит дорого или порядок важен) заданы точной последовательностью? Гибкие места оставляют агенту выбор?

**Изменение.** Найди одно место, где строгость не совпадает с хрупкостью: закрепи порядок там, где он важен, или сними лишний жёсткий запрет там, где годятся разные пути.

**Практика.** Гайд Anthropic называет это степенью свободы: на узком мосту нужны точные шаги, в открытом поле хватает направления.

```
было:  Обнови таблицу как удобно.
стало: Запусти ровно: python scripts/update.py --dry-run
стало: Флаги не меняй: без --dry-run строки перезапишутся.
```

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)

## G-05 · шаги с явным входом и выходом

**Просто.** Каждый шаг: что взять, что сделать, что получится.

**Вопрос.** Skill учит, как подходить к классу задач, повелительными шагами? У каждого шага понятно, что он берёт и что оставляет следующему?

**Изменение.** Перепиши одно расплывчатое место в шаг: глагол, над чем работает, что получается на выходе.

**Практика.** Skill хранит процедуру: порядок действий, который агент повторит на новой задаче. Описание без шагов агент пересказывает и пропускает.

```
было:  2. Обработай данные.
стало: 2. Вход: таблица из шага 1. Убери пустые строки и дубли.
стало:    Выход: чистая таблица и число убранных строк.
```

Источник: [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [OpenAI Codex · Build skills](https://developers.openai.com/codex/skills)

## G-09 · чек-лист для длинной работы

**Просто.** Длинную работу веди по списку с отметками.

**Вопрос.** Если в работе больше пяти шагов или есть зависимости между ними, может ли агент отмечать пройденное и не пропустить шаг?

**Изменение.** Собери шаги в чек-лист с отметками и поставь строку «не переходи дальше, пока не отмечено».

**Практика.** Чек-лист держит агента на длинной работе: видно, что пройдено, и есть куда вернуться.

```
было:  1. Собери источники. 2. Сверь даты. 3. Напиши отчёт.
стало: - [ ] 1. Собери источники
стало: - [ ] 2. Сверь даты
стало: - [ ] 3. Напиши отчёт
стало: Ставь [x] и иди дальше, только когда шаг закрыт.
```

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)

## G-18 · шаг с последствиями ждёт слова человека

**Просто.** Перед шагом с последствиями агент спрашивает человека.

**Вопрос.** Есть ли в skill шаги, которые отправляют, удаляют, платят или меняют что-то за пределами рабочей папки? Перед каждым таким шагом стоит остановка и вопрос человеку?

**Изменение.** Пометь один шаг с последствиями: что агент показывает человеку и какого слова ждёт. Права на инструменты называй узко: команда и её рамка.

**Практика.** Claude Code даёт таким skills ручной запуск (disable-model-invocation) и узкие права в allowed-tools, Codex отключает неявный запуск через allow_implicit_invocation. Обзор Snyk 10 000 популярных skills: больше 64% подталкивают агента к небезопасным действиям.

```
было:  5. Отправь письмо заказчику.
стало: 5. Покажи черновик письма. Отправляй после слова «отправляй».
```

Источник: [Claude Code · Extend Claude with skills](https://code.claude.com/docs/en/skills) · [OpenAI Codex · Build skills](https://developers.openai.com/codex/skills) · [Snyk · Re-Assessing the Security of the Agent Skill Ecosystem](https://research.snyk.io/blog/skill-analysis/)

# добавить логику

Условие и ветка: умолчание с условием замены, редкий случай под «читай, если», параметр с умолчанием.

## G-04 · умолчание вместо меню

**Просто.** Назови один вариант по умолчанию.

**Вопрос.** Где skill предлагает несколько равных вариантов инструмента или подхода и оставляет выбор без опоры?

**Изменение.** Назови один вариант по умолчанию и одной фразой условие, при котором берётся другой.

**Практика.** Перечень равных вариантов заставляет агента выбирать наугад. Гайды дают один путь по умолчанию и короткое условие для запасного.

```
было:  Формат: список, таблица или абзац, как лучше.
стало: Формат по умолчанию: список до пяти пунктов. Таблица, только если сравниваются три варианта и больше.
```

Источник: [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

## G-12 · без дат и «сейчас»

**Просто.** Убери даты и слово «сейчас»: текст перестаёт устаревать.

**Вопрос.** Есть ли в тексте то, что устареет: годы, версии «на сегодня», слова «недавно» и «новый»?

**Изменение.** Замени привязку ко времени на условие («если в инструменте есть …») или вынеси старый способ в отдельную строку «раньше делали так».

**Практика.** Привязка ко времени устаревает молча. Старый способ гайд держит отдельным блоком «раньше делали так».

```
было:  Сейчас лучше работает новая версия API, старая отключена с весны.
стало: Версия API стоит в разделе «параметры». Прежний способ описан в references/old.md.
```

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

## G-13 · ядро сверху, редкое по условию

**Просто.** Главное наверху. Редкое внизу и по условию.

**Вопрос.** То, что нужно в каждом запуске, стоит в начале? Редкие случаи отделены и помечены условием, когда их читать?

**Изменение.** Перенеси один редкий случай в конец под строку «читай, если …» или подними наверх то, что нужно всегда.

**Практика.** Тело skill грузится целиком при включении. Гайды держат его до 500 строк и около 5000 токенов, редкое выносят в файлы, которые агент открывает по условию.

```
было:  Сорок строк про редкий формат файла стоят посреди шагов.
стало: Файл в редком формате: открой references/formats.md.
стало: В теле остаётся ядро, которое нужно в каждом запуске.
```

Источник: [agentskills.io · Specification](https://agentskills.io/specification) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

## R-01 · параметры общие, личное остаётся дома

**Просто.** Своё значение делай параметром. Личное держи у себя.

**Вопрос.** Всё, что у разных людей разное (язык, объём, читатель, папка, инструмент), вынесено в параметры с умолчаниями? В тексте нет имён, компаний, адресов и чужих данных?

**Изменение.** Вынеси одно зашитое значение в параметр с умолчанием. Свои значения держи у себя в params.md рядом с копией skill: в эстафету они не возвращаются.

**Практика.** Стандарт skills переносим между харнессами. Общий текст с параметрами работает у следующего бегуна, зашитые значения ломаются на первой чужой задаче и выносят личное наружу.

```
было:  Пиши в моём стиле, как в отчёте для отдела на прошлой неделе.
стало: ## параметры
стало: тон: деловой (умолчание). Свои значения лежат в params.md рядом со skill.
```

Источник: правило эстафеты · [Anthropic · The complete guide to building Skills for Claude](https://claude.com/resources/guides/the-complete-guide-to-building-skills-for-claude)

# добавить границу

Когда skill брать и когда оставить: описание, строка «не бери, если», одна работа на skill.

## G-01 · описание отвечает «что делает» и «когда брать»

**Просто.** Первая строка говорит, что skill делает и когда его брать.

**Вопрос.** По одной строке description агент решает, брать ли skill. В ней названо, что skill делает, и ситуации или слова человека, на которых он нужен? Она написана в третьем лице?

**Изменение.** Перепиши description: сначала действие и результат, затем «Бери, когда …» с двумя-тремя живыми формулировками запроса. Без «я помогу» и «ты можешь».

**Практика.** В общем списке агент видит только name и description и по ним решает, брать ли skill. Стандарт даёт описанию до 1024 знаков, Claude Code обрезает его в списке на 1536 знаках вместе с when_to_use: главный случай стоит первым.

```
было:  description: Помогает с текстами.
стало: description: Сжимает длинный текст в саммари под читателя. Бери, когда просят «коротко», «суть» или приносят расшифровку.
```

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions) · [Claude Code · Extend Claude with skills](https://code.claude.com/docs/en/skills) · [Anthropic · The complete guide to building Skills for Claude](https://claude.com/resources/guides/the-complete-guide-to-building-skills-for-claude)

## G-14 · одна работа на skill

**Просто.** Один skill делает одну работу.

**Вопрос.** Skill закрывает одну связную работу? Нет ли в нём второй задачи, которая включается по другому поводу?

**Изменение.** Вынеси постороннюю задачу одной строкой «это делает другой skill» или убери её.

**Практика.** SkillsBench: задачи с одним–тремя skills прибавляют 18–19 пунктов, с четырьмя и больше 10. Узкий skill точнее включается и реже спорит с соседями.

```
было:  description: Пишет саммари, переводит, правит опечатки и рассылает результат.
стало: description: Пишет саммари под читателя. Перевод и рассылка сюда не входят.
```

Источник: [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [OpenAI Codex · Build skills](https://developers.openai.com/codex/skills) · [SkillsBench · Benchmarking How Well Agent Skills Work (arXiv 2602.12670)](https://arxiv.org/abs/2602.12670)

## G-17 · границы и запасной ход

**Просто.** Напиши, когда skill не брать и что делать, если не вышло.

**Вопрос.** Сказано ли, на каких задачах этот skill брать не нужно? Есть ли простой путь на случай, когда основной порядок слишком тяжёл или нужного инструмента нет?

**Изменение.** Добавь строку «не бери, если …» с одним-двумя случаями и строку запасного хода: что делать, когда основной путь не подходит.

**Практика.** Разбор провалов в SkillsBench: skill вредит, когда навязывает тяжёлый порядок, вытесняет более сильный обычный ход или ведёт к инструменту, который агент не может отладить. Общая причина одна: единственный «правильный» путь без границ применимости и лёгкого запасного.

```
было:  (границ нет: агент додумывает сам)
стало: ## никогда
стало: - Не дописывай то, чего нет в тексте.
стало: Текст обрезан: скажи об этом и остановись.
```

Источник: [SkillsBench · Benchmarking How Well Agent Skills Work (arXiv 2602.12670)](https://arxiv.org/abs/2602.12670) · [Anthropic · The complete guide to building Skills for Claude](https://claude.com/resources/guides/the-complete-guide-to-building-skills-for-claude)

# добавить пример

Образец результата: пример «вход → выход» на выдуманных данных или шаблон вывода.

## G-06 · шаблон вывода

**Просто.** Покажи, как выглядит готовый результат.

**Вопрос.** Формат результата показан готовой заготовкой, которую агент заполняет, или описан словами?

**Изменение.** Добавь или уточни шаблон результата: заголовки, порядок блоков, что стоит в каждом.

**Практика.** Заготовку агент заполняет точнее, чем следует формату, описанному словами. Строгий шаблон нужен там, где результат читает программа или другой человек.

```
было:  Верни результат в удобном виде.
стало: О чём: одна фраза.
стало: Пункты: до пяти, у каждого опора на источник.
стало: Чего нет: одна строка.
```

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [anthropics/skills · skill-creator (Apache-2.0)](https://github.com/anthropics/skills/tree/main/skills/skill-creator)

## G-07 · пример «вход → выход»

**Просто.** Добавь один пример: вход и готовый выход.

**Вопрос.** Есть ли хотя бы один конкретный пример: короткий вход и то, что из него должно получиться?

**Изменение.** Добавь один пример на 4–8 строк на выдуманных данных. Он должен показывать трудное место, которое шагами описать сложно.

**Практика.** Пара «вход → выход» задаёт стиль и глубину точнее описания. Примеры пишутся на выдуманных данных.

```
было:  (раздела с примером нет)
стало: ## пример
стало: Вход: расшифровка встречи на 40 минут.
стало: Выход: «О чём: команда переносит запуск на две недели».
```

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [anthropics/skills · skill-creator (Apache-2.0)](https://github.com/anthropics/skills/tree/main/skills/skill-creator)

# добавить граблю

Ошибка из живой примерки и причина требования: что сломалось и как надо.

## G-08 · грабли из живого прогона

**Просто.** Запиши ошибку, на которую наступил сам.

**Вопрос.** Есть ли раздел с конкретными ошибками, которые агент делает без подсказки? Пришла ли хоть одна из них из настоящего запуска?

**Изменение.** Примерь skill на своём входе. Ошибку, которую пришлось исправлять руками, запиши одной строкой в «грабли»: что агент сделал и как надо.

**Практика.** Гайд agentskills.io называет раздел с граблями самым ценным в skill: это поправки к ошибкам, которые агент делает без подсказки. Запись появляется сразу после живой ошибки.

```
было:  (раздела с граблями нет)
стало: ## грабли
стало: - Из таблицы на девять строк в саммари попало шесть. Сверяй число строк на входе и на выходе.
```

Источник: [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [Anthropic · The complete guide to building Skills for Claude](https://claude.com/resources/guides/the-complete-guide-to-building-skills-for-claude)

## G-16 · объясни зачем

**Просто.** К требованию добавь причину.

**Вопрос.** У важных требований названа причина, или текст держится на «всегда», «обязательно» и заглавных буквах?

**Изменение.** Замени одно голое требование на требование с причиной: что сломается, если его нарушить.

**Практика.** skill-creator: причина работает сильнее нажима. Требование с объяснением модель переносит на новый случай, голое «всегда» выполняет буквально.

```
было:  ВСЕГДА читай текст до конца!!!
стало: Прочитай текст до конца: выводы часто стоят в последней трети.
```

Источник: [anthropics/skills · skill-creator (Apache-2.0)](https://github.com/anthropics/skills/tree/main/skills/skill-creator) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)

# добавить проверку

Способ понять, что получилось: проверка с ответом «сошлось или нет», проверочная задача.

## G-10 · петля проверки

**Просто.** Проверь результат. Не сошлось: исправь и проверь снова.

**Вопрос.** После работы агент сверяет результат с чем-то проверяемым и возвращается чинить, если сверка не сошлась? Перед необратимым шагом есть план и его проверка?

**Изменение.** Добавь одну проверку с понятным «сошлось или нет» и строку «если нет: исправь и проверь снова».

**Практика.** Петля «сделал, проверил, исправил» в гайде Anthropic названа главным способом поднять качество. Проверка отвечает «сошлось» или «нет».

```
было:  Отдай результат.
стало: Сверь число пунктов с источником. Не сошлось: исправь и сверь заново. Сошлось: отдай.
```

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)

## G-15 · три проверочные задачи

**Просто.** Три задачи, на которых видно, работает ли skill.

**Вопрос.** Есть ли в skill две-три короткие задачи, на которых его можно проверить, включая случай, когда он включаться не должен?

**Изменение.** Добавь или уточни одну проверочную задачу: запрос человека и признаки хорошего результата.

**Практика.** Гайд Anthropic: 10–20 запросов на включение с целью 90% срабатываний и запросы, на которых skill молчит. В SkillsBench skill, написанный агентом и оставленный без проверки, дал минус 8–11 пунктов к работе без skill.

```
было:  (проверочных задач нет)
стало: ## проверочные задачи
стало: 1. «Сожми статью в пять пунктов» → пять пунктов с опорой.
стало: 2. «Что решили?», а решений в тексте нет → сказано, что решений нет.
стало: 3. «Переведи текст» → skill не включается.
```

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills) · [agentskills.io · Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions) · [Anthropic · The complete guide to building Skills for Claude](https://claude.com/resources/guides/the-complete-guide-to-building-skills-for-claude) · [SkillsBench · Benchmarking How Well Agent Skills Work (arXiv 2602.12670)](https://arxiv.org/abs/2602.12670)

# убрать лишнее

Меньше текста при том же смысле: убрать известное агенту, оставить одно слово на понятие.

## G-02 · только то, чего агент не знает

**Просто.** Убери то, что агент знает сам. Оставь то, что знаешь только ты.

**Вопрос.** Каждая строка проходит вопрос «ошибётся ли агент без этой инструкции»? Есть ли объяснения общеизвестного и повторы?

**Изменение.** Убери или сожми строки, без которых агент справится. Освободившееся место отдай тому, что знает только автор: соглашения, порядок, тонкие случаи.

**Практика.** Замер SkillsBench на 87 задачах: компактные skills прибавляют 19 пунктов к доле решённых задач, исчерпывающая документация 0,7 пункта.

```
было:  Саммари это краткое изложение текста. Сначала внимательно прочитай текст.
стало: Пункт попадает в саммари, если без него читатель примет другое решение.
```

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [agentskills.io · Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) · [SkillsBench · Benchmarking How Well Agent Skills Work (arXiv 2602.12670)](https://arxiv.org/abs/2602.12670)

## G-11 · один термин на одно понятие

**Просто.** Одно понятие называется одним словом.

**Вопрос.** Одно и то же понятие названо одним словом по всему тексту?

**Изменение.** Выбери одно слово для понятия, у которого в тексте два или три имени, и замени остальные.

**Практика.** Разные слова для одного понятия агент читает как разные понятия.

```
было:  Собери саммари. Проверь выжимку. Отдай конспект.
стало: Собери саммари. Проверь саммари. Отдай саммари.
```

Источник: [Anthropic · Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

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
- Agentic Context Engineering · Evolving Contexts for Self-Improving Language Models (ICLR 2026) – https://arxiv.org/abs/2510.04618 · контекст как растущий плейбук: точечные добавки вместо переписывания, плюс 10,6% на агентных задачах
- GEPA · Reflective Prompt Evolution – https://gepa-ai.github.io/gepa/guides/ · изменение предлагается по следам прогона и остаётся, если на тех же примерах счёт вырос
- Automatic Prompt Optimization with «Gradient Descent» and Beam Search (EMNLP 2023) – https://aclanthology.org/2023.emnlp-main.494.pdf · ошибки на пачке примеров превращаются в описание изъяна, по нему делается правка
- Authoring Agent Skills: A Software-Engineering Approach (arXiv 2607.25032) – https://arxiv.org/html/2607.25032v1 · сначала проверочные задачи и замер без skill, затем минимум инструкций; два экземпляра модели: один пишет, второй проверяет с чистого листа
- agent-skills-creator · evaluation and iteration – https://github.com/mblode/agent-skills/blob/main/skills/agent-skills-creator/references/evaluation-and-iteration.md · цикл улучшения: одна правка за круг, иначе регресс нельзя приписать; правка остаётся, только если выросли обе выборки
- Skill-V · Verifiable Self-Evolving Skill Library (arXiv 2610.11781) – https://arxiv.org/html/2610.11781 · skill как проверяемый контракт: правка не должна ухудшать согласие с накопленными прогонами, принятая становится новой версией
- SelfEvoSkill · Paired Execution Audits for Skill Revision (arXiv 2606.14239) – https://arxiv.org/html/2606.14239 · парный прогон со skill и без; вердикт «навредил» отклоняет кандидата и возвращает последнюю принятую версию
- Dynamic Agent Skills · A Lifecycle Survey and Taxonomy of Evolving Skill Libraries (arXiv 2607.10113) – https://arxiv.org/html/2607.10113v1 · обзор жизненного цикла библиотек skills и набор операций над ними: добавить, уточнить, слить, разделить, сократить

## библиотеки skills

- anthropics/skills – https://github.com/anthropics/skills · эталонные skills: документы, skill-creator
- anthropics/knowledge-work-plugins – https://github.com/anthropics/knowledge-work-plugins · skills для нетехнической работы
- openai/skills – https://github.com/openai/skills · каталог Codex, папка .curated
- obra/superpowers – https://github.com/obra/superpowers · методика: планы, отладка, проверка перед сдачей
- K-Dense-AI/scientific-agent-skills – https://github.com/K-Dense-AI/scientific-agent-skills · исследования и анализ данных с проверками
- mvanhorn/last30days-skill – https://github.com/mvanhorn/last30days-skill · исследование темы по свежим источникам
- skills.sh – https://www.skills.sh/ · каталог с числом установок

Скачано и сверено 2026-11-17. Оригиналы для чтения агентом: `python3 relay.py guides` кладёт их в `guides/raw/`.
