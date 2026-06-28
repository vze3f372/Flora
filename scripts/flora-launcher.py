#!/usr/bin/env python3
"""Start the local Flora server if it is not already running.

This script is intended for Streamer.bot "Run a Program" actions and for
manual startup. It is cross-platform and works on Windows, Linux, and macOS
as long as Python is available.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "scripts" / "flora-server.py"
LOG_DIR = ROOT / "logs"
LOG_FILE = LOG_DIR / "flora-server.log"


def python_executable() -> str:
    executable = str(sys.executable or "").strip()

    if executable:
        return executable

    if os.name == "nt":
        return shutil.which("python") or shutil.which("py") or "python"

    return shutil.which("python3") or shutil.which("python") or "/usr/bin/python"


def health_url(host: str, port: int) -> str:
    return f"http://{host}:{port}/api/health"


def check_health(host: str, port: int, timeout: float = 1.0) -> bool:
    request = urllib.request.Request(
        health_url(host, port),
        headers={
            "User-Agent": "FloraLauncher/1.0",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            if response.status != 200:
                return False

            payload = json.loads(response.read().decode("utf-8"))

    except (OSError, urllib.error.URLError, json.JSONDecodeError):
        return False

    return bool(payload.get("ok")) and payload.get("service") == "flora"


def launch_server(host: str, port: int) -> subprocess.Popen:
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    command = [
        python_executable(),
        str(SERVER),
        "--host",
        host,
        "--port",
        str(port),
    ]

    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"

    log = LOG_FILE.open("a", encoding="utf-8")

    kwargs = {
        "cwd": str(ROOT),
        "stdout": log,
        "stderr": subprocess.STDOUT,
        "stdin": subprocess.DEVNULL,
        "env": env,
    }

    if os.name == "nt":
        kwargs["creationflags"] = (
            subprocess.CREATE_NEW_PROCESS_GROUP
            | subprocess.DETACHED_PROCESS
        )
    else:
        kwargs["start_new_session"] = True

    return subprocess.Popen(command, **kwargs)


def wait_for_server(host: str, port: int, attempts: int, delay: float) -> bool:
    for _ in range(attempts):
        if check_health(host, port, timeout=1.0):
            return True

        time.sleep(delay)

    return False


def print_result(**fields) -> None:
    print(json.dumps(fields, indent=2, sort_keys=True))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Start Flora server if it is not already running."
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8000, type=int)
    parser.add_argument("--attempts", default=20, type=int)
    parser.add_argument("--delay", default=0.25, type=float)

    args = parser.parse_args()

    if check_health(args.host, args.port):
        print_result(
            ok=True,
            action="already-running",
            url=health_url(args.host, args.port),
        )
        return 0

    process = launch_server(args.host, args.port)

    if wait_for_server(args.host, args.port, args.attempts, args.delay):
        print_result(
            ok=True,
            action="started",
            pid=process.pid,
            url=health_url(args.host, args.port),
            log=str(LOG_FILE.relative_to(ROOT)),
        )
        return 0

    print_result(
        ok=False,
        action="failed",
        pid=process.pid,
        url=health_url(args.host, args.port),
        log=str(LOG_FILE.relative_to(ROOT)),
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
