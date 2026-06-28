from __future__ import annotations
import json
#!/usr/bin/env python3
"""Local Flora HTTP server.

Serves the OBS browser-source files and exposes local API endpoints that can be
called by Streamer.bot actions.
"""


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




def optional_int(payload: dict[str, Any], key: str, default: int) -> int:
    value = payload.get(key)

    if value is None or value == "":
        return default

    try:
        return int(value)
    except ValueError as error:
        raise ValueError(f"{key} must be an integer") from error


def optional_bool(payload: dict[str, Any], key: str, default: bool = False) -> bool:
    value = payload.get(key)

    if value is None or value == "":
        return default

    if isinstance(value, bool):
        return value

    normalized = str(value).strip().lower()

    if normalized in {"1", "true", "yes", "y", "on"}:
        return True

    if normalized in {"0", "false", "no", "n", "off"}:
        return False

    raise ValueError(f"{key} must be true or false")


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



# FLORA_ADMIN_API_START
_FLORA_ADMIN_GOAL_KEYS = ("followers", "subscribers")
_FLORA_ADMIN_GOAL_FIELDS = ("current", "target")


def _flora_admin_repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _flora_admin_read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _flora_admin_write_json(path: Path, payload: dict) -> None:
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    tmp_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    tmp_path.replace(path)


