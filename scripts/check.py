#!/usr/bin/env python3

import json
import subprocess
import sys
from pathlib import Path


REQUIRED_FILES = [
    "README.md",
    "ROADMAP.md",
    "config.json",
    "panel.html",
    "data/raids.json",
    "js/panel.js",
    "css/base.css",
    "css/layout.css",
    "css/panel.css",
    "css/table.css",
    "css/animations.css",
    "css/themes/cyan.css",
    "docs/DESIGN.md",
    "docs/configuration.md",
    "docs/streamerbot/raid-table-panel.md",
    "scripts/validate-config.py",
]

REQUIRED_README_REFERENCES = [
    "docs/configuration.md",
    "docs/streamerbot/raid-table-panel.md",
    "python scripts/validate-config.py",
]

REQUIRED_CONFIG_KEYS = [
    "theme",
    "refreshSeconds",
    "panels",
]


def print_step(message):
    print(f"==> {message}")


def fail(message):
    print(f"check failed: {message}", file=sys.stderr)
    return 1


def run_command(command):
    result = subprocess.run(
        command,
        text=True,
        stdout=subprocess.DEVNULL,
    )

    if result.returncode != 0:
        raise RuntimeError("command failed: " + " ".join(command))


def check_required_files():
    print_step("checking required files")

    missing = [path for path in REQUIRED_FILES if not Path(path).exists()]

    if missing:
        raise ValueError("missing required files: " + ", ".join(missing))


def check_json_syntax():
    print_step("checking config.json syntax")
    run_command([sys.executable, "-m", "json.tool", "config.json"])


def check_config_validator():
    print_step("checking config.json semantics")
    run_command([sys.executable, "scripts/validate-config.py"])


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def load_json_file(path):
    try:
        return json.loads(Path(path).read_text())
    except json.JSONDecodeError as error:
        raise ValueError(f"{path} is not valid JSON: {error}") from error


def check_table_panel_data(panel_name, panel):
    panel_path = f"panels.{panel_name}"
    data_file = panel.get("dataFile")

    if not data_file:
        raise ValueError(f"{panel_path}.dataFile is required")

    data_path = Path(data_file)

    if not data_path.exists():
        raise ValueError(f"{panel_path}.dataFile does not exist: {data_file}")

    data = load_json_file(data_path)

    if not isinstance(data, dict):
        raise ValueError(f"{data_file} must contain a JSON object")

    sort_fields = [
        field
        for field in [panel.get("sortBy"), panel.get("sortThenBy")]
        if field
    ]

    columns = panel.get("columns", [])
    column_fields = [
        column.get("field")
        for column in columns
        if isinstance(column, dict) and column.get("field")
    ]

    required_fields = list(dict.fromkeys(sort_fields + column_fields))

    for row_name, row in data.items():
        row_path = f"{data_file}.{row_name}"

        if not isinstance(row_name, str) or not row_name.strip():
            raise ValueError(f"{data_file} contains an empty row name")

        if not isinstance(row, dict):
            raise ValueError(f"{row_path} must be an object")

        for field in required_fields:
            if field not in row:
                raise ValueError(f"{row_path} missing field: {field}")

        for field in sort_fields:
            if not is_number(row[field]):
                raise ValueError(f"{row_path}.{field} must be numeric")


def check_config_shape():
    print_step("checking config.json shape")

    config = json.loads(Path("config.json").read_text())

    for key in REQUIRED_CONFIG_KEYS:
        if key not in config:
            raise ValueError(f"config.json missing top-level key: {key}")

    panels = config["panels"]

    if "raids" not in panels:
        raise ValueError("config.json missing panels.raids")

    for panel_name, panel in panels.items():
        panel_path = f"panels.{panel_name}"

        if panel.get("type") != "table":
            raise ValueError(f"{panel_path}.type must be table")

        check_table_panel_data(panel_name, panel)


def check_readme_references():
    print_step("checking README references")

    readme = Path("README.md").read_text()

    missing = [
        reference
        for reference in REQUIRED_README_REFERENCES
        if reference not in readme
    ]

    if missing:
        raise ValueError("README.md missing references: " + ", ".join(missing))


def main():
    try:
        check_required_files()
        check_json_syntax()
        check_config_validator()
        check_config_shape()
        check_readme_references()
    except (RuntimeError, ValueError) as error:
        return fail(str(error))

    print("All checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
