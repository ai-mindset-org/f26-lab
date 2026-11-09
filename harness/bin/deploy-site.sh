#!/usr/bin/env bash
# deploy-site.sh – публикует открытую копию https://f26-harness.lab.aimindset.org/
#
# lab-sites принимает новые страницы в sites/ только подключёнными к общей шапке
# (контракт родительских страниц, config/parent-pages.json). Неподключённый HTML
# останавливает выкладку ВСЕГО репозитория (09.11: так и случилось), поэтому:
#   index.html  – страница-хост с общей шапкой и футером, iframe на app.html
#   app.html    – сам инструмент (kind: embed)
#   guide.html, access.html – embed, хост ссылается на них
# Исходники подключения: lab-sites/pages/f26-harness (aim-page.json, закреплённый
# родитель, src/index.html). Сборку шапки делает родитель на закреплённой версии.
#
# usage: bin/deploy-site.sh [клон lab-sites, по умолчанию ~/repos/lab-sites]
#        клон должен быть чистым; держит чужие правки – возьми отдельное дерево
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LAB="${1:-$HOME/repos/lab-sites}"
[[ -e "$LAB/.git" ]] || { echo "нет клона lab-sites: gh repo clone ai-mindset-org/lab-sites $LAB"; exit 1; }
command -v gitleaks >/dev/null || { echo "нужен gitleaks: brew install gitleaks"; exit 1; }
cd "$ROOT"
[[ -z "$(git status --porcelain -- .)" ]] || { echo "в харнессе незакоммиченные правки – сначала commit и push"; exit 1; }
git pull -q --rebase
node tools/build-scenario.mjs
node tools/build-public.mjs

git -C "$LAB" pull -q --rebase
PAGE="$LAB/pages/f26-harness"
[[ -f "$PAGE/aim-page.json" ]] || { echo "нет $PAGE – страница не подключена, см. шапку скрипта"; exit 1; }
PIN="$(python3 -c "import json;print(json.load(open('$PAGE/platform-dependency.json'))['revision'])")"

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
PARENT="$TMP/parent"
git clone -q https://github.com/ai-mindset-org/aim-aimindset.org-site-blocks.git "$PARENT"
git -C "$PARENT" checkout -q "$PIN"

C="$TMP/consumer"; mkdir -p "$C/dist"
cp "$PAGE"/{aim-page.json,platform-dependency.json,AGENTS.md,CLAUDE.md,MANDATORY_INSTRUCTIONS.md} "$C/"
rsync -a --exclude assets/index.html "$ROOT/.public/" "$C/dist/"
mv "$C/dist/index.html" "$C/dist/app.html"
mkdir -p "$C/dist/assets/fonts"; cp "$LAB/sites/f26-harness/assets/fonts/"* "$C/dist/assets/fonts/"
sed -i.bak 's/href="index.html?mode=live"/href="app.html?mode=live"/g' "$C/dist/guide.html" "$C/dist/access.html"
sed -i.bak 's/href="guide.html"/href="guide.html" target="_top"/g; s/href="access.html"/href="access.html" target="_top"/g' "$C/dist/app.html"
rm -f "$C/dist/"*.bak
cp "$PAGE/src/index.html" "$C/dist/index.html"
(cd "$C" && PYTHONPATH="$PARENT" PYTHONNOUSERSITE=1 python3 -B -m platform_core.consumer --root "$C")

D=sites/f26-harness
rsync -a --delete "$C/dist/" "$LAB/$D/"
cd "$LAB"
python3 -B scripts/check-parent-pages.py --parent-cache "$TMP/cache"
bash scripts/site-preflight.sh "$LAB" f26-harness
# aim-platform-build.json содержит SHA-256 файлов – gitleaks видит в них generic-api-key
gitleaks dir "$D" --redact --no-banner --log-level error || echo "gitleaks: проверь находки, хеши квитанции сборки – ложные"

git add "$D"
git diff --cached --quiet -- "$D" && { echo "сайт уже совпадает с харнессом $(git -C "$ROOT" rev-parse --short HEAD)"; exit 0; }
git commit -q -m "f26-harness: выкладка харнесса $(git -C "$ROOT" rev-parse --short HEAD)" -- "$D"
git pull -q --rebase origin main && git push -q origin HEAD:main
echo "отправлено: https://f26-harness.lab.aimindset.org/ – сервер проверяет контракт около 5 минут"