def _flora_admin_send_json(handler, payload: dict, status: int = 200) -> None:
    body = json.dumps(payload, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _flora_admin_send_error(handler, status: int, message: str) -> None:
    _flora_admin_send_json(handler, {"ok": False, "error": message}, status)


def _flora_admin_get_path(handler) -> str:
    from urllib.parse import urlparse

    return urlparse(handler.path).path



def _flora_admin_get_panels(config: dict) -> dict:
    panels = config.get("panels")

    if not isinstance(panels, dict) or not panels:
        raise ValueError("config.json must define a non-empty panels object.")

    return panels


def _flora_admin_parse_positive_number(path: str, value) -> int | float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{path} must be a positive number.")

    if value <= 0:
        raise ValueError(f"{path} must be a positive number.")

    return value


def _flora_admin_parse_non_negative_integer(path: str, value) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{path} must be a non-negative whole number.")

    if value < 0:
        raise ValueError(f"{path} must be a non-negative whole number.")

    return value


def _flora_admin_normalize_rotation(payload: dict, panels: dict) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object.")

    rotation = payload.get("rotation", payload)

    if not isinstance(rotation, dict):
        raise ValueError("Expected a rotation object.")

    enabled = rotation.get("enabled", False)

    if not isinstance(enabled, bool):
        raise ValueError("rotation.enabled must be true or false.")

    transition_milliseconds = _flora_admin_parse_non_negative_integer(
        "rotation.transitionMilliseconds",
        rotation.get("transitionMilliseconds", 500),
    )

    start_panel = rotation.get("startPanel")

    if not isinstance(start_panel, str) or not start_panel.strip():
        raise ValueError("rotation.startPanel must be a non-empty string.")

    start_panel = start_panel.strip()

    if start_panel not in panels:
        raise ValueError(f"rotation.startPanel references unknown panel: {start_panel}")

    raw_entries = rotation.get("panels")

    if not isinstance(raw_entries, list):
        raise ValueError("rotation.panels must be a list.")

    if not raw_entries:
        raise ValueError("rotation.panels must contain at least one panel.")

    entries = []
    seen = set()

    for index, entry in enumerate(raw_entries):
        entry_path = f"rotation.panels[{index}]"

        if not isinstance(entry, dict):
            raise ValueError(f"{entry_path} must be an object.")

        panel_name = entry.get("panel")

        if not isinstance(panel_name, str) or not panel_name.strip():
            raise ValueError(f"{entry_path}.panel must be a non-empty string.")

        panel_name = panel_name.strip()

        if panel_name not in panels:
            raise ValueError(f"{entry_path}.panel references unknown panel: {panel_name}")

        if panel_name in seen:
            raise ValueError(f"rotation.panels contains duplicate panel: {panel_name}")

        seen.add(panel_name)

        entries.append({
            "panel": panel_name,
            "durationSeconds": _flora_admin_parse_positive_number(
                f"{entry_path}.durationSeconds",
                entry.get("durationSeconds"),
            ),
        })

    return {
        "enabled": enabled,
        "panels": entries,
        "transitionMilliseconds": transition_milliseconds,
        "startPanel": start_panel,
    }


def _flora_admin_handle_rotation_get(handler) -> bool:
    config_path = _flora_admin_repo_root() / "config.json"

    try:
        config = _flora_admin_read_json(config_path)
        panels = _flora_admin_get_panels(config)
    except FileNotFoundError:
        _flora_admin_send_error(handler, 404, "config.json was not found.")
        return True
    except json.JSONDecodeError as error:
        _flora_admin_send_error(handler, 500, f"config.json is invalid JSON: {error}")
        return True
    except ValueError as error:
        _flora_admin_send_error(handler, 500, str(error))
        return True

    _flora_admin_send_json(handler, {
        "ok": True,
        "rotation": config.get("rotation", {}),
        "panels": panels,
    })
    return True


def _flora_admin_handle_rotation_post(handler) -> bool:
    config_path = _flora_admin_repo_root() / "config.json"

    try:
        payload = _flora_admin_read_request_json(handler)
    except ValueError as error:
        _flora_admin_send_error(handler, 400, str(error))
        return True

    try:
        config = _flora_admin_read_json(config_path)
        panels = _flora_admin_get_panels(config)
        rotation = _flora_admin_normalize_rotation(payload, panels)
        config["rotation"] = rotation
        _flora_admin_write_json(config_path, config)
    except FileNotFoundError:
        _flora_admin_send_error(handler, 404, "config.json was not found.")
        return True
    except json.JSONDecodeError as error:
        _flora_admin_send_error(handler, 500, f"config.json is invalid JSON: {error}")
        return True
    except ValueError as error:
        _flora_admin_send_error(handler, 400, str(error))
        return True

    _flora_admin_send_json(handler, {"ok": True, "rotation": rotation, "panels": panels})
    return True


def _flora_admin_handle_get(handler) -> bool:
    request_path = _flora_admin_get_path(handler)
    repo_root = _flora_admin_repo_root()

    if request_path == "/api/admin/config":
        try:
            _flora_admin_send_json(handler, _flora_admin_read_json(repo_root / "config.json"))
        except FileNotFoundError:
            _flora_admin_send_error(handler, 404, "config.json was not found.")
        except json.JSONDecodeError as error:
            _flora_admin_send_error(handler, 500, f"config.json is invalid JSON: {error}")
        return True

    if request_path == "/api/admin/goals":
        try:
            _flora_admin_send_json(handler, _flora_admin_read_json(repo_root / "data" / "goals.json"))
        except FileNotFoundError:
            _flora_admin_send_error(handler, 404, "data/goals.json was not found.")
        except json.JSONDecodeError as error:
            _flora_admin_send_error(handler, 500, f"data/goals.json is invalid JSON: {error}")
        return True

    if request_path == "/api/admin/rotation":
        return _flora_admin_handle_rotation_get(handler)

    return False


def _flora_admin_parse_goal_value(goal_key: str, field: str, value) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{goal_key}.{field} must be a whole number.")

    if value < 0:
        raise ValueError(f"{goal_key}.{field} must be non-negative.")

    return value


def _flora_admin_apply_goal_updates(existing_goals: dict, payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object.")

    updates = payload.get("goals", payload)

    if not isinstance(updates, dict):
        raise ValueError("Expected a goals object.")

    for goal_key in _FLORA_ADMIN_GOAL_KEYS:
        if goal_key not in existing_goals:
            raise ValueError(f"Existing goals file is missing required goal key: {goal_key}")

    for goal_key in updates:
        if goal_key not in _FLORA_ADMIN_GOAL_KEYS:
            raise ValueError(f"Admin API cannot create or update unknown goal key: {goal_key}")

    next_goals = dict(existing_goals)

    for goal_key, goal_updates in updates.items():
        if not isinstance(goal_updates, dict):
            raise ValueError(f"{goal_key} update must be an object.")

        next_goal = dict(existing_goals[goal_key])

        for field, value in goal_updates.items():
            if field not in _FLORA_ADMIN_GOAL_FIELDS:
                raise ValueError(f"Admin API cannot update unsupported field: {goal_key}.{field}")

            next_goal[field] = _flora_admin_parse_goal_value(goal_key, field, value)

        next_goals[goal_key] = next_goal

    return next_goals


def _flora_admin_read_request_json(handler) -> dict:
    try:
        content_length = int(handler.headers.get("Content-Length", "0") or "0")
    except ValueError:
        raise ValueError("Invalid Content-Length header.")

    if content_length <= 0:
        raise ValueError("Expected a JSON request body.")

    try:
        raw_body = handler.rfile.read(content_length).decode("utf-8")
    except UnicodeDecodeError as error:
        raise ValueError("Request body must be UTF-8.") from error

    try:
        return json.loads(raw_body)
    except json.JSONDecodeError as error:
        raise ValueError(f"Request body is invalid JSON: {error}") from error


_FLORA_ADMIN_STYLE_DEFAULTS = {
    "colors": {
        "background": "#0f172a",
        "panel": "#111827",
        "panelAlt": "#182235",
        "text": "#f8fafc",
        "muted": "#94a3b8",
        "accent": "#38bdf8",
        "border": "#293548",
        "success": "#22c55e",
        "error": "#fb7185",
    }
}


def _flora_admin_parse_hex_color(path: str, value) -> str:
    import re

    if not isinstance(value, str):
        raise ValueError(f"{path} must be a hex color string.")

    value = value.strip()

    if not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        raise ValueError(f"{path} must use #RRGGBB format.")

    return value


def _flora_admin_normalize_style(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object.")

    style = payload.get("style", payload)

    if not isinstance(style, dict):
        raise ValueError("Expected a style object.")

    colors = style.get("colors")

    if not isinstance(colors, dict):
        raise ValueError("Expected style.colors object.")

    unknown = sorted(set(colors) - set(_FLORA_ADMIN_STYLE_DEFAULTS["colors"]))

    if unknown:
        raise ValueError(f"Unsupported style color keys: {', '.join(unknown)}")

    next_style = json.loads(json.dumps(_FLORA_ADMIN_STYLE_DEFAULTS))

    for key, fallback in _FLORA_ADMIN_STYLE_DEFAULTS["colors"].items():
        next_style["colors"][key] = _flora_admin_parse_hex_color(
            f"style.colors.{key}",
            colors.get(key, fallback),
        )

    return next_style


def _flora_admin_handle_goals_post(handler) -> bool:
    try:
        payload = _flora_admin_read_request_json(handler)
    except ValueError as error:
        _flora_admin_send_error(handler, 400, str(error))
        return True

    goals_path = _flora_admin_repo_root() / "data" / "goals.json"

    try:
        existing_goals = _flora_admin_read_json(goals_path)
        next_goals = _flora_admin_apply_goal_updates(existing_goals, payload)
        _flora_admin_write_json(goals_path, next_goals)
    except FileNotFoundError:
        _flora_admin_send_error(handler, 404, "data/goals.json was not found.")
        return True
    except json.JSONDecodeError as error:
        _flora_admin_send_error(handler, 500, f"data/goals.json is invalid JSON: {error}")
        return True
    except ValueError as error:
        _flora_admin_send_error(handler, 400, str(error))
        return True

    _flora_admin_send_json(handler, {"ok": True, "goals": next_goals})
    return True


def _flora_admin_handle_style_post(handler) -> bool:
    try:
        payload = _flora_admin_read_request_json(handler)
        next_style = _flora_admin_normalize_style(payload)
    except ValueError as error:
        _flora_admin_send_error(handler, 400, str(error))
        return True

    config_path = _flora_admin_repo_root() / "config.json"

    try:
        config = _flora_admin_read_json(config_path)
        config["style"] = next_style
        _flora_admin_write_json(config_path, config)
    except FileNotFoundError:
        _flora_admin_send_error(handler, 404, "config.json was not found.")
        return True
    except json.JSONDecodeError as error:
        _flora_admin_send_error(handler, 500, f"config.json is invalid JSON: {error}")
        return True

    _flora_admin_send_json(handler, {"ok": True, "style": next_style})
    return True


def _flora_admin_handle_post(handler) -> bool:
    request_path = _flora_admin_get_path(handler)

    if request_path == "/api/admin/goals":
        return _flora_admin_handle_goals_post(handler)

    if request_path == "/api/admin/style":
        return _flora_admin_handle_style_post(handler)

    if request_path == "/api/admin/rotation":
        return _flora_admin_handle_rotation_post(handler)

    return False

# FLORA_ADMIN_API_END

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

    def api_routes(self):
        return {
            "/api/raid": self.handle_raid,
            "/api/bits": self.handle_bits,
            "/api/follow": self.handle_follow,
            "/api/sub": self.handle_sub,
            "/api/goal": self.handle_goal,
            "/api/event": self.handle_event,
        }

    def do_GET(self) -> None:
        if _flora_admin_handle_get(self):
            return

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
            self.handle_api_request(parsed, allow_body=False)
            return

        super().do_GET()

    def do_POST(self) -> None:
        if _flora_admin_handle_post(self):
            return

        parsed = urlparse(self.path)
        self.handle_api_request(parsed, allow_body=True)

    def handle_api_request(self, parsed, allow_body: bool) -> None:
        handler = self.api_routes().get(parsed.path)

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
            payload = self.read_payload(parsed.query, allow_body=allow_body)
            dry_run = parse_bool(payload.get("dryRun", payload.get("dry_run")))
            result = handler(payload, dry_run)
            result["method"] = self.command
            self.send_json(200, result)
        except ApiError as error:
            self.send_json(
                error.status,
                {
                    "ok": False,
                    "error": error.message,
                    "method": self.command,
                },
            )
        except Exception as error:
            self.send_json(
                500,
                {
                    "ok": False,
                    "error": str(error),
                    "method": self.command,
                },
            )

    def read_payload(self, query: str, allow_body: bool = True) -> dict[str, Any]:
        payload: dict[str, Any] = {}

        query_values = parse_qs(query, keep_blank_values=True)

        for key, values in query_values.items():
            payload[key] = values[-1] if values else ""

        if not allow_body:
            return payload

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
        name = require_text(payload, "name")
        event_time = optional_text(payload, "time", "Just now")
        keep = optional_int(payload, "keep", 25)
        update_goal = optional_bool(payload, "updateGoal", False)

        results = [
            run_writer(
                [
                    "follow-event",
                    "--name",
                    name,
                    "--time",
                    event_time,
                    "--keep",
                    str(keep),
                ],
                dry_run,
            )
        ]

        if update_goal:
            results.append(
                run_writer(
                    [
                        "goal-increment",
                        "--key",
                        "followers",
                        "--amount",
                        "1",
                    ],
                    dry_run,
                )
            )

        return {
            "action": "follow",
            "dryRun": dry_run,
            "results": results,
        }

    def handle_sub(self, payload: dict[str, Any], dry_run: bool) -> dict[str, Any]:
        name = require_text(payload, "name")
        event_time = optional_text(payload, "time", "Just now")
        keep = optional_int(payload, "keep", 25)
        update_goal = optional_bool(payload, "updateGoal", False)

        results = [
            run_writer(
                [
                    "sub-event",
                    "--name",
                    name,
                    "--time",
                    event_time,
                    "--keep",
                    str(keep),
                ],
                dry_run,
            )
        ]

        if update_goal:
            results.append(
                run_writer(
                    [
                        "goal-increment",
                        "--key",
                        "subscribers",
                        "--amount",
                        "1",
                    ],
                    dry_run,
                )
            )

        return {
            "action": "sub",
            "dryRun": dry_run,
            "results": results,
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
