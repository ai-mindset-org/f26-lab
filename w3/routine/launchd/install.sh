#!/bin/zsh
# поставить утреннюю сводку в launchd на этом маке: ./launchd/install.sh · снять: ./launchd/install.sh --remove
set -e
DIR="${0:A:h:h}"
LABEL=org.f26.morning-brief
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
if [ "${1:-}" = --remove ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"; echo "снято: $LABEL"; exit 0
fi
mkdir -p "$DIR/out" "$HOME/Library/LaunchAgents"
sed "s#__DIR__#$DIR#g" "$DIR/launchd/$LABEL.plist" > "$PLIST"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "поставлено: $LABEL, каждый день 09:07"
echo "запустить сейчас: launchctl kickstart gui/$(id -u)/$LABEL"
echo "журнал: $DIR/run-log.csv · экран: open $DIR/status.html · стоп: touch $DIR/STOP"
