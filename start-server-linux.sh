#!/usr/bin/env bash
cd "$(dirname "$0")"

PORT=8000

if command -v ss >/dev/null 2>&1; then
    if ss -ltn | grep -q ":$PORT "; then
        echo "StreamPanel server already running on port $PORT"
        exit 0
    fi
fi

python3 -m http.server "$PORT"
