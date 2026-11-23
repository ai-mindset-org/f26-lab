#!/bin/zsh
# одна попытка рутины: вход → агент → проверка кодом → строка в run-log.csv → status.json и status.html
#   ./run.sh                          агент Claude Code (claude -p); AGENT=codex ./run.sh – Codex (codex exec)
#   ./run.sh --demo                   без агента: готовый ответ из examples/, проверить цепочку без токенов
#   ./run.sh --input input/empty.md   другой вход: input/notes.md · input/empty.md · input/old.md
#   ./run.sh --result out/latest.md   ответ уже есть (например, его написал GitHub Actions): только проверка и журнал
# остановить рутину: touch STOP (запуск будет записан как stopped и пропущен)
set -u
cd "${0:A:h}"
INPUT=input/notes.md
MODE=agent
RESULT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --demo) MODE=demo ;;
    --input) INPUT="$2"; shift ;;
    --result) MODE=result; RESULT="$2"; shift ;;
    *) echo "не знаю флаг $1"; exit 2 ;;
  esac
  shift
done
RUN_ID=$(date +%Y%m%d-%H%M%S)-$$
STARTED=$(date +%Y-%m-%dT%H:%M:%S%z)
mkdir -p out
OUT="out/$RUN_ID.md"

# одна строка журнала: статус · что показала проверка · следующий шаг; потом пересчёт экрана
log() {
  local check=${2//\"/\'} next=${3//\"/\'}
  print -r -- "$RUN_ID,$STARTED,$INPUT,$MODE,$1,\"$check\",\"$next\"" >> run-log.csv
  node status.mjs > /dev/null
  print -r -- "$RUN_ID · $1 · $2"
}

if [ -e STOP ]; then log stopped "файл STOP" "убрать STOP, когда рутина снова нужна"; exit 0; fi

case "$MODE" in
  demo)
    case "$INPUT" in
      *empty*) cp examples/out-empty.md "$OUT" ;;
      *old*) cp examples/out-old.md "$OUT" ;;
      *) cp examples/out-notes.md "$OUT" ;;
    esac ;;
  result)
    [ -s "$RESULT" ] || { log error "нет файла ответа $RESULT" "проверить шаг, который пишет ответ"; exit 1; }
    cp "$RESULT" "$OUT" ;;
  agent)
    PROMPT="out/$RUN_ID.prompt.txt"
    { cat SKILL.md; print -r -- ""; print -r -- "Сегодня $(date +%d.%m.%Y). Вход ($INPUT):"; cat "$INPUT" 2>/dev/null; } > "$PROMPT"
    if [ "${AGENT:-claude}" = codex ]; then
      codex exec --skip-git-repo-check --sandbox read-only -o "$OUT" - < "$PROMPT" > /dev/null 2> out/last-error.txt
    else
      claude -p < "$PROMPT" > "$OUT" 2> out/last-error.txt
    fi
    [ $? -eq 0 ] || { log error "агент вернул ошибку, см. out/last-error.txt" "открыть out/last-error.txt"; exit 1; } ;;
esac

[ "$MODE" = demo ] && export TODAY=2026-11-23 # учебные ответы написаны на 23.11
if REASON=$(node check.mjs "$INPUT" "$OUT"); then
  log ok "$REASON" "прочитать $OUT"
else
  log needs_fix "$REASON" "поправить одно правило в SKILL.md и повторить"
  exit 1
fi
