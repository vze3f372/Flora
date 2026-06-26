#!/usr/bin/env python3
"""Local Flora HTTP server.

Serves the OBS browser-source files and exposes local API endpoints that can be
called by Streamer.bot actions.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parents[1]
WRITER = ROOT / "scripts" / "flora-data.py"


class ApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value

    if value is None:
        return False

    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def require_text(payload: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = payload.get(key)

        if value is None:
            continue

        text = str(value).strip()

        if text:
            return text

    joined = " or ".join(keys)
    raise ApiError(400, f"Missing required field: {joined}")


def optional_text(payload: dict[str, Any], key: str, default: str) -> str:
    value = payload.get(key)

    if value is None:
        return default

    text = str(value).strip()

    return text or default


def require_int(payload: dict[str, Any], *keys: str) -> int:
    text = require_text(payload, *keys)

    try:
        value = int(text)
    except ValueError as error:
        joined = " or ".join(keys)
        raise ApiError(400, f"{joined} must be an integer") from error

    if value < 0:
        joined = " or ".join(keys)
        raise ApiError(400, f"{joined} must be zero or greater")

    return value


def optional_positive_int(payload: dict[str, Any], key: str, default: int) -> int:
    value = payload.get(key)

    if value is None:
        return default

    try:
        parsed = int(str(value).strip())
    except ValueError as error:
        raise ApiError(400, f"{key} must be an integer") from error

    if parsed < 1:
        raise ApiError(400, f"{key} must be greater than or equal to 1")

    return parsed


def run_writer(arguments: list[str], dry_run: bool) -> dict[str, Any]:
    command = [sys.executable, str(WRITER), *arguments]

    if dry_run:
        command.append("--dry-run")

    completed = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )

    stdout = completed.stdout.strip()
    stderr = completed.stderr.strip()

    if completed.returncode != 0:
        raise ApiError(
            400,
            "Writer command failed: " + (stderr or stdout or "unknown error"),
        )

    if not stdout:
        return {
            "command": arguments,
            "output": None,
        }

    try:
        output = json.loads(stdout)
    except json.JSONDecodeError:
        output = stdout

    return {
        "command": arguments,
        "output": output,
    }


def add_event_common_args(
    arguments: list[str],
    payload: dict[str, Any],
    include_keep: bool = True,
) -> list[str]:
    event_time = optional_text(payload, "time", "Just now")
    arguments.extend(["--time", event_time])

    if include_keep:
        keep = optional_positive_int(payload, "keep", 25)
        arguments.extend(["--keep", str(keep)])

    return arguments


class FloraRequestHandler(SimpleHTTPRequestHandler):
    server_version = "FloraHTTP/0.9"

    def __init__(self, *args: Any, **kwargs: Any):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_json(204, None)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path == "/api/health":
            self.send_json(
                200,
                {
                    "ok": True,
                    "service": "flora",
                    "root": str(ROOT),
                },
            )
            return

        if parsed.path.startswith("/api/"):
            self.send_json(
                405,
                {
                    "ok": False,
                    "error": "Use POST for Flora API write endpoints.",
                },
            )
            return

        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)

        routes = {
            "/api/raid": self.handle_raid,
            "/api/bits": self.handle_bits,
            "/api/follow": self.handle_follow,
            "/api/sub": self.handle_sub,
            "/api/goal": self.handle_goal,
            "/api/event": self.handle_event,
        }

        handler = routes.get(parsed.path)

        if handler is None:
            self.send_json(
                404,
                {
                    "ok": False,
                    "error": f"Unknown Flora API endpoint: {parsed.path}",
                },
            )
            return

        try:
            payload = self.read_payload(parsed.query)
            dry_run = parse_bool(payload.get("dryRun", payload.get("dry_run")))
            result = handler(payload, dry_run)
            self.send_json(200, result)
        except ApiError as error:
            self.send_json(
                error.status,
                {
                    "ok": False,
                    "error": error.message,
                },
            )
        except Exception as error:
            self.send_json(
                500,
                {
                    "ok": False,
                    "error": str(error),
                },
            )

    def read_payload(self, query: str) -> dict[str, Any]:
        payload: dict[str, Any] = {}

        query_values = parse_qs(query, keep_blank_values=True)

        for key, values in query_values.items():
            payload[key] = values[-1] if values else ""

        length = int(self.headers.get("Content-Length", "0") or "0")

        if length <= 0:
            return payload

        raw_body = self.rfile.read(length).decode("utf-8")
        content_type = self.headers.get("Content-Type", "")

        if "application/json" in content_type:
            try:
                body = json.loads(raw_body)
            except json.JSONDecodeError as error:
                raise ApiError(400, "Request body must be valid JSON") from error

            if not isinstance(body, dict):
                raise ApiError(400, "Request body must be a JSON object")

            payload.update(body)
            return payload

        form_values = parse_qs(raw_body, keep_blank_values=True)

        for key, values in form_values.items():
            payload[key] = values[-1] if values else ""

        return payload

    def handle_raid(self, payload: dict[str, Any], dry_run: bool) -> dict[str, Any]:
        name = require_text(payload, "name", "userName")
        viewers = require_int(payload, "viewers", "viewerCount")

        results = [
            run_writer(
                [
                    "raid",
                    "--name",
                    name,
                    "--viewers",
                    str(viewers),
                ],
                dry_run,
            ),
            run_writer(
                add_event_common_args(
                    [
                        "raid-event",
                        "--name",
                        name,
                        "--viewers",
                        str(viewers),
                    ],
                    payload,
                ),
                dry_run,
            ),
        ]

        return {
            "ok": True,
            "action": "raid",
            "dryRun": dry_run,
            "results": results,
        }

    def handle_bits(self, payload: dict[str, Any], dry_run: bool) -> dict[str, Any]:
        name = require_text(payload, "name", "userName")
        bits = require_int(payload, "bits")
        cheers = require_int(payload, "cheers") if "cheers" in payload else 1

        results = [
            run_writer(
                [
                    "bits",
                    "--name",
                    name,
                    "--bits",
                    str(bits),
                    "--cheers",
                    str(cheers),
                ],
                dry_run,
            ),
            run_writer(
                add_event_common_args(
                    [
                        "bits-event",
                        "--name",
                        name,
                        "--bits",
                        str(bits),
                    ],
                    payload,
                ),
                dry_run,
            ),
        ]

        return {
            "ok": True,
            "action": "bits",
            "dryRun": dry_run,
            "results": results,
        }

    def handle_follow(self, payload: dict[str, Any], dry_run: bool) -> dict[str, Any]:
        name = require_text(payload, "name", "userName")

        result = run_writer(
            add_event_common_args(
                [
                    "follow-event",
                    "--name",
                    name,
                ],
                payload,
            ),
            dry_run,
        )

        return {
            "ok": True,
            "action": "follow",
            "dryRun": dry_run,
            "results": [result],
        }

    def handle_sub(self, payload: dict[str, Any], dry_run: bool) -> dict[str, Any]:
        name = require_text(payload, "name", "userName")

        result = run_writer(
            add_event_common_args(
                [
                    "sub-event",
                    "--name",
                    name,
                ],
                payload,
            ),
            dry_run,
        )

        return {
            "ok": True,
            "action": "sub",
            "dryRun": dry_run,
            "results": [result],
        }

    def handle_goal(self, payload: dict[str, Any], dry_run: bool) -> dict[str, Any]:
        key = require_text(payload, "key")
        current = require_int(payload, "current")
        target = require_int(payload, "target")

        result = run_writer(
            [
                "goal",
                "--key",
                key,
                "--current",
                str(current),
                "--target",
                str(target),
            ],
            dry_run,
        )

        return {
            "ok": True,
            "action": "goal",
            "dryRun": dry_run,
            "results": [result],
        }

    def handle_event(self, payload: dict[str, Any], dry_run: bool) -> dict[str, Any]:
        event_type = require_text(payload, "type")
        name = require_text(payload, "name", "userName")
        detail = require_text(payload, "detail")

        result = run_writer(
            add_event_common_args(
                [
                    "event",
                    "--type",
                    event_type,
                    "--name",
                    name,
                    "--detail",
                    detail,
                ],
                payload,
            ),
            dry_run,
        )

        return {
            "ok": True,
            "action": "event",
            "dryRun": dry_run,
            "results": [result],
        }

    def send_json(self, status: int, payload: Any) -> None:
        if payload is None:
            body = b""
        else:
            body = json.dumps(payload, indent=2).encode("utf-8")

        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()

        if body:
            self.wfile.write(body)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Serve Flora panels and local Streamer.bot write endpoints.",
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8000, type=int)

    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), FloraRequestHandler)

    print(f"Flora server running at http://{args.host}:{args.port}")
    print(f"Serving files from {ROOT}")
    print("Press Ctrl+C to stop.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print()
        print("Stopping Flora server.")
    finally:
        server.server_close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
