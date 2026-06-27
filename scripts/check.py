#!/usr/bin/env python3

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "README.md",
    "CHANGELOG.md",
    "ROADMAP.md",
    "config.json",
    "panel.html",
    "js/panel.js",
    "css/base.css",
    "css/layout.css",
    "css/panel.css",
    "css/table.css",
    "css/goal.css",
    "css/events.css",
    "css/animations.css",
    "css/themes/cyan.css",
    "data/raids.json",
    "data/bits.json",
    "data/goals.json",
    "data/events.json",
    "scripts/validate-config.py",
    "scripts/flora-data.py",
    "docs/streamerbot/http-actions.md",
    "docs/streamerbot/fetch-url-recipes.md",
    "docs/streamerbot/live-trigger-recipes.md",
    "docs/streamerbot/fetch-url-quickstart.md",
    "scripts/flora-server.py",
]


def fail(message):
    print(f"check error: {message}", file=sys.stderr)
    raise SystemExit(1)


def check_required_files():
    print("==> checking required files")

    for relative_path in REQUIRED_FILES:
        path = ROOT / relative_path

        if not path.exists():
            fail(f"missing required file: {relative_path}")


def run_command(command):
    result = subprocess.run(
        command,
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
    )

    if result.returncode != 0:
        message = result.stderr.strip() or "command failed"
        fail(message)


def load_json_file(relative_path):
    path = ROOT / relative_path

    try:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError:
        fail(f"{relative_path} does not exist")
    except json.JSONDecodeError as error:
        fail(f"{relative_path} is not valid JSON: {error}")


def is_number(value):
    return not isinstance(value, bool) and isinstance(value, (int, float))


def check_config_json_syntax():
    print("==> checking config.json syntax")
    run_command(["python", "-m", "json.tool", "config.json"])


def check_config_semantics():
    print("==> checking config.json semantics")
    run_command(["python", "scripts/validate-config.py"])


def get_panels(config):
    panels = config.get("panels")

    if not isinstance(panels, dict) or not panels:
        fail("config.json must define at least one panel in panels")

    return panels


def check_data_file_exists(panel_name, panel):
    data_file = panel.get("dataFile")

    if not isinstance(data_file, str) or not data_file.strip():
        fail(f"panels.{panel_name}.dataFile must not be empty")

    if not (ROOT / data_file).exists():
        fail(f"panels.{panel_name}.dataFile does not exist: {data_file}")


def check_table_panel_data(panel_name, panel):
    data_file = panel["dataFile"]
    data = load_json_file(data_file)

    if not isinstance(data, dict):
        fail(f"{data_file} must contain a JSON object")

    sort_fields = [
        field for field in [
            panel.get("sortBy"),
            panel.get("sortThenBy"),
        ]
        if field
    ]

    column_fields = [
        column.get("field")
        for column in panel.get("columns", [])
        if isinstance(column, dict) and column.get("field")
    ]

    required_fields = list(dict.fromkeys(sort_fields + column_fields))

    for name, stats in data.items():
        if not isinstance(name, str) or not name.strip():
            fail(f"{data_file} contains an empty row name")

        if not isinstance(stats, dict):
            fail(f"{data_file}.{name} must contain a JSON object")

        for field in required_fields:
            if field not in stats:
                fail(f"{data_file}.{name} is missing field: {field}")

        for field in sort_fields:
            if not is_number(stats[field]):
                fail(f"{data_file}.{name}.{field} must be numeric")


def check_goal_panel_data(panel_name, panel):
    data_file = panel["dataFile"]
    data = load_json_file(data_file)

    if not isinstance(data, dict):
        fail(f"{data_file} must contain a JSON object")

    goal_key = panel.get("goalKey")

    if not isinstance(goal_key, str) or not goal_key.strip():
        fail(f"panels.{panel_name}.goalKey must not be empty")

    goal = data.get(goal_key)

    if not isinstance(goal, dict):
        fail(f"{data_file} is missing goal key: {goal_key}")

    for field in ["current", "target"]:
        if field not in goal:
            fail(f"{data_file}.{goal_key} is missing field: {field}")

        if not is_number(goal[field]):
            fail(f"{data_file}.{goal_key}.{field} must be numeric")

    if goal["target"] <= 0:
        fail(f"{data_file}.{goal_key}.target must be greater than zero")


def check_events_panel_data(panel_name, panel):
    data_file = panel["dataFile"]
    data = load_json_file(data_file)

    if not isinstance(data, dict):
        fail(f"{data_file} must contain a JSON object")

    events = data.get("events")

    if not isinstance(events, list):
        fail(f"{data_file}.events must be a list")

    for index, event in enumerate(events):
        if not isinstance(event, dict):
            fail(f"{data_file}.events[{index}] must contain a JSON object")

        for field in ["type", "name", "detail", "time"]:
            value = event.get(field)

            if not isinstance(value, str) or not value.strip():
                fail(f"{data_file}.events[{index}].{field} must not be empty")


def check_config_shape():
    print("==> checking config.json shape")

    config = load_json_file("config.json")
    panels = get_panels(config)

    for panel_name, panel in panels.items():
        if not isinstance(panel, dict):
            fail(f"panels.{panel_name} must be an object")

        check_data_file_exists(panel_name, panel)

        panel_type = panel.get("type", "table")

        if panel_type == "table":
            check_table_panel_data(panel_name, panel)
            continue

        if panel_type == "goal":
            check_goal_panel_data(panel_name, panel)
            continue

        if panel_type == "events":
            check_events_panel_data(panel_name, panel)
            continue

        fail(f"panels.{panel_name}.type is not supported: {panel_type}")


def check_readme_references():
    print("==> checking README references")

    readme = (ROOT / "README.md").read_text(encoding="utf-8")

    required_terms = [
        "panel.html?type=raids",
        "panel.html?type=bits",
        "python scripts/check.py",
    ]

    for term in required_terms:
        if term not in readme:
            fail(f"README.md is missing reference: {term}")


def main():
    check_required_files()
    check_config_json_syntax()
    check_config_semantics()
    check_config_shape()
    check_readme_references()

    print("All checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
