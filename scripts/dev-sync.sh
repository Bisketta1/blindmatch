#!/usr/bin/env bash
# Hämtar nya ändringar från GitHub var 20:e sekund medan Expo kör, så telefonen uppdateras av sig själv.
# Kör i ett eget terminalfönster från repots rot:  bash scripts/dev-sync.sh
# Redigera inte filer lokalt medan det körs (pull kan då stoppa).
cd "$(dirname "$0")/.." || exit 1
while true; do
  before=$(git rev-parse HEAD)
  if git pull --ff-only -q; then
    after=$(git rev-parse HEAD)
    if [ "$before" != "$after" ]; then
      echo "[$(date +%H:%M:%S)] Uppdaterad: $(git log -1 --format=%s)"
      if git diff --name-only "$before" "$after" | grep -q "app/package.json"; then
        echo "package.json ändrades, kör npm install…"
        (cd app && npm install --no-audit --no-fund)
      fi
    fi
  else
    echo "[$(date +%H:%M:%S)] git pull misslyckades (lokala ändringar?). Försöker igen…"
  fi
  sleep 20
done
