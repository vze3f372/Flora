#!/usr/bin/env python3

import json
import re
import sys
from pathlib import Path


SUPPORTED_PANEL_TYPES = {
    "table",
    "goal",
}

ALIGN_VALUES = {
    "left",
    "center",
    "right",
}

GOAL_NUMBER_FORMATS = {
    "plain",
    "compact",
}

HEX_COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?$")


def fail(message):
    raise ValueError(message)


def require_object(value, path):
    if not isinstance(value, dict):
        fail(f"{path} must be an object")


def require_list(value, path):
    if not isinstance(value, list):
        fail(f"{path} must be a list")


def require_non_empty_string(value, path):
    if not isinstance(value, str) or not value.strip():
        fail(f"{path} must not be empty")


def require_positive_number(value, path):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value <= 0:
        fail(f"{path} must be a positive number")


def require_boolean(value, path):
    if not isinstance(value, bool):
        fail(f"{path} must be true or false")


def require_hex_color(value, path):
    require_non_empty_string(value, path)

    if not HEX_COLOR_PATTERN.match(value.strip()):
        fail(f"{path} must be a hex color such as #5eead4")


def validate_scroll(scroll, path):
    require_object(scroll, path)

    for field in ["speedPixelsPerSecond", "startDelaySeconds", "gapPixels"]:
        if field in scroll:
            require_positive_number(scroll[field], f"{path}.{field}")


def validate_columns(columns, path):
    require_list(columns, path)

    if not columns:
        fail(f"{path} must contain at least one column")

    for index, column in enumerate(columns):
        column_path = f"{path}[{index}]"
        require_object(column, column_path)

        for field in ["label", "field"]:
            require_non_empty_string(column.get(field), f"{column_path}.{field}")

        if "className" in column:
            require_non_empty_string(column["className"], f"{column_path}.className")

        if "width" in column:
            require_non_empty_string(column["width"], f"{column_path}.width")

        if "align" in column:
            require_non_empty_string(column["align"], f"{column_path}.align")

            if column["align"] not in ALIGN_VALUES:
                fail(f"{column_path}.align must be one of: {', '.join(sorted(ALIGN_VALUES))}")


def validate_common_panel_fields(panel, panel_path):
    for field in ["title", "subtitle", "dataFile"]:
        require_non_empty_string(panel.get(field), f"{panel_path}.{field}")


def validate_table_panel(panel, panel_path):
    validate_common_panel_fields(panel, panel_path)

    require_non_empty_string(panel.get("sortBy"), f"{panel_path}.sortBy")

    if "sortThenBy" in panel and panel["sortThenBy"] is not None:
        require_non_empty_string(panel["sortThenBy"], f"{panel_path}.sortThenBy")

    optional_label_fields = [
        "rankLabel",
        "nameLabel",
        "emptyMessage",
    ]

    for field in optional_label_fields:
        if field in panel:
            require_non_empty_string(panel[field], f"{panel_path}.{field}")

    max_rows = panel.get("maxRows")

    if max_rows is not None:
        if isinstance(max_rows, bool) or not isinstance(max_rows, int) or max_rows < 1:
            fail(f"{panel_path}.maxRows must be an integer greater than or equal to 1")

    validate_columns(panel.get("columns"), f"{panel_path}.columns")

    if "scroll" in panel:
        validate_scroll(panel["scroll"], f"{panel_path}.scroll")


def validate_goal_panel(panel, panel_path):
    validate_common_panel_fields(panel, panel_path)

    require_non_empty_string(panel.get("goalKey"), f"{panel_path}.goalKey")

    optional_label_fields = [
        "currentLabel",
        "targetLabel",
        "percentLabel",
        "completeMessage",
    ]

    for field in optional_label_fields:
        if field in panel:
            require_non_empty_string(panel[field], f"{panel_path}.{field}")

    if "numberFormat" in panel:
        require_non_empty_string(panel["numberFormat"], f"{panel_path}.numberFormat")

        if panel["numberFormat"] not in GOAL_NUMBER_FORMATS:
            fail(f"{panel_path}.numberFormat must be one of: {', '.join(sorted(GOAL_NUMBER_FORMATS))}")

    if "showPercent" in panel:
        require_boolean(panel["showPercent"], f"{panel_path}.showPercent")

    optional_color_fields = [
        "progressFill",
        "progressEmpty",
    ]

    for field in optional_color_fields:
        if field in panel:
            require_hex_color(panel[field], f"{panel_path}.{field}")


def validate_panel(panel, panel_path):
    require_object(panel, panel_path)

    panel_type = panel.get("type", "table")
    require_non_empty_string(panel_type, f"{panel_path}.type")

    if panel_type not in SUPPORTED_PANEL_TYPES:
        fail(f"{panel_path}.type must be one of: {', '.join(sorted(SUPPORTED_PANEL_TYPES))}")

    if panel_type == "table":
        validate_table_panel(panel, panel_path)
        return

    if panel_type == "goal":
        validate_goal_panel(panel, panel_path)
        return

    fail(f"{panel_path}.type is not supported: {panel_type}")


def validate_config(config):
    require_object(config, "config")

    if "refreshSeconds" in config:
        require_positive_number(config["refreshSeconds"], "refreshSeconds")

    panels = config.get("panels")
    require_object(panels, "panels")

    if not panels:
        fail("panels must contain at least one panel")

    for name, panel in panels.items():
        require_non_empty_string(name, "panel name")
        validate_panel(panel, f"panels.{name}")


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("config.json")

    try:
        with path.open("r", encoding="utf-8") as file:
            config = json.load(file)

        validate_config(config)
    except FileNotFoundError:
        print(f"config error: {path} does not exist", file=sys.stderr)
        return 1
    except json.JSONDecodeError as error:
        print(f"config error: {path} is not valid JSON: {error}", file=sys.stderr)
        return 1
    except ValueError as error:
        print(f"config error: {error}", file=sys.stderr)
        return 1

    print(f"{path} is valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
