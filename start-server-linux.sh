#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

WATCH_STREAMERBOT=0
ARGS=()

for arg in "$@"; do
  case "$arg" in
    --watch-streamerbot)
      WATCH_STREAMERBOT=1
      ;;
    *)
      ARGS+=("$arg")
      ;;
  esac
done

python scripts/flora-launcher.py "${ARGS[@]}"

if [ "$WATCH_STREAMERBOT" -eq 1 ]; then
  mkdir -p logs
  nohup bash scripts/flora-watch-streamerbot.sh >> logs/flora-watchdog.log 2>&1 &
fi
