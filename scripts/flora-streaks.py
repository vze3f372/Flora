#!/usr/bin/env python3
import argparse
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STREAKS_FILE = ROOT / "data" / "streaks.json"
SESSIONS_FILE = ROOT / "data" / "stream-sessions.json"


def fail(message):
    raise SystemExit(f"flora-streaks error: {message}")


def require_name(value):
    text = str(value or "").strip()
    if not text:
        fail("name must not be empty")
    return text


def require_stream_id(value):
    text = str(value or "").strip()
    if not text:
        fail("stream-id must not be empty")
    return text


def now_utc():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_json_object(path, default=None):
    if default is None:
        default = {}

    try:
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except FileNotFoundError:
        return default
    except json.JSONDecodeError as error:
        fail(f"{path.relative_to(ROOT)} is not valid JSON: {error}")

    if not isinstance(data, dict):
        fail(f"{path.relative_to(ROOT)} must contain a JSON object")

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
            json.dump(data, file, indent=2, sort_keys=True)
            file.write("\n")
            temp_name = file.name

        os.replace(temp_name, path)
    finally:
        if temp_name and os.path.exists(temp_name):
            os.unlink(temp_name)


def load_sessions():
    data = load_json_object(SESSIONS_FILE, {"streams": []})
    streams = data.setdefault("streams", [])

    if not isinstance(streams, list):
        fail("data/stream-sessions.json.streams must be a list")

    normalized = []
    for stream_id in streams:
        text = str(stream_id).strip()
        if text and text not in normalized:
            normalized.append(text)

    data["streams"] = normalized
    return data


def previous_stream_id(streams, stream_id):
    try:
        index = streams.index(stream_id)
    except ValueError:
        return None

    if index <= 0:
        return None

    return streams[index - 1]


def safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def check_in(args):
    name = require_name(args.name)
    stream_id = require_stream_id(args.stream_id)

    sessions = load_sessions()
    streams = sessions["streams"]

    if stream_id not in streams:
        streams.append(stream_id)

    previous_id = previous_stream_id(streams, stream_id)

    data = load_json_object(STREAKS_FILE, {})
    existing = data.get(name, {})

    if not isinstance(existing, dict):
        existing = {}

    last_stream_id = str(existing.get("lastStreamId", "")).strip()
    current_streak = safe_int(existing.get("currentStreak"), 0)
    best_streak = safe_int(existing.get("bestStreak"), 0)
    streams_seen = safe_int(existing.get("streamsSeen"), 0)

    duplicate_check_in = last_stream_id == stream_id

    if duplicate_check_in:
        new_current_streak = current_streak
        new_streams_seen = streams_seen
    elif previous_id and last_stream_id == previous_id:
        new_current_streak = current_streak + 1
        new_streams_seen = streams_seen + 1
    else:
        new_current_streak = 1
        new_streams_seen = streams_seen + 1

    row = dict(existing)
    row.update(
        {
            "currentStreak": new_current_streak,
            "bestStreak": max(best_streak, new_current_streak),
            "streamsSeen": new_streams_seen,
            "lastStreamId": stream_id,
            "lastSeenAt": now_utc(),
        }
    )

    if "firstSeenAt" not in row:
        row["firstSeenAt"] = row["lastSeenAt"]

    data[name] = row

    if not args.dry_run:
        atomic_write_json(SESSIONS_FILE, sessions)
        atomic_write_json(STREAKS_FILE, data)

    print(
        json.dumps(
            {
                "ok": True,
                "action": "stream-streak-check-in",
                "dryRun": args.dry_run,
                "file": "data/streaks.json",
                "name": name,
                "streamId": stream_id,
                "previousStreamId": previous_id,
                "duplicateCheckIn": duplicate_check_in,
                "currentStreak": row["currentStreak"],
                "bestStreak": row["bestStreak"],
                "streamsSeen": row["streamsSeen"],
            },
            indent=2,
        )
    )


def show(args):
    print(json.dumps(load_json_object(STREAKS_FILE, {}), indent=2, sort_keys=True))


def build_parser():
    parser = argparse.ArgumentParser(description="Update Flora stream streak data.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    check_in_parser = subparsers.add_parser(
        "check-in",
        help="Record one viewer check-in for one stream.",
    )
    check_in_parser.add_argument("--name", required=True)
    check_in_parser.add_argument("--stream-id", required=True)
    check_in_parser.add_argument("--dry-run", action="store_true")
    check_in_parser.set_defaults(func=check_in)

    show_parser = subparsers.add_parser("show", help="Show current stream streak data.")
    show_parser.set_defaults(func=show)

    return parser


def main():
    args = build_parser().parse_args()
    args.func(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
