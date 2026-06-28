#!/usr/bin/env python3
"""Local Flora HTTP server.

Serves the OBS browser-source files and exposes local API endpoints that can be
called by Streamer.bot actions.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parents[1]
WRITER = ROOT / "scripts" / "flora-data.py"
AVATAR_CACHE_FILE = ROOT / "data" / "avatar-cache.json"
AVATAR_ASSETS_DIR = ROOT / "assets" / "avatars"


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


# FLORA_AVATAR_CACHE_START

_AVATAR_URL_FIELDS = (
    "avatarUrl",
    "avatar",
    "profileImageUrl",
    "profileImage",
    "userProfileImageUrl",
)


def _flora_avatar_normalize_name(name: str) -> str:
    return re.sub(r"[^a-z0-9_-]+", "-", name.strip().lower()).strip("-") or "unknown"


def _flora_avatar_now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()


def _flora_avatar_cache_load() -> dict:
    try:
        data = json.loads(AVATAR_CACHE_FILE.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError:
        return {}

    return data if isinstance(data, dict) else {}


def _flora_avatar_cache_write(data: dict) -> None:
    AVATAR_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    AVATAR_CACHE_FILE.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def _flora_avatar_payload_url(payload: dict[str, Any]) -> str:
    for field in _AVATAR_URL_FIELDS:
        value = payload.get(field)

        if value is None:
            continue

        text = str(value).strip()

        if text:
            return text

    return ""


def _flora_avatar_extension(url: str, content_type: str) -> str:
    content_type = content_type.split(";", 1)[0].strip().lower()

    if content_type == "image/png":
        return ".png"

    if content_type == "image/webp":
        return ".webp"

    if content_type in {"image/jpeg", "image/jpg"}:
        return ".jpg"

    suffix = Path(urlparse(url).path).suffix.lower()

    if suffix in {".jpg", ".jpeg", ".png", ".webp"}:
        return ".jpg" if suffix == ".jpeg" else suffix

    return ".jpg"


def _flora_avatar_download(url: str, safe_name: str) -> str:
    parsed = urlparse(url)

    if parsed.scheme not in {"http", "https"}:
        raise ValueError("avatarUrl must be an http or https URL.")

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "FloraAvatarCache/1.0",
        },
    )

    with urllib.request.urlopen(request, timeout=10) as response:
        content_type = response.headers.get("Content-Type", "")
        data = response.read(2_000_000)

    if not data:
        raise ValueError("avatarUrl returned an empty response.")

    if content_type and not content_type.lower().startswith("image/"):
        raise ValueError("avatarUrl must return an image content type.")

    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:12]
    extension = _flora_avatar_extension(url, content_type)
    filename = f"{safe_name}-{digest}{extension}"
    output_path = AVATAR_ASSETS_DIR / filename

    AVATAR_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(data)

    return str(output_path.relative_to(ROOT))


def cache_avatar_from_payload(name: str, payload: dict[str, Any], dry_run: bool) -> dict | None:
    avatar_url = _flora_avatar_payload_url(payload)

    if not avatar_url:
        return None

    safe_name = _flora_avatar_normalize_name(name)
    display_name = str(payload.get("displayName", payload.get("display_name", name))).strip() or name

    if dry_run:
        return {
            "name": safe_name,
            "displayName": display_name,
            "avatarUrl": avatar_url,
            "dryRun": True,
        }

    cache = _flora_avatar_cache_load()
    existing = cache.get(safe_name, {})

    if isinstance(existing, dict) and existing.get("avatarUrl") == avatar_url and existing.get("avatarPath"):
        avatar_path = existing["avatarPath"]
    else:
        avatar_path = _flora_avatar_download(avatar_url, safe_name)

    row = {
        "name": safe_name,
        "displayName": display_name,
        "avatarUrl": avatar_url,
        "avatarPath": avatar_path,
        "updatedAt": _flora_avatar_now(),
    }

    cache[safe_name] = row
    _flora_avatar_cache_write(cache)

    return row

# FLORA_AVATAR_CACHE_END


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




def _flora_admin_backup_json(path: Path) -> Path | None:
    if not path.exists():
        return None

    from datetime import datetime, timezone
    import shutil

    repo_root = _flora_admin_repo_root()
    backup_dir = repo_root / "backups" / "admin"
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    relative_name = path.relative_to(repo_root).as_posix().replace("/", "__")
    backup_path = backup_dir / f"{relative_name}.{timestamp}.bak"

    shutil.copy2(path, backup_path)

    return backup_path



def _flora_admin_backup_target_path(target: str) -> Path:
    repo_root = _flora_admin_repo_root()

    if target == "config":
        return repo_root / "config.json"

    if target == "goals":
        return repo_root / "data" / "goals.json"

    raise ValueError(f"Unknown backup target: {target}")


def _flora_admin_backup_target_prefix(target: str) -> str:
    if target == "config":
        return "config.json."

    if target == "goals":
        return "data__goals.json."

    raise ValueError(f"Unknown backup target: {target}")


def _flora_admin_backup_target_label(target: str) -> str:
    if target == "config":
        return "config.json"

    if target == "goals":
        return "data/goals.json"

    raise ValueError(f"Unknown backup target: {target}")


def _flora_admin_backup_dir() -> Path:
    return _flora_admin_repo_root() / "backups" / "admin"


def _flora_admin_latest_backup(target: str) -> Path | None:
    backup_dir = _flora_admin_backup_dir()
    prefix = _flora_admin_backup_target_prefix(target)

    if not backup_dir.exists():
        return None

    backups = sorted(backup_dir.glob(f"{prefix}*.bak"))

    if not backups:
        return None

    return backups[-1]


def _flora_admin_backup_info(target: str) -> dict:
    latest = _flora_admin_latest_backup(target)
    label = _flora_admin_backup_target_label(target)

    if latest is None:
        return {
            "target": target,
            "label": label,
            "available": False,
            "path": None,
            "modified": None,
            "sizeBytes": None,
        }

    stat = latest.stat()

    return {
        "target": target,
        "label": label,
        "available": True,
        "path": latest.relative_to(_flora_admin_repo_root()).as_posix(),
        "modified": stat.st_mtime,
        "sizeBytes": stat.st_size,
    }


def _flora_admin_restore_latest_backup(target: str) -> dict:
    import shutil

    latest = _flora_admin_latest_backup(target)

    if latest is None:
        raise FileNotFoundError(f"No backup exists for {target}")

    destination = _flora_admin_backup_target_path(target)

    if destination.exists():
        _flora_admin_backup_json(destination)

    shutil.copy2(latest, destination)

    return {
        "target": target,
        "label": _flora_admin_backup_target_label(target),
        "restoredFrom": latest.relative_to(_flora_admin_repo_root()).as_posix(),
    }

def _flora_admin_write_json(path: Path, payload: dict) -> None:
    _flora_admin_backup_json(path)

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



# FLORA_NAMED_ROTATIONS_API_START

_FLORA_ROTATION_NAME_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")


def _flora_admin_normalize_rotation_name(name) -> str:
    if not isinstance(name, str):
        raise ValueError("Rotation group name must be a string.")

    normalized = name.strip().lower()

    if not _FLORA_ROTATION_NAME_PATTERN.fullmatch(normalized):
        raise ValueError(
            "Rotation group names must use lowercase letters, numbers, and hyphens only."
        )

    return normalized


def _flora_admin_normalize_rotations(payload: dict, panels: dict) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object.")

    rotations = payload.get("rotations", payload)

    if not isinstance(rotations, dict):
        raise ValueError("rotations must be an object.")

    normalized = {}

    for raw_name, raw_rotation in rotations.items():
        name = _flora_admin_normalize_rotation_name(raw_name)
        normalized[name] = _flora_admin_normalize_rotation(
            {"rotation": raw_rotation},
            panels,
        )

    return normalized


def _flora_admin_handle_rotations_get(handler) -> bool:
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
        "rotations": config.get("rotations", {}),
        "panels": panels,
    })
    return True


def _flora_admin_handle_rotations_post(handler) -> bool:
    config_path = _flora_admin_repo_root() / "config.json"

    try:
        payload = _flora_admin_read_request_json(handler)
    except ValueError as error:
        _flora_admin_send_error(handler, 400, str(error))
        return True

    try:
        config = _flora_admin_read_json(config_path)
        panels = _flora_admin_get_panels(config)
        rotations = _flora_admin_normalize_rotations(payload, panels)
        _flora_admin_backup_json(config_path)
        config["rotations"] = rotations
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

    _flora_admin_send_json(handler, {
        "ok": True,
        "rotations": rotations,
        "panels": panels,
    })
    return True

# FLORA_NAMED_ROTATIONS_API_END


_FLORA_ADMIN_DEFAULT_EVENT_TYPES = {
    "raid": {
        "label": "RAID",
        "color": "#5eead4",
    },
    "bits": {
        "label": "BITS",
        "color": "#67e8f9",
    },
    "follow": {
        "label": "FOLLOW",
        "color": "#86efac",
    },
    "sub": {
        "label": "SUB",
        "color": "#f0abfc",
    },
    "goal": {
        "label": "GOAL",
        "color": "#a78bfa",
    },
}


def _flora_admin_get_recent_events_panel(config: dict) -> dict:
    panels = _flora_admin_get_panels(config)
    panel = panels.get("recent-events")

    if not isinstance(panel, dict):
        raise ValueError("config.json must define panels.recent-events.")

    if panel.get("type") != "events":
        raise ValueError("panels.recent-events must be an events panel.")

    return panel


def _flora_admin_get_event_types(panel: dict) -> dict:
    event_types = panel.get("eventTypes")

    if isinstance(event_types, dict) and event_types:
        return event_types

    return _FLORA_ADMIN_DEFAULT_EVENT_TYPES


def _flora_admin_normalize_event_theme(payload: dict, existing_event_types: dict) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object.")

    event_types = payload.get("eventTypes", payload)

    if not isinstance(event_types, dict):
        raise ValueError("Expected an eventTypes object.")

    if not event_types:
        raise ValueError("eventTypes must contain at least one event type.")

    existing_keys = set(existing_event_types)

    for event_type in event_types:
        if event_type not in existing_keys:
            raise ValueError(f"Admin API cannot create unknown event type: {event_type}")

    next_event_types = {
        key: dict(value)
        for key, value in existing_event_types.items()
        if isinstance(value, dict)
    }

    for event_type, event_config in event_types.items():
        if not isinstance(event_config, dict):
            raise ValueError(f"eventTypes.{event_type} must be an object.")

        label = event_config.get("label")
        color = event_config.get("color")

        if not isinstance(label, str) or not label.strip():
            raise ValueError(f"eventTypes.{event_type}.label must be a non-empty string.")

        next_event_types[event_type] = {
            "label": label.strip(),
            "color": _flora_admin_parse_hex_color(
                f"eventTypes.{event_type}.color",
                color,
            ),
        }

    return next_event_types


def _flora_admin_handle_event_theme_get(handler) -> bool:
    config_path = _flora_admin_repo_root() / "config.json"

    try:
        config = _flora_admin_read_json(config_path)
        panel = _flora_admin_get_recent_events_panel(config)
        event_types = _flora_admin_get_event_types(panel)
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
        "eventTypes": event_types,
    })
    return True


def _flora_admin_handle_event_theme_post(handler) -> bool:
    config_path = _flora_admin_repo_root() / "config.json"

    try:
        payload = _flora_admin_read_request_json(handler)
    except ValueError as error:
        _flora_admin_send_error(handler, 400, str(error))
        return True

    try:
        config = _flora_admin_read_json(config_path)
        panel = _flora_admin_get_recent_events_panel(config)
        existing_event_types = _flora_admin_get_event_types(panel)
        event_types = _flora_admin_normalize_event_theme(payload, existing_event_types)
        panel["eventTypes"] = event_types
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

    _flora_admin_send_json(handler, {
        "ok": True,
        "eventTypes": event_types,
    })
    return True






def _flora_admin_backup_meta_path(backup_path: Path) -> Path:
    if backup_path.name.endswith(".bak"):
        return backup_path.with_name(backup_path.name[:-4] + ".meta.json")

    return backup_path.with_name(backup_path.name + ".meta.json")


def _flora_admin_clean_backup_text(value, max_length: int = 160) -> str:
    return str(value or "").strip()[:max_length]


def _flora_admin_read_backup_metadata(backup_path: Path) -> dict:
    meta_path = _flora_admin_backup_meta_path(backup_path)

    if not meta_path.exists():
        return {}

    try:
        return json.loads(meta_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _flora_admin_write_backup_metadata(
    backup_path: Path,
    target: str,
    tag: str = "",
    note: str = "",
    reason: str = "manual-tag",
) -> dict:
    from datetime import datetime, timezone

    metadata = {
        "target": target,
        "tag": _flora_admin_clean_backup_text(tag, 80),
        "note": _flora_admin_clean_backup_text(note, 240),
        "reason": _flora_admin_clean_backup_text(reason, 80),
        "createdAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "backup": backup_path.relative_to(_flora_admin_repo_root()).as_posix(),
    }

    _flora_admin_backup_meta_path(backup_path).write_text(
        json.dumps(metadata, indent=2) + "\n",
        encoding="utf-8",
    )

    return metadata


def _flora_admin_backup_item(target: str, backup_path: Path) -> dict:
    stat = backup_path.stat()
    metadata = _flora_admin_read_backup_metadata(backup_path)

    return {
        "target": target,
        "label": _flora_admin_backup_target_label(target),
        "path": backup_path.relative_to(_flora_admin_repo_root()).as_posix(),
        "modified": stat.st_mtime,
        "sizeBytes": stat.st_size,
        "tag": _flora_admin_clean_backup_text(metadata.get("tag", ""), 80),
        "note": _flora_admin_clean_backup_text(metadata.get("note", ""), 240),
        "reason": _flora_admin_clean_backup_text(metadata.get("reason", ""), 80),
        "metaPath": _flora_admin_backup_meta_path(backup_path).relative_to(_flora_admin_repo_root()).as_posix()
            if _flora_admin_backup_meta_path(backup_path).exists()
            else None,
    }


def _flora_admin_backup_items(target: str) -> list[dict]:
    backup_dir = _flora_admin_backup_dir()
    prefix = _flora_admin_backup_target_prefix(target)

    if not backup_dir.exists():
        return []

    backup_paths = sorted(
        backup_dir.glob(f"{prefix}*.bak"),
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )

    return [_flora_admin_backup_item(target, backup_path) for backup_path in backup_paths]


def _flora_admin_backup_info_for_browser(target: str) -> dict:
    info = _flora_admin_backup_info(target)
    info["items"] = _flora_admin_backup_items(target)

    if info["items"]:
        latest = info["items"][0]
        info["path"] = latest["path"]
        info["modified"] = latest["modified"]
        info["sizeBytes"] = latest["sizeBytes"]
        info["tag"] = latest.get("tag", "")
        info["note"] = latest.get("note", "")

    return info


def _flora_admin_selected_backup_path(target: str, selected_path: str) -> Path:
    repo_root = _flora_admin_repo_root().resolve()
    backup_dir = _flora_admin_backup_dir().resolve()
    candidate = (repo_root / selected_path).resolve()

    if candidate.parent != backup_dir:
        raise ValueError("Backup path must be inside backups/admin.")

    if not candidate.name.startswith(_flora_admin_backup_target_prefix(target)):
        raise ValueError(f"Backup path does not match target {target}.")

    if not candidate.name.endswith(".bak"):
        raise ValueError("Backup path must point to a .bak file.")

    if not candidate.exists():
        raise FileNotFoundError(f"Backup does not exist: {selected_path}")

    return candidate


def _flora_admin_restore_backup_path(target: str, backup_path: Path) -> dict:
    import shutil

    destination = _flora_admin_backup_target_path(target)

    if destination.exists():
        _flora_admin_backup_json(destination)

    shutil.copy2(backup_path, destination)

    return {
        "target": target,
        "label": _flora_admin_backup_target_label(target),
        "restoredFrom": backup_path.relative_to(_flora_admin_repo_root()).as_posix(),
    }


def _flora_admin_restore_selected_backup(target: str, selected_path: str) -> dict:
    backup_path = _flora_admin_selected_backup_path(target, selected_path)
    return _flora_admin_restore_backup_path(target, backup_path)


def _flora_admin_create_tagged_backup(target: str, tag: str, note: str, reason: str) -> dict:
    source_path = _flora_admin_backup_target_path(target)

    if not source_path.exists():
        raise FileNotFoundError(f"{_flora_admin_backup_target_label(target)} was not found.")

    backup_path = _flora_admin_backup_json(source_path)

    if backup_path is None:
        raise FileNotFoundError(f"Could not create backup for {target}.")

    _flora_admin_write_backup_metadata(
        backup_path=backup_path,
        target=target,
        tag=tag,
        note=note,
        reason=reason,
    )

    return _flora_admin_backup_item(target, backup_path)


def _flora_admin_handle_backups_get(handler) -> bool:
    _flora_admin_send_json(handler, {
        "ok": True,
        "backups": {
            "config": _flora_admin_backup_info_for_browser("config"),
            "goals": _flora_admin_backup_info_for_browser("goals"),
        },
    })
    return True


def _flora_admin_handle_backup_restore_post(handler) -> bool:
    try:
        payload = _flora_admin_read_request_json(handler)
        target = str(payload.get("target", "")).strip()

        if target not in {"config", "goals"}:
            _flora_admin_send_error(handler, 400, "target must be config or goals")
            return True

        selected_path = str(payload.get("path", "")).strip()

        if selected_path:
            result = _flora_admin_restore_selected_backup(target, selected_path)
        else:
            result = _flora_admin_restore_latest_backup(target)
    except json.JSONDecodeError as error:
        _flora_admin_send_error(handler, 400, f"Invalid JSON payload: {error}")
        return True
    except FileNotFoundError as error:
        _flora_admin_send_error(handler, 404, str(error))
        return True
    except ValueError as error:
        _flora_admin_send_error(handler, 400, str(error))
        return True

    _flora_admin_send_json(handler, {
        "ok": True,
        "restore": result,
        "backups": {
            "config": _flora_admin_backup_info_for_browser("config"),
            "goals": _flora_admin_backup_info_for_browser("goals"),
        },
    })
    return True



# FLORA_PRESET_API_START

def _flora_admin_presets_dir() -> Path:
    return _flora_admin_repo_root() / "presets"


def _flora_admin_clean_preset_text(value, max_length: int = 160) -> str:
    return str(value or "").strip()[:max_length]


def _flora_admin_preset_slug(value: str) -> str:
    import re

    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", value.strip().lower())
    cleaned = cleaned.strip("-._")

    return cleaned or "flora-preset"


def _flora_admin_preset_path(filename: str) -> Path:
    presets_dir = _flora_admin_presets_dir().resolve()
    candidate = (presets_dir / filename).resolve()

    if candidate.parent != presets_dir:
        raise ValueError("Preset path must be inside presets/.")

    if candidate.suffix != ".json":
        raise ValueError("Preset file must be a .json file.")

    return candidate


def _flora_admin_preset_recent_events_panel(config: dict) -> dict:
    panels = config.setdefault("panels", {})
    panel = panels.setdefault("recent-events", {})
    return panel


def _flora_admin_current_preset_payload(name: str, note: str) -> dict:
    from datetime import datetime, timezone

    repo_root = _flora_admin_repo_root()
    config = _flora_admin_read_json(repo_root / "config.json")
    goals = _flora_admin_read_json(repo_root / "data" / "goals.json")
    recent_events_panel = _flora_admin_preset_recent_events_panel(config)

    return {
        "schemaVersion": 1,
        "kind": "flora-admin-preset",
        "name": _flora_admin_clean_preset_text(name, 80) or "Flora Preset",
        "note": _flora_admin_clean_preset_text(note, 240),
        "createdAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "data": {
            "style": config.get("style", {}),
            "rotation": config.get("rotation", {}),
            "eventTypes": recent_events_panel.get("eventTypes", {}),
            "goals": goals,
        },
    }


def _flora_admin_preset_summary(path: Path) -> dict:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        payload = {}

    stat = path.stat()

    return {
        "filename": path.name,
        "path": path.relative_to(_flora_admin_repo_root()).as_posix(),
        "name": _flora_admin_clean_preset_text(payload.get("name", path.stem), 80),
        "note": _flora_admin_clean_preset_text(payload.get("note", ""), 240),
        "createdAt": payload.get("createdAt"),
        "modified": stat.st_mtime,
        "sizeBytes": stat.st_size,
        "schemaVersion": payload.get("schemaVersion"),
    }


def _flora_admin_list_presets() -> list[dict]:
    presets_dir = _flora_admin_presets_dir()

    if not presets_dir.exists():
        return []

    preset_paths = sorted(
        presets_dir.glob("*.json"),
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )

    return [_flora_admin_preset_summary(path) for path in preset_paths]


def _flora_admin_export_preset(name: str, note: str) -> dict:
    from datetime import datetime, timezone

    presets_dir = _flora_admin_presets_dir()
    presets_dir.mkdir(parents=True, exist_ok=True)

    payload = _flora_admin_current_preset_payload(name, note)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    filename = f"{timestamp}-{_flora_admin_preset_slug(payload['name'])}.json"
    preset_path = _flora_admin_preset_path(filename)

    preset_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    return _flora_admin_preset_summary(preset_path)


def _flora_admin_import_preset(filename: str) -> dict:
    repo_root = _flora_admin_repo_root()
    preset_path = _flora_admin_preset_path(filename)

    if not preset_path.exists():
        raise FileNotFoundError(f"Preset does not exist: {filename}")

    preset = json.loads(preset_path.read_text(encoding="utf-8"))

    if preset.get("kind") != "flora-admin-preset":
        raise ValueError("Preset kind is not flora-admin-preset.")

    data = preset.get("data")

    if not isinstance(data, dict):
        raise ValueError("Preset data must be an object.")

    config_path = repo_root / "config.json"
    goals_path = repo_root / "data" / "goals.json"

    config = _flora_admin_read_json(config_path)

    if isinstance(data.get("style"), dict):
        config["style"] = data["style"]

    if isinstance(data.get("rotation"), dict):
        config["rotation"] = data["rotation"]

    if isinstance(data.get("eventTypes"), dict):
        recent_events_panel = _flora_admin_preset_recent_events_panel(config)
        recent_events_panel["eventTypes"] = data["eventTypes"]

    if config_path.exists():
        _flora_admin_backup_json(config_path)

    _flora_admin_write_json(config_path, config)

    if isinstance(data.get("goals"), dict):
        if goals_path.exists():
            _flora_admin_backup_json(goals_path)

        _flora_admin_write_json(goals_path, data["goals"])

    return {
        "filename": preset_path.name,
        "name": _flora_admin_clean_preset_text(preset.get("name", preset_path.stem), 80),
        "path": preset_path.relative_to(repo_root).as_posix(),
    }


def _flora_admin_handle_presets_get(handler) -> bool:
    _flora_admin_send_json(handler, {
        "ok": True,
        "presets": _flora_admin_list_presets(),
    })
    return True


def _flora_admin_handle_preset_export_post(handler) -> bool:
    try:
        payload = _flora_admin_read_request_json(handler)
        preset = _flora_admin_export_preset(
            name=payload.get("name", ""),
            note=payload.get("note", ""),
        )
    except json.JSONDecodeError as error:
        _flora_admin_send_error(handler, 400, f"Invalid JSON payload: {error}")
        return True
    except FileNotFoundError as error:
        _flora_admin_send_error(handler, 404, str(error))
        return True
    except ValueError as error:
        _flora_admin_send_error(handler, 400, str(error))
        return True

    _flora_admin_send_json(handler, {
        "ok": True,
        "preset": preset,
        "presets": _flora_admin_list_presets(),
    })
    return True


def _flora_admin_handle_preset_import_post(handler) -> bool:
    try:
        payload = _flora_admin_read_request_json(handler)
        filename = str(payload.get("filename", "")).strip()

        if not filename:
            _flora_admin_send_error(handler, 400, "filename is required")
            return True

        imported = _flora_admin_import_preset(filename)
    except json.JSONDecodeError as error:
        _flora_admin_send_error(handler, 400, f"Invalid JSON payload: {error}")
        return True
    except FileNotFoundError as error:
        _flora_admin_send_error(handler, 404, str(error))
        return True
    except ValueError as error:
        _flora_admin_send_error(handler, 400, str(error))
        return True

    _flora_admin_send_json(handler, {
        "ok": True,
        "imported": imported,
        "presets": _flora_admin_list_presets(),
    })
    return True

# FLORA_PRESET_API_END



# FLORA_PRESET_MANAGEMENT_API_START

def _flora_admin_preset_preview(payload: dict) -> dict:
    data = payload.get("data", {})

    if not isinstance(data, dict):
        data = {}

    style = data.get("style", {})
    rotation = data.get("rotation", {})
    event_types = data.get("eventTypes", {})
    goals = data.get("goals", {})

    if not isinstance(style, dict):
        style = {}

    if not isinstance(rotation, dict):
        rotation = {}

    if not isinstance(event_types, dict):
        event_types = {}

    if not isinstance(goals, dict):
        goals = {}

    colors = style.get("colors", {})

    if not isinstance(colors, dict):
        colors = {}

    rotation_panels = rotation.get("panels", [])

    if not isinstance(rotation_panels, list):
        rotation_panels = []

    goal_summaries = []

    for key, value in goals.items():
        if not isinstance(value, dict):
            continue

        goal_summaries.append({
            "key": key,
            "label": value.get("label", key),
            "current": value.get("current"),
            "target": value.get("target"),
        })

    return {
        "style": {
            "colorCount": len(colors),
            "colors": colors,
        },
        "rotation": {
            "enabled": bool(rotation.get("enabled", False)),
            "startPanel": rotation.get("startPanel", ""),
            "panelCount": len(rotation_panels),
            "transitionMilliseconds": rotation.get("transitionMilliseconds"),
        },
        "eventTheme": {
            "eventTypeCount": len(event_types),
            "eventTypes": sorted(event_types.keys()),
        },
        "goals": {
            "goalCount": len(goal_summaries),
            "items": goal_summaries,
        },
    }


def _flora_admin_read_preset(filename: str) -> dict:
    preset_path = _flora_admin_preset_path(filename)

    if not preset_path.exists():
        raise FileNotFoundError(f"Preset does not exist: {filename}")

    payload = json.loads(preset_path.read_text(encoding="utf-8"))

    if payload.get("kind") != "flora-admin-preset":
        raise ValueError("Preset kind is not flora-admin-preset.")

    return {
        "summary": _flora_admin_preset_summary(preset_path),
        "preview": _flora_admin_preset_preview(payload),
    }


def _flora_admin_delete_preset(filename: str) -> dict:
    preset_path = _flora_admin_preset_path(filename)

    if not preset_path.exists():
        raise FileNotFoundError(f"Preset does not exist: {filename}")

    summary = _flora_admin_preset_summary(preset_path)
    preset_path.unlink()

    return summary


def _flora_admin_handle_preset_detail_post(handler) -> bool:
    try:
        payload = _flora_admin_read_request_json(handler)
        filename = str(payload.get("filename", "")).strip()

        if not filename:
            _flora_admin_send_error(handler, 400, "filename is required")
            return True

        preset = _flora_admin_read_preset(filename)
    except json.JSONDecodeError as error:
        _flora_admin_send_error(handler, 400, f"Invalid JSON payload: {error}")
        return True
    except FileNotFoundError as error:
        _flora_admin_send_error(handler, 404, str(error))
        return True
    except ValueError as error:
        _flora_admin_send_error(handler, 400, str(error))
        return True

    _flora_admin_send_json(handler, {
        "ok": True,
        "preset": preset,
    })
    return True


def _flora_admin_handle_preset_delete_post(handler) -> bool:
    try:
        payload = _flora_admin_read_request_json(handler)
        filename = str(payload.get("filename", "")).strip()

        if not filename:
            _flora_admin_send_error(handler, 400, "filename is required")
            return True

        deleted = _flora_admin_delete_preset(filename)
    except json.JSONDecodeError as error:
        _flora_admin_send_error(handler, 400, f"Invalid JSON payload: {error}")
        return True
    except FileNotFoundError as error:
        _flora_admin_send_error(handler, 404, str(error))
        return True
    except ValueError as error:
        _flora_admin_send_error(handler, 400, str(error))
        return True

    _flora_admin_send_json(handler, {
        "ok": True,
        "deleted": deleted,
        "presets": _flora_admin_list_presets(),
    })
    return True

# FLORA_PRESET_MANAGEMENT_API_END



# FLORA_RUNTIME_RESET_START

def _flora_admin_runtime_reset_timestamp() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")


def _flora_admin_runtime_reset_selected(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object.")

    confirmation = str(payload.get("confirmation", "")).strip()

    if confirmation != "RESET":
        raise ValueError('Confirmation must be exactly "RESET".')

    reset = payload.get("reset", payload)

    if not isinstance(reset, dict):
        raise ValueError("reset must be a JSON object.")

    return {
        "raids": bool(reset.get("raids")),
        "bits": bool(reset.get("bits")),
        "events": bool(reset.get("events")),
        "avatarCache": bool(reset.get("avatarCache")),
        "avatarImages": bool(reset.get("avatarImages")),
        "goalsProgress": bool(reset.get("goalsProgress")),
    }


def _flora_admin_runtime_backup_dir() -> Path:
    backup_dir = _flora_admin_repo_root() / "backups" / "runtime-reset" / _flora_admin_runtime_reset_timestamp()
    backup_dir.mkdir(parents=True, exist_ok=True)
    return backup_dir


def _flora_admin_runtime_backup_file(source: Path, backup_dir: Path, label: str) -> str | None:
    if not source.exists():
        return None

    backup_path = backup_dir / label
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, backup_path)

    return backup_path.relative_to(_flora_admin_repo_root()).as_posix()


def _flora_admin_runtime_backup_avatar_images(avatar_dir: Path, backup_dir: Path) -> list[str]:
    if not avatar_dir.exists():
        return []

    copied = []
    image_backup_dir = backup_dir / "assets__avatars"
    image_backup_dir.mkdir(parents=True, exist_ok=True)

    for item in sorted(avatar_dir.iterdir()):
        if not item.is_file():
            continue

        backup_path = image_backup_dir / item.name
        shutil.copy2(item, backup_path)
        copied.append(backup_path.relative_to(_flora_admin_repo_root()).as_posix())

    return copied


def _flora_admin_runtime_reset_goals(goals: dict) -> dict:
    if not isinstance(goals, dict):
        raise ValueError("data/goals.json must contain a JSON object.")

    next_goals = {}

    for key, value in goals.items():
        if not isinstance(value, dict):
            next_goals[key] = value
            continue

        next_goal = dict(value)
        next_goal["current"] = 0
        next_goals[key] = next_goal

    return next_goals


def _flora_admin_handle_runtime_reset_post(handler) -> bool:
    try:
        payload = _flora_admin_read_request_json(handler)
        selected = _flora_admin_runtime_reset_selected(payload)

        if not any(selected.values()):
            raise ValueError("Select at least one runtime data item to reset.")

        repo_root = _flora_admin_repo_root()
        backup_dir = _flora_admin_runtime_backup_dir()
        data_dir = repo_root / "data"
        avatar_dir = repo_root / "assets" / "avatars"

        backups = []
        reset_items = []

        if selected["raids"]:
            path = data_dir / "raids.json"
            backups.append(_flora_admin_runtime_backup_file(path, backup_dir, "data__raids.json"))
            _flora_admin_write_json(path, {})
            reset_items.append("Raid leaderboard")

        if selected["bits"]:
            path = data_dir / "bits.json"
            backups.append(_flora_admin_runtime_backup_file(path, backup_dir, "data__bits.json"))
            _flora_admin_write_json(path, {})
            reset_items.append("Bits leaderboard")

        if selected["events"]:
            path = data_dir / "events.json"
            backups.append(_flora_admin_runtime_backup_file(path, backup_dir, "data__events.json"))
            _flora_admin_write_json(path, {"events": []})
            reset_items.append("Recent events")

        if selected["avatarCache"]:
            path = data_dir / "avatar-cache.json"
            backups.append(_flora_admin_runtime_backup_file(path, backup_dir, "data__avatar-cache.json"))
            _flora_admin_write_json(path, {})
            reset_items.append("Avatar cache metadata")

        avatar_image_backups = []

        if selected["avatarImages"]:
            avatar_image_backups = _flora_admin_runtime_backup_avatar_images(avatar_dir, backup_dir)
            avatar_dir.mkdir(parents=True, exist_ok=True)

            deleted_count = 0
            for item in sorted(avatar_dir.iterdir()):
                if item.is_file():
                    item.unlink()
                    deleted_count += 1

            reset_items.append(f"Avatar image files ({deleted_count})")

        if selected["goalsProgress"]:
            path = data_dir / "goals.json"
            backups.append(_flora_admin_runtime_backup_file(path, backup_dir, "data__goals.json"))
            goals = _flora_admin_read_json(path)
            _flora_admin_write_json(path, _flora_admin_runtime_reset_goals(goals))
            reset_items.append("Goal progress")

        backups = [backup for backup in backups if backup]

        _flora_admin_send_json(handler, {
            "ok": True,
            "reset": reset_items,
            "backupDir": backup_dir.relative_to(repo_root).as_posix(),
            "backups": backups,
            "avatarImageBackups": avatar_image_backups,
        })

    except json.JSONDecodeError as error:
        _flora_admin_send_error(handler, 400, f"Invalid JSON payload: {error}")
    except FileNotFoundError as error:
        _flora_admin_send_error(handler, 404, str(error))
    except ValueError as error:
        _flora_admin_send_error(handler, 400, str(error))
    except Exception as error:
        _flora_admin_send_error(handler, 500, str(error))

    return True

# FLORA_RUNTIME_RESET_END

def _flora_admin_handle_get(handler) -> bool:
    request_path = _flora_admin_get_path(handler)
    repo_root = _flora_admin_repo_root()

    if request_path == "/api/admin/backups":
        return _flora_admin_handle_backups_get(handler)

    if request_path == "/api/admin/presets":
        return _flora_admin_handle_presets_get(handler)

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

    if request_path == "/api/admin/rotations":
        return _flora_admin_handle_rotations_get(handler)

    if request_path == "/api/admin/event-theme":
        return _flora_admin_handle_event_theme_get(handler)

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




def _flora_admin_handle_backup_tag_post(handler) -> bool:
    try:
        payload = _flora_admin_read_request_json(handler)
        target = str(payload.get("target", "")).strip()
        selected_path = str(payload.get("path", "")).strip()

        if target not in {"config", "goals"}:
            _flora_admin_send_error(handler, 400, "target must be config or goals")
            return True

        if not selected_path:
            _flora_admin_send_error(handler, 400, "path is required")
            return True

        backup_path = _flora_admin_selected_backup_path(target, selected_path)
        _flora_admin_write_backup_metadata(
            backup_path=backup_path,
            target=target,
            tag=payload.get("tag", ""),
            note=payload.get("note", ""),
            reason="manual-tag",
        )
    except json.JSONDecodeError as error:
        _flora_admin_send_error(handler, 400, f"Invalid JSON payload: {error}")
        return True
    except FileNotFoundError as error:
        _flora_admin_send_error(handler, 404, str(error))
        return True
    except ValueError as error:
        _flora_admin_send_error(handler, 400, str(error))
        return True

    _flora_admin_send_json(handler, {
        "ok": True,
        "backup": _flora_admin_backup_item(target, backup_path),
        "backups": {
            "config": _flora_admin_backup_info_for_browser("config"),
            "goals": _flora_admin_backup_info_for_browser("goals"),
        },
    })
    return True


def _flora_admin_handle_mark_working_post(handler) -> bool:
    try:
        payload = _flora_admin_read_request_json(handler)
        tag = _flora_admin_clean_backup_text(payload.get("tag", "known-good"), 80) or "known-good"
        note = _flora_admin_clean_backup_text(payload.get("note", ""), 240)

        created = {
            "config": _flora_admin_create_tagged_backup("config", tag, note, "manual-known-good"),
            "goals": _flora_admin_create_tagged_backup("goals", tag, note, "manual-known-good"),
        }
    except json.JSONDecodeError as error:
        _flora_admin_send_error(handler, 400, f"Invalid JSON payload: {error}")
        return True
    except FileNotFoundError as error:
        _flora_admin_send_error(handler, 404, str(error))
        return True
    except ValueError as error:
        _flora_admin_send_error(handler, 400, str(error))
        return True

    _flora_admin_send_json(handler, {
        "ok": True,
        "created": created,
        "backups": {
            "config": _flora_admin_backup_info_for_browser("config"),
            "goals": _flora_admin_backup_info_for_browser("goals"),
        },
    })
    return True


def _flora_admin_handle_post(handler) -> bool:
    request_path = _flora_admin_get_path(handler)

    if request_path == "/api/admin/runtime-reset":
        return _flora_admin_handle_runtime_reset_post(handler)

    if request_path == "/api/admin/backups/restore":
        return _flora_admin_handle_backup_restore_post(handler)

    if request_path == "/api/admin/presets/export":
        return _flora_admin_handle_preset_export_post(handler)

    if request_path == "/api/admin/presets/import":
        return _flora_admin_handle_preset_import_post(handler)

    if request_path == "/api/admin/presets/detail":
        return _flora_admin_handle_preset_detail_post(handler)

    if request_path == "/api/admin/presets/delete":
        return _flora_admin_handle_preset_delete_post(handler)

    if request_path == "/api/admin/backups/tag":
        return _flora_admin_handle_backup_tag_post(handler)

    if request_path == "/api/admin/backups/mark-working":
        return _flora_admin_handle_mark_working_post(handler)

    if request_path == "/api/admin/goals":
        return _flora_admin_handle_goals_post(handler)

    if request_path == "/api/admin/style":
        return _flora_admin_handle_style_post(handler)

    if request_path == "/api/admin/rotation":
        return _flora_admin_handle_rotation_post(handler)

    if request_path == "/api/admin/rotations":
        return _flora_admin_handle_rotations_post(handler)

    if request_path == "/api/admin/event-theme":
        return _flora_admin_handle_event_theme_post(handler)

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
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
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
        avatar = cache_avatar_from_payload(name, payload, dry_run)

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
            "avatar": avatar,
        }

    def handle_bits(self, payload: dict[str, Any], dry_run: bool) -> dict[str, Any]:
        name = require_text(payload, "name", "userName")
        bits = require_int(payload, "bits")
        cheers = require_int(payload, "cheers") if "cheers" in payload else 1
        avatar = cache_avatar_from_payload(name, payload, dry_run)

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
            "avatar": avatar,
        }

    def handle_follow(self, payload: dict[str, Any], dry_run: bool) -> dict[str, Any]:
        name = require_text(payload, "name")
        avatar = cache_avatar_from_payload(name, payload, dry_run)
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
            "avatar": avatar,
        }

    def handle_sub(self, payload: dict[str, Any], dry_run: bool) -> dict[str, Any]:
        name = require_text(payload, "name")
        avatar = cache_avatar_from_payload(name, payload, dry_run)
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
            "avatar": avatar,
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
        avatar = cache_avatar_from_payload(name, payload, dry_run)

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
            "avatar": avatar,
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
