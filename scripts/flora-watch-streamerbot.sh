#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p logs

LOCK_FILE="$ROOT/.flora-watchdog.lock"
STREAMERBOT_PATTERN="${FLORA_STREAMERBOT_PATTERN:-Streamer\.bot\.exe}"
MISS_LIMIT="${FLORA_WATCH_MISS_LIMIT:-3}"
SLEEP_SECONDS="${FLORA_WATCH_SLEEP_SECONDS:-5}"

exec 9>"$LOCK_FILE"

if command -v flock >/dev/null 2>&1; then
  flock -n 9 || exit 0
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') Flora watchdog started. Pattern: $STREAMERBOT_PATTERN"

misses=0

while true; do
  if pgrep -af "$STREAMERBOT_PATTERN" >/dev/null 2>&1; then
    misses=0
  else
    misses=$((misses + 1))
    echo "$(date '+%Y-%m-%d %H:%M:%S') Streamer.bot not found. Miss $misses/$MISS_LIMIT."
  fi

  if [ "$misses" -ge "$MISS_LIMIT" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') Streamer.bot closed. Stopping Flora."
    pkill -f '[s]cripts/flora-server.py' 2>/dev/null || true
    exit 0
  fi

  sleep "$SLEEP_SECONDS"
done
