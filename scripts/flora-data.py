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

DATA_FILES = {
    "raids": RAIDS_FILE,
    "bits": BITS_FILE,
    "goals": GOALS_FILE,
}


def fail(message):
    raise SystemExit(f"flora-data error: {message}")


def parse_int(value, label):
    try:
        return int(value)
    except ValueError:
        raise argparse.ArgumentTypeError(f"{label} must be an integer")


def non_negative_int(label):
    def parse(value):
        number = parse_int(value, label)

        if number < 0:
            raise argparse.ArgumentTypeError(f"{label} must be greater than or equal to zero")

        return number

    return parse


def positive_int(label):
    def parse(value):
        number = parse_int(value, label)

        if number <= 0:
            raise argparse.ArgumentTypeError(f"{label} must be greater than zero")

        return number

    return parse


def require_non_empty_text(value, label):
    if not isinstance(value, str) or not value.strip():
        fail(f"{label} must not be empty")

    return value.strip()


def require_existing_object(value, path):
    if not isinstance(value, dict):
        fail(f"{path} must contain a JSON object")


def load_json_object(path):
    try:
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError as error:
        fail(f"{path.relative_to(ROOT)} is not valid JSON: {error}")

    require_existing_object(data, path.relative_to(ROOT))
    return data


def atomic_write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)

    temp_name = None

    try:
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
    finally:
        if temp_name and os.path.exists(temp_name):
            os.unlink(temp_name)


def save_json_object(path, data, dry_run=False):
    if dry_run:
        return

    atomic_write_json(path, data)


def print_json(data):
    print(json.dumps(data, indent=2, sort_keys=True))


def make_result(action, dry_run=False, **fields):
    result = {
        "action": action,
        "dryRun": dry_run,
    }
    result.update(fields)
    return result


def update_raid(args):
    name = require_non_empty_text(args.name, "name")

    data = load_json_object(RAIDS_FILE)
    row = data.setdefault(name, {})

    if not isinstance(row, dict):
        fail(f"data/raids.json.{name} must contain a JSON object")

    row["viewers"] = int(row.get("viewers", 0)) + args.viewers
    row["raids"] = int(row.get("raids", 0)) + args.raids

    save_json_object(RAIDS_FILE, data, args.dry_run)

    print_json(make_result(
        "raid",
        dry_run=args.dry_run,
        file="data/raids.json",
        name=name,
        viewers=row["viewers"],
        raids=row["raids"],
    ))


def update_bits(args):
    name = require_non_empty_text(args.name, "name")

    data = load_json_object(BITS_FILE)
    row = data.setdefault(name, {})

    if not isinstance(row, dict):
        fail(f"data/bits.json.{name} must contain a JSON object")

    row["bits"] = int(row.get("bits", 0)) + args.bits
    row["cheers"] = int(row.get("cheers", 0)) + args.cheers

    save_json_object(BITS_FILE, data, args.dry_run)

    print_json(make_result(
        "bits",
        dry_run=args.dry_run,
        file="data/bits.json",
        name=name,
        bits=row["bits"],
        cheers=row["cheers"],
    ))


def update_goal(args):
    key = require_non_empty_text(args.key, "key")

    data = load_json_object(GOALS_FILE)
    row = data.setdefault(key, {})

    if not isinstance(row, dict):
        fail(f"data/goals.json.{key} must contain a JSON object")

    row["current"] = args.current

    if args.target is not None:
        row["target"] = args.target
    elif "target" not in row:
        fail("target is required when creating a new goal")

    save_json_object(GOALS_FILE, data, args.dry_run)

    print_json(make_result(
        "goal",
        dry_run=args.dry_run,
        file="data/goals.json",
        key=key,
        current=row["current"],
        target=row["target"],
    ))


def reset_panel(args):
    if not args.yes:
        fail("reset requires --yes")

    path = DATA_FILES[args.panel]

    save_json_object(path, {}, args.dry_run)

    print_json(make_result(
        "reset",
        dry_run=args.dry_run,
        panel=args.panel,
        file=str(path.relative_to(ROOT)),
    ))


def show_data(args):
    if args.panel == "all":
        print_json({
            panel: load_json_object(path)
            for panel, path in DATA_FILES.items()
        })
        return

    print_json(load_json_object(DATA_FILES[args.panel]))


def add_dry_run_argument(parser):
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview the update without writing to disk.",
    )


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
    raid.add_argument("--viewers", required=True, type=non_negative_int("viewers"))
    raid.add_argument("--raids", default=1, type=positive_int("raids"))
    add_dry_run_argument(raid)
    raid.set_defaults(func=update_raid)

    bits = subparsers.add_parser(
        "bits",
        help="Increment bits and cheer statistics for one user.",
    )
    bits.add_argument("--name", required=True)
    bits.add_argument("--bits", required=True, type=non_negative_int("bits"))
    bits.add_argument("--cheers", default=1, type=positive_int("cheers"))
    add_dry_run_argument(bits)
    bits.set_defaults(func=update_bits)

    goal = subparsers.add_parser(
        "goal",
        help="Set current and optionally target values for one goal.",
    )
    goal.add_argument("--key", required=True)
    goal.add_argument("--current", required=True, type=non_negative_int("current"))
    goal.add_argument("--target", type=positive_int("target"))
    add_dry_run_argument(goal)
    goal.set_defaults(func=update_goal)

    reset = subparsers.add_parser(
        "reset",
        help="Reset one Flora data file to an empty JSON object.",
    )
    reset.add_argument(
        "--panel",
        required=True,
        choices=sorted(DATA_FILES),
    )
    reset.add_argument("--yes", action="store_true")
    add_dry_run_argument(reset)
    reset.set_defaults(func=reset_panel)

    show = subparsers.add_parser(
        "show",
        help="Show current Flora data.",
    )
    show.add_argument(
        "--panel",
        default="all",
        choices=["all", *sorted(DATA_FILES)],
    )
    show.set_defaults(func=show_data)

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
