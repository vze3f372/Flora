#!/usr/bin/env python3

import json
import sys
from pathlib import Path


VALID_PANEL_TYPES = {"table"}
VALID_ALIGNMENTS = {"left", "center", "right"}


def fail(message):
    print(f"config error: {message}", file=sys.stderr)
    return 1


def require_type(value, expected_type, path):
    if not isinstance(value, expected_type):
        expected_name = expected_type.__name__
        actual_name = type(value).__name__
        raise ValueError(f"{path} must be {expected_name}, got {actual_name}")


def require_non_empty_string(value, path):
    require_type(value, str, path)

    if not value.strip():
        raise ValueError(f"{path} must not be empty")


def validate_scroll(scroll, panel_path):
    if scroll is None:
        return

    require_type(scroll, dict, f"{panel_path}.scroll")

    if "enabled" in scroll and not isinstance(scroll["enabled"], bool):
        raise ValueError(f"{panel_path}.scroll.enabled must be bool")

    numeric_fields = [
        "speedPixelsPerSecond",
        "startDelaySeconds",
        "gapPixels",
    ]

    for field in numeric_fields:
        if field not in scroll:
            continue

        value = scroll[field]

        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise ValueError(f"{panel_path}.scroll.{field} must be number")

        if value < 0:
            raise ValueError(f"{panel_path}.scroll.{field} must be >= 0")


def validate_columns(columns, panel_path):
    require_type(columns, list, f"{panel_path}.columns")

    if not columns:
        raise ValueError(f"{panel_path}.columns must contain at least one column")

    seen_fields = set()

    for index, column in enumerate(columns):
        column_path = f"{panel_path}.columns[{index}]"

        require_type(column, dict, column_path)

        require_non_empty_string(column.get("label"), f"{column_path}.label")
        require_non_empty_string(column.get("field"), f"{column_path}.field")

        field = column["field"]

        if field in seen_fields:
            raise ValueError(f"{column_path}.field duplicates field {field!r}")

        seen_fields.add(field)

        if "className" in column:
            require_non_empty_string(column["className"], f"{column_path}.className")

        if "align" in column:
            require_non_empty_string(column["align"], f"{column_path}.align")

            if column["align"] not in VALID_ALIGNMENTS:
                allowed = ", ".join(sorted(VALID_ALIGNMENTS))
                raise ValueError(f"{column_path}.align must be one of: {allowed}")

        if "width" in column:
            require_non_empty_string(column["width"], f"{column_path}.width")


def validate_table_panel(panel, panel_path):
    required_strings = [
        "title",
        "subtitle",
        "dataFile",
        "sortBy",
    ]

    for field in required_strings:
        require_non_empty_string(panel.get(field), f"{panel_path}.{field}")

    if "sortThenBy" in panel and panel["sortThenBy"] is not None:
        require_non_empty_string(panel["sortThenBy"], f"{panel_path}.sortThenBy")

    max_rows = panel.get("maxRows")

    if not isinstance(max_rows, int) or isinstance(max_rows, bool):
        raise ValueError(f"{panel_path}.maxRows must be int")

    if max_rows < 1:
        raise ValueError(f"{panel_path}.maxRows must be >= 1")

    validate_columns(panel.get("columns"), panel_path)
    validate_scroll(panel.get("scroll"), panel_path)


def validate_panel(panel_name, panel):
    panel_path = f"panels.{panel_name}"

    require_type(panel, dict, panel_path)

    panel_type = panel.get("type", "table")

    require_non_empty_string(panel_type, f"{panel_path}.type")

    if panel_type not in VALID_PANEL_TYPES:
        allowed = ", ".join(sorted(VALID_PANEL_TYPES))
        raise ValueError(f"{panel_path}.type must be one of: {allowed}")

    if panel_type == "table":
        validate_table_panel(panel, panel_path)


def validate_config(config):
    require_type(config, dict, "config")

    if "theme" in config:
        require_non_empty_string(config["theme"], "theme")

    if "refreshSeconds" in config:
        value = config["refreshSeconds"]

        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise ValueError("refreshSeconds must be number")

        if value < 0:
            raise ValueError("refreshSeconds must be >= 0")

    panels = config.get("panels")

    if panels is None:
        raise ValueError("panels is required")

    require_type(panels, dict, "panels")

    if not panels:
        raise ValueError("panels must contain at least one panel")

    for panel_name, panel in panels.items():
        if not isinstance(panel_name, str) or not panel_name.strip():
            raise ValueError("panel names must be non-empty strings")

        validate_panel(panel_name, panel)


def main():
    config_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("config.json")

    try:
        config = json.loads(config_path.read_text())
        validate_config(config)
    except FileNotFoundError:
        return fail(f"{config_path} not found")
    except json.JSONDecodeError as error:
        return fail(f"{config_path} is not valid JSON: {error}")
    except ValueError as error:
        return fail(str(error))

    print(f"{config_path} is valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
