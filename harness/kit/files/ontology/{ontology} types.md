---
id: types
type: ontology
---
# онтология · типы

Онтология – договор о том, какие вещи живут в папке и как они связаны. Тип в имени файла, `id` и `type` во frontmatter, связи – ссылки `[[...]]` в полях. Граф рисует именно их.

| тип | папка | поля | пример |
|---|---|---|---|
| `self` | корень | – | [[self]] |
| `person` | `people/` | role, with, last_seen | [[{person} Nina]] |
| `project` | `projects/` | status, owner, until | [[{project} lab project]] |
| `decision` | `decisions/` | date, project, from_meeting, status | [[{decision} one procurement system – 2026-11-04]] |
| `meeting` | `meetings/` | date, with, project, source | [[{meeting} supplier Nina – 2026-11-06]] |
| `note` | `notes/` | about | [[{note} inventory – 2026-11-09]] |
| `raw` | `raw/` | source, private | [[{raw} cv]] |
| `context` | `context/` | parent | [[{context} how-i-decide]] |

## происхождение
У каждого файла, который написал агент: `created_by` (кто попросил), `generated_by` (кто написал), `human_verified` (я прочитал эту версию). Правка агентом снова ставит `human_verified: false`.

## как растёт
Неделя 1 – люди, проекты, решения, встречи. Неделя 2 – скиллы пишут сущности сами. Неделя 4 – точка входа читает их срезом. Новый тип – строка в этой таблице, потом файлы.
