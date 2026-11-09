---
id: types
type: ontology
---
# онтология · типы

Онтология – договор о том, какие вещи живут в папке и как они связаны. Тип в имени файла, `id` и `type` во frontmatter, связи – ссылки `[[...]]` в полях. Граф рисует именно их.

| тип | папка | поля | доступ | пример |
|---|---|---|---|---|
| `self` | корень | – | T1 | [[self]] |
| `identity` | `context/` | parent, updated | T0 | [[{identity} about me]] – публичная половина self |
| `context` | `context/` | parent | T1 | [[{context} how-i-decide]] |
| `person` | `people/` | role, project, avatar, access | T0–T3 | [[{person} Nina]] · [[{person} Dasha Voronkina]] |
| `project` | `projects/` | status, owner, until | T1 | [[{project} lab project]] · [[{project} F26 lab]] |
| `decision` | `decisions/` | date, project, from_meeting, status | T1 | [[{decision} one procurement system – 2026-11-04]] |
| `meeting` | `meetings/` | date, with, project, source | T1–T2 | [[{meeting} supplier Nina – 2026-11-06]] |
| `note` | `notes/` | about | T1 | [[{note} week 47 – 2026-11-20]] |
| `index` | `notes/` | – | T1 | [[{index} F26 people – 2026-11-09]] · [[{note} inventory – 2026-11-09]] |
| `raw` | `raw/` | source, private | T1–T3 | [[{raw} cv]] |
| `session` | `sessions/` | runner, touched | T1 | след: что агент сделал и какие файлы тронул |
| `corpus` | вне папки | – | T3–T4 | глубокий личный пакет: дневник, терапия, здоровье. В папку агента не кладётся, в описи – только указатель |

Откуда берётся каждый тип – [[{ontology} context sources]]. Кому что видно – [[{ontology} access levels]].

## происхождение
У каждого файла, который написал агент: `created_by` (кто попросил), `generated_by` (кто написал), `human_verified` (я прочитал эту версию). Правка агентом снова ставит `human_verified: false`.

## как растёт
Неделя 1 – люди, проекты, решения, встречи и люди лабы. Неделя 2 – скиллы пишут сущности сами. Неделя 4 – точка входа читает их срезом. Новый тип – строка в этой таблице, потом файлы.

## у ведущего лабы
Личный контекст Алекса разложен на шесть типов: `{identity}` – публичное «кто я» · `{context}` – карточка для агента: источник, сигнал, запрос, уровень доступа · `{source}` – указатель на сырьё: файл, расшифровка, чат · `{corpus}` – плотный личный пакет с происхождением · `{index}` – карта: где что лежит и каких ссылок не хватает · `{trace}` – след: что изменилось и что спросить дальше. Эта папка берёт у него `identity`, `index` и след через `sessions/`; `corpus` остаётся вне папки агента.
