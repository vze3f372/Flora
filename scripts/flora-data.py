#!/usr/bin/env python3

import argparse
import json
import os
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

RAIDS_FILE = ROOT / "data" / "raids.json"
BITS_FILE = ROOT / "data" / "bits.json"
GOALS_FILE = ROOT / "data" / "goals.json"


def fail(message):
    raise SystemExit(f"flora-data error: {message}")


def require_non_empty_text(value, label):
    if not isinstance(value, str) or not value.strip():
        fail(f"{label} must not be empty")

    return value.strip()


def require_non_negative_int(value, label):
    if value < 0:
        fail(f"{label} must be greater than or equal to zero")

    return value


def require_positive_int(value, label):
    if value <= 0:
        fail(f"{label} must be greater than zero")

    return value


def load_json_object(path):
    try:
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError as error:
        fail(f"{path.relative_to(ROOT)} is not valid JSON: {error}")

    if not isinstance(data, dict):
        fail(f"{path.relative_to(ROOT)} must contain a JSON object")

    return data


def atomic_write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(
        "w",
        encoding="utf-8",
        dir=path.parent,
        delete=False,
    ) as file:
        json.dump(data, file, indent=2)
        file.write("\n")
        temp_name = file.name

    os.replace(temp_name, path)


def print_json(data):
    print(json.dumps(data, indent=2, sort_keys=True))


def update_raid(args):
    name = require_non_empty_text(args.name, "name")
    viewers = require_non_negative_int(args.viewers, "viewers")
    raids = require_positive_int(args.raids, "raids")

    data = load_json_object(RAIDS_FILE)
    row = data.setdefault(name, {})

    if not isinstance(row, dict):
        fail(f"data/raids.json.{name} must contain a JSON object")

    row["viewers"] = int(row.get("viewers", 0)) + viewers
    row["raids"] = int(row.get("raids", 0)) + raids

    atomic_write_json(RAIDS_FILE, data)

    print_json({
        "updated": "raids",
        "name": name,
        "viewers": row["viewers"],
        "raids": row["raids"],
    })


def update_bits(args):
    name = require_non_empty_text(args.name, "name")
    bits = require_non_negative_int(args.bits, "bits")
    cheers = require_positive_int(args.cheers, "cheers")

    data = load_json_object(BITS_FILE)
    row = data.setdefault(name, {})

    if not isinstance(row, dict):
        fail(f"data/bits.json.{name} must contain a JSON object")

    row["bits"] = int(row.get("bits", 0)) + bits
    row["cheers"] = int(row.get("cheers", 0)) + cheers

    atomic_write_json(BITS_FILE, data)

    print_json({
        "updated": "bits",
        "name": name,
        "bits": row["bits"],
        "cheers": row["cheers"],
    })


def update_goal(args):
    key = require_non_empty_text(args.key, "key")
    current = require_non_negative_int(args.current, "current")

    data = load_json_object(GOALS_FILE)
    row = data.setdefault(key, {})

    if not isinstance(row, dict):
        fail(f"data/goals.json.{key} must contain a JSON object")

    row["current"] = current

    if args.target is not None:
        row["target"] = require_positive_int(args.target, "target")
    elif "target" not in row:
        fail("target is required when creating a new goal")

    atomic_write_json(GOALS_FILE, data)

    print_json({
        "updated": "goal",
        "key": key,
        "current": row["current"],
        "target": row["target"],
    })


def reset_panel(args):
    if not args.yes:
        fail("reset requires --yes")

    targets = {
        "raids": RAIDS_FILE,
        "bits": BITS_FILE,
        "goals": GOALS_FILE,
    }

    path = targets[args.panel]
    atomic_write_json(path, {})

    print_json({
        "reset": args.panel,
        "file": str(path.relative_to(ROOT)),
    })


def build_parser():
    parser = argparse.ArgumentParser(
        description="Update Flora JSON data files safely."
    )

    subparsers = parser.add_subparsers(
        dest="command",
        required=True,
    )

    raid = subparsers.add_parser(
        "raid",
        help="Increment raid statistics for one raider.",
    )
    raid.add_argument("--name", required=True)
    raid.add_argument("--viewers", required=True, type=int)
    raid.add_argument("--raids", default=1, type=int)
    raid.set_defaults(func=update_raid)

    bits = subparsers.add_parser(
        "bits",
        help="Increment bits and cheer statistics for one user.",
    )
    bits.add_argument("--name", required=True)
    bits.add_argument("--bits", required=True, type=int)
    bits.add_argument("--cheers", default=1, type=int)
    bits.set_defaults(func=update_bits)

    goal = subparsers.add_parser(
        "goal",
        help="Set current and optionally target values for one goal.",
    )
    goal.add_argument("--key", required=True)
    goal.add_argument("--current", required=True, type=int)
    goal.add_argument("--target", type=int)
    goal.set_defaults(func=update_goal)

    reset = subparsers.add_parser(
        "reset",
        help="Reset one Flora data file to an empty JSON object.",
    )
    reset.add_argument(
        "--panel",
        required=True,
        choices=["raids", "bits", "goals"],
    )
    reset.add_argument("--yes", action="store_true")
    reset.set_defaults(func=reset_panel)

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
