#!/usr/bin/env python3

import argparse
import json
import os
import re
import tempfile
from pathlib import Path
from datetime import datetime, timezone


ROOT = Path(__file__).resolve().parents[1]

RAIDS_FILE = ROOT / "data" / "raids.json"
BITS_FILE = ROOT / "data" / "bits.json"
SUBS_FILE = ROOT / "data" / "subs.json"
GIFT_SUBS_FILE = ROOT / "data" / "gift-subs.json"
STREAM_STREAKS_FILE = ROOT / "data" / "streaks.json"
STREAM_SESSIONS_FILE = ROOT / "data" / "stream-sessions.json"
WATCH_STREAKS_FILE = ROOT / "data" / "watch-streaks.json"
GOALS_FILE = ROOT / "data" / "goals.json"


def load_json(path, default):
    if not path.exists():
        return default

    try:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except json.JSONDecodeError as error:
        raise SystemExit(f"{path}: invalid JSON: {error}") from error


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")
EVENTS_FILE = ROOT / "data" / "events.json"

DATA_FILES = {
    "raids": RAIDS_FILE,
    "bits": BITS_FILE,
    "subs": SUBS_FILE,
    "gift-subs": GIFT_SUBS_FILE,
    "stream-streaks": STREAM_STREAKS_FILE,
    "watch-streaks": WATCH_STREAKS_FILE,
    "goals": GOALS_FILE,
    "events": EVENTS_FILE,
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




def print_result(**values):
    print(json.dumps(values, indent=2))


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



def safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def safe_int_or_none(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def raid_event_viewer_max_by_name():
    data = load_json(EVENTS_FILE, {"events": []})
    events = data.get("events", [])

    if not isinstance(events, list):
        return {}

    maximums = {}

    for event in events:
        if not isinstance(event, dict):
            continue

        if event.get("type") != "raid":
            continue

        name = str(event.get("name", "")).strip()

        if not name:
            continue

        detail = str(event.get("detail", ""))
        match = re.search(r"Raided with\s+(\d+)\s+viewer", detail, re.IGNORECASE)

        if not match:
            continue

        viewers = int(match.group(1))
        maximums[name] = max(maximums.get(name, 0), viewers)

    return maximums


def corrected_biggest_raid(name, row, event_biggest_by_name=None, current_raid_viewers=0):
    if event_biggest_by_name is None:
        event_biggest_by_name = {}

    total_viewers = safe_int(row.get("viewers"), 0)
    raids = safe_int(row.get("raids"), 0)
    existing_biggest = safe_int_or_none(row.get("biggestRaid"))
    event_biggest = safe_int(event_biggest_by_name.get(name), 0)
    current_raid_viewers = safe_int(current_raid_viewers, 0)

    candidates = [0, event_biggest, current_raid_viewers]

    if raids == 1:
        candidates.append(total_viewers)

    if existing_biggest is not None:
        existing_is_possible = 0 <= existing_biggest <= total_viewers
        existing_looks_like_total = raids > 1 and existing_biggest == total_viewers

        if existing_is_possible and not existing_looks_like_total:
            candidates.append(existing_biggest)

    return max(candidates)


def normalize_raid_row(name, row, event_biggest_by_name=None, current_raid_viewers=0):
    if not isinstance(row, dict):
        row = {}

    row["viewers"] = max(0, safe_int(row.get("viewers"), 0))
    row["raids"] = max(0, safe_int(row.get("raids"), 0))
    row["biggestRaid"] = corrected_biggest_raid(
        name,
        row,
        event_biggest_by_name=event_biggest_by_name,
        current_raid_viewers=current_raid_viewers,
    )

    return row


def normalize_raid_data(data, event_biggest_by_name=None):
    if not isinstance(data, dict):
        return {}

    normalized = {}

    for name, row in data.items():
        normalized[name] = normalize_raid_row(
            name,
            row,
            event_biggest_by_name=event_biggest_by_name,
        )

    return normalized


def repair_raids(args):
    data = load_json(RAIDS_FILE, {})

    if not isinstance(data, dict):
        data = {}

    event_biggest_by_name = raid_event_viewer_max_by_name()
    normalized = {}

    for name, row in data.items():
        if not isinstance(row, dict):
            row = {}

        viewers = max(0, safe_int(row.get("viewers"), 0))
        raids = max(0, safe_int(row.get("raids"), 0))
        existing_biggest = safe_int_or_none(row.get("biggestRaid"))
        event_biggest = safe_int(event_biggest_by_name.get(name), 0)

        candidates = [0, event_biggest]

        # If there has only been one raid, total viewers is also the single-raid size.
        if raids == 1:
            candidates.append(viewers)

        # Preserve a valid existing biggestRaid unless it is clearly just total viewers
        # on a multi-raid row.
        if existing_biggest is not None:
            existing_is_possible = 0 <= existing_biggest <= viewers
            existing_looks_like_total = raids > 1 and existing_biggest == viewers

            if existing_is_possible and not existing_looks_like_total:
                candidates.append(existing_biggest)

        new_row = dict(row)
        new_row["viewers"] = viewers
        new_row["raids"] = raids
        new_row["biggestRaid"] = max(candidates)

        normalized[name] = new_row

    changed = normalized != data

    if changed and not args.dry_run:
        save_json(RAIDS_FILE, normalized)

    print_result(
        action="repair-raids",
        dryRun=args.dry_run,
        changed=changed,
        rows=len(normalized),
        file="data/raids.json",
    )

def repair_current_raid(args):
    data = load_json(RAIDS_FILE, {})
    event_biggest_by_name = raid_event_viewer_max_by_name()

    if args.name not in data or not isinstance(data.get(args.name), dict):
        data[args.name] = {
            "viewers": 0,
            "raids": 0,
            "biggestRaid": 0,
        }

    before = dict(data[args.name])
    data[args.name] = normalize_raid_row(
        args.name,
        data[args.name],
        event_biggest_by_name=event_biggest_by_name,
        current_raid_viewers=args.viewers,
    )
    after = data[args.name]
    changed = before != after

    if changed and not args.dry_run:
        save_json(RAIDS_FILE, data)

    print_result(
        action="repair-current-raid",
        dryRun=args.dry_run,
        changed=changed,
        file="data/raids.json",
        name=args.name,
        viewers=after["viewers"],
        raids=after["raids"],
        biggestRaid=after["biggestRaid"],
        currentRaidViewers=args.viewers,
    )



def update_raid(args):
    name = require_non_empty_text(args.name, "name")

    data = load_json_object(RAIDS_FILE)
    event_biggest_by_name = raid_event_viewer_max_by_name()
    normalize_raid_data(data, event_biggest_by_name)

    row = data.setdefault(
        name,
        {
            "viewers": 0,
            "raids": 0,
            "biggestRaid": 0,
        },
    )
    row = normalize_raid_row(
        name,
        row,
        event_biggest_by_name=event_biggest_by_name,
        current_raid_viewers=args.viewers,
    )
    data[name] = row

    previous_biggest = row["biggestRaid"]

    row["viewers"] = row["viewers"] + args.viewers
    row["raids"] = row["raids"] + args.raids
    row["biggestRaid"] = max(previous_biggest, args.viewers)

    save_json_object(RAIDS_FILE, data, args.dry_run)

    print_json(make_result(
        "raid",
        dry_run=args.dry_run,
        file="data/raids.json",
        name=name,
        viewers=row["viewers"],
        raids=row["raids"],
        biggestRaid=row["biggestRaid"],
        previousBiggestRaid=previous_biggest,
        currentRaidViewers=args.viewers,
    ))


def update_bits(args):
    name = require_non_empty_text(args.name, "name")

    data = load_json_object(BITS_FILE)
    row = data.setdefault(name, {})

    if not isinstance(row, dict):
        fail(f"data/bits.json.{name} must contain a JSON object")

    row["bits"] = int(row.get("bits", 0)) + args.bits
    row["cheers"] = int(row.get("cheers", 0)) + args.cheers
    row["biggestCheer"] = max(int(row.get("biggestCheer", 0)), args.bits)

    save_json_object(BITS_FILE, data, args.dry_run)

    print_json(make_result(
        "bits",
        dry_run=args.dry_run,
        file="data/bits.json",
        name=name,
        bits=row["bits"],
        cheers=row["cheers"],
        biggestCheer=row["biggestCheer"],
    ))




def load_stream_sessions():
    data = load_json(STREAM_SESSIONS_FILE, {"streams": []})

    if not isinstance(data, dict):
        fail("data/stream-sessions.json must contain a JSON object")

    streams = data.setdefault("streams", [])

    if not isinstance(streams, list):
        fail("data/stream-sessions.json.streams must be a list")

    normalized_streams = []

    for stream_id in streams:
        text = str(stream_id).strip()

        if text and text not in normalized_streams:
            normalized_streams.append(text)

    data["streams"] = normalized_streams
    return data


def previous_stream_id(streams, stream_id):
    try:
        index = streams.index(stream_id)
    except ValueError:
        return streams[-1] if streams else ""

    if index <= 0:
        return ""

    return streams[index - 1]


def update_stream_streak(args):
    name = require_non_empty_text(args.name, "name")
    stream_id = require_non_empty_text(args.stream_id, "stream id")
    checked_in_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    sessions = load_stream_sessions()
    streams = sessions["streams"]
    previous_id = previous_stream_id(streams, stream_id)

    if stream_id not in streams:
        streams.append(stream_id)

    data = load_json_object(STREAM_STREAKS_FILE)
    row = data.setdefault(name, {})

    if not isinstance(row, dict):
        fail(f"data/streaks.json.{name} must contain a JSON object")

    previous_current_streak = safe_int(row.get("currentStreak"), 0)
    previous_best_streak = safe_int(row.get("bestStreak"), 0)
    previous_streams_seen = safe_int(row.get("streamsSeen"), 0)
    last_stream_id = str(row.get("lastStreamId", "")).strip()

    duplicate_check_in = last_stream_id == stream_id

    if duplicate_check_in:
        current_streak = previous_current_streak
        streams_seen = previous_streams_seen
    elif previous_id and last_stream_id == previous_id:
        current_streak = previous_current_streak + 1
        streams_seen = previous_streams_seen + 1
    else:
        current_streak = 1
        streams_seen = previous_streams_seen + 1

    row["currentStreak"] = current_streak
    row["bestStreak"] = max(previous_best_streak, current_streak)
    row["streamsSeen"] = streams_seen
    row["lastStreamId"] = stream_id
    row["lastSeenAt"] = checked_in_at

    if "firstSeenAt" not in row:
        row["firstSeenAt"] = checked_in_at

    save_json_object(STREAM_SESSIONS_FILE, sessions, args.dry_run)
    save_json_object(STREAM_STREAKS_FILE, data, args.dry_run)

    print_json(make_result(
        "stream-streak",
        dry_run=args.dry_run,
        file="data/streaks.json",
        sessionsFile="data/stream-sessions.json",
        name=name,
        streamId=stream_id,
        previousStreamId=previous_id,
        duplicateCheckIn=duplicate_check_in,
        currentStreak=row["currentStreak"],
        bestStreak=row["bestStreak"],
        streamsSeen=row["streamsSeen"],
        previousCurrentStreak=previous_current_streak,
        previousBestStreak=previous_best_streak,
        previousStreamsSeen=previous_streams_seen,
        lastSeenAt=row["lastSeenAt"],
    ))


def update_watch_streak(args):
    name = require_non_empty_text(args.name, "name")
    watch_streak = args.watch_streak
    watch_streak_id = str(args.watch_streak_id or "").strip()
    message = str(args.message or "").strip()
    shared_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    data = load_json_object(WATCH_STREAKS_FILE)
    row = data.setdefault(name, {})

    if not isinstance(row, dict):
        fail(f"data/watch-streaks.json.{name} must contain a JSON object")

    previous_watch_streak = safe_int(row.get("watchStreak"), 0)
    previous_best_watch_streak = safe_int(row.get("bestWatchStreak"), 0)

    row["watchStreak"] = watch_streak
    row["bestWatchStreak"] = max(previous_best_watch_streak, watch_streak)

    if watch_streak_id:
        row["watchStreakId"] = watch_streak_id

    if message:
        row["systemMessage"] = message

    row["lastSharedAt"] = shared_at

    save_json_object(WATCH_STREAKS_FILE, data, args.dry_run)

    print_json(make_result(
        "watch-streak",
        dry_run=args.dry_run,
        file="data/watch-streaks.json",
        name=name,
        watchStreak=row["watchStreak"],
        bestWatchStreak=row["bestWatchStreak"],
        previousWatchStreak=previous_watch_streak,
        previousBestWatchStreak=previous_best_watch_streak,
        watchStreakId=row.get("watchStreakId", ""),
        lastSharedAt=row["lastSharedAt"],
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


def pluralize(value, singular, plural=None):
    if value == 1:
        return singular

    return plural or f"{singular}s"



def increment_goal(args):
    key = require_non_empty_text(args.key, "key")
    amount = args.amount

    data = load_json_object(GOALS_FILE)
    row = data.setdefault(key, {})

    if not isinstance(row, dict):
        fail(f"data/goals.json.{key} must contain a JSON object")

    current = row.get("current", 0)

    if not isinstance(current, int):
        fail(f"data/goals.json.{key}.current must be an integer")

    row["current"] = current + amount

    if "target" not in row:
        fail("target is required when creating a new goal")

    target = row["target"]

    if not isinstance(target, int) or target <= 0:
        fail(f"data/goals.json.{key}.target must be a positive integer")

    save_json_object(GOALS_FILE, data, args.dry_run)

    print(
        json.dumps(
            make_result(
                "goal-increment",
                dryRun=args.dry_run,
                file="data/goals.json",
                key=key,
                amount=amount,
                previous=current,
                current=row["current"],
                target=target,
            ),
            indent=2,
        )
    )


def write_event(event_type, name, detail, event_time, keep, dry_run):
    event_type = require_non_empty_text(event_type, "type")
    name = require_non_empty_text(name, "name")
    detail = require_non_empty_text(detail, "detail")
    event_time = require_non_empty_text(event_time, "time")
    created_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    data = load_json_object(EVENTS_FILE)
    events = data.setdefault("events", [])

    if not isinstance(events, list):
        fail("data/events.json.events must be a list")

    event = {
        "type": event_type,
        "name": name,
        "detail": detail,
        "time": event_time,
        "createdAt": created_at,
    }

    events.insert(0, event)
    del events[keep:]

    save_json_object(EVENTS_FILE, data, dry_run)

    print_json(make_result(
        "event",
        dry_run=dry_run,
        file="data/events.json",
        type=event_type,
        name=name,
        detail=detail,
        time=event_time,
        kept=len(events),
    ))



def parse_bool_like(value):
    if value is None:
        return None

    text = str(value).strip().lower()

    if text == "":
        return None

    if text in {"1", "true", "yes", "y", "on"}:
        return True

    if text in {"0", "false", "no", "n", "off"}:
        return False

    return None


def update_subs(args):
    name = require_non_empty_text(args.name, "name")
    data = load_json_object(SUBS_FILE)

    existing = data.get(name, {})

    if not isinstance(existing, dict):
        existing = {}

    previous_subs = safe_int(existing.get("subs"), 0)
    previous_total_months = safe_int(existing.get("totalMonths"), 0)
    previous_streak_months = safe_int(existing.get("streakMonths"), 0)

    total_months = previous_total_months

    if args.total_months is not None:
        total_months = max(previous_total_months, safe_int(args.total_months, 0))

    streak_months = previous_streak_months

    if args.streak_months is not None:
        streak_months = safe_int(args.streak_months, 0)

    tier = str(args.tier or existing.get("tier", "")).strip()
    is_prime_sub = parse_bool_like(args.is_prime_sub)

    if is_prime_sub is None:
        is_prime_sub = bool(existing.get("isPrimeSub", False))

    row = dict(existing)
    row.update({
        "subs": previous_subs + args.subs,
        "totalMonths": total_months,
        "streakMonths": streak_months,
        "tier": tier,
        "isPrimeSub": bool(is_prime_sub),
        "lastSub": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    })

    data[name] = row
    save_json_object(SUBS_FILE, data, args.dry_run)

    print_json(make_result(
        "sub-leaderboard",
        dry_run=args.dry_run,
        file="data/subs.json",
        name=name,
        subs=row["subs"],
        totalMonths=row["totalMonths"],
        streakMonths=row["streakMonths"],
        tier=row["tier"],
        isPrimeSub=row["isPrimeSub"],
    ))



def update_gift_subs(args):
    name = require_non_empty_text(args.name, "name")
    data = load_json_object(GIFT_SUBS_FILE)

    existing = data.get(name, {})

    if not isinstance(existing, dict):
        existing = {}

    previous_gifts = safe_int(existing.get("gifts"), 0)
    previous_events = safe_int(existing.get("giftEvents"), 0)

    gifts = previous_gifts + args.gift_count

    if args.total_gifted is not None:
        gifts = max(gifts, safe_int(args.total_gifted, 0))

    anonymous = parse_bool_like(args.anonymous)

    if anonymous is None:
        anonymous = bool(existing.get("anonymous", False))

    months_gifted = safe_int(existing.get("monthsGifted"), 0)

    if args.months_gifted is not None:
        months_gifted = safe_int(args.months_gifted, 0)

    row = dict(existing)
    row.update({
        "gifts": gifts,
        "giftEvents": previous_events + 1,
        "lastGiftCount": args.gift_count,
        "lastRecipient": str(args.recipient or existing.get("lastRecipient", "")).strip(),
        "tier": str(args.tier or existing.get("tier", "")).strip(),
        "anonymous": bool(anonymous),
        "monthsGifted": months_gifted,
        "lastGift": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    })

    data[name] = row
    save_json_object(GIFT_SUBS_FILE, data, args.dry_run)

    print_json(make_result(
        "gift-sub-leaderboard",
        dry_run=args.dry_run,
        file="data/gift-subs.json",
        name=name,
        gifts=row["gifts"],
        giftEvents=row["giftEvents"],
        lastGiftCount=row["lastGiftCount"],
        lastRecipient=row["lastRecipient"],
        tier=row["tier"],
        anonymous=row["anonymous"],
        monthsGifted=row["monthsGifted"],
    ))


def add_event(args):
    write_event(
        args.type,
        args.name,
        args.detail,
        args.time,
        args.keep,
        args.dry_run,
    )


def add_raid_event(args):
    detail = f"Raided with {args.viewers} {pluralize(args.viewers, 'viewer')}"

    write_event(
        "raid",
        args.name,
        detail,
        args.time,
        args.keep,
        args.dry_run,
    )


def add_bits_event(args):
    detail = f"Cheered {args.bits} {pluralize(args.bits, 'bit')}"

    write_event(
        "bits",
        args.name,
        detail,
        args.time,
        args.keep,
        args.dry_run,
    )


def add_follow_event(args):
    write_event(
        "follow",
        args.name,
        "Followed the channel",
        args.time,
        args.keep,
        args.dry_run,
    )


def add_sub_event(args):
    write_event(
        "sub",
        args.name,
        "Subscribed to the channel",
        args.time,
        args.keep,
        args.dry_run,
    )


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

    sub_leaderboard = subparsers.add_parser(
        "sub-leaderboard",
        help="Update subscription leaderboard statistics for one user.",
    )
    sub_leaderboard.add_argument("--name", required=True)
    sub_leaderboard.add_argument("--total-months", type=non_negative_int("total-months"))
    sub_leaderboard.add_argument("--streak-months", type=non_negative_int("streak-months"))
    sub_leaderboard.add_argument("--subs", default=1, type=positive_int("subs"))
    sub_leaderboard.add_argument("--tier", default="")
    sub_leaderboard.add_argument("--is-prime-sub", default="")
    add_dry_run_argument(sub_leaderboard)
    sub_leaderboard.set_defaults(func=update_subs)

    gift_sub_leaderboard = subparsers.add_parser(
        "gift-sub-leaderboard",
        help="Update gift subscription leaderboard statistics for one user.",
    )
    gift_sub_leaderboard.add_argument("--name", required=True)
    gift_sub_leaderboard.add_argument("--recipient", default="")
    gift_sub_leaderboard.add_argument("--gift-count", default=1, type=positive_int("gift-count"))
    gift_sub_leaderboard.add_argument("--total-gifted", type=non_negative_int("total-gifted"))
    gift_sub_leaderboard.add_argument("--tier", default="")
    gift_sub_leaderboard.add_argument("--anonymous", default="")
    gift_sub_leaderboard.add_argument("--months-gifted", type=non_negative_int("months-gifted"))
    add_dry_run_argument(gift_sub_leaderboard)
    gift_sub_leaderboard.set_defaults(func=update_gift_subs)



    stream_streak = subparsers.add_parser(
        "stream-streak",
        help="Update the Flora attendance streak leaderboard.",
    )
    stream_streak.add_argument("--name", required=True)
    stream_streak.add_argument("--stream-id", required=True)
    stream_streak.add_argument("--dry-run", action="store_true")
    stream_streak.set_defaults(func=update_stream_streak)

    watch_streak = subparsers.add_parser(
        "watch-streak",
        help="Update the Twitch native watch streak leaderboard.",
    )
    watch_streak.add_argument("--name", required=True)
    watch_streak.add_argument("--watch-streak", required=True, type=non_negative_int("watch streak"))
    watch_streak.add_argument("--watch-streak-id", default="")
    watch_streak.add_argument("--message", default="")
    watch_streak.add_argument("--dry-run", action="store_true")
    watch_streak.set_defaults(func=update_watch_streak)

    goal = subparsers.add_parser(
        "goal",
        help="Set current and optionally target values for one goal.",
    )
    goal.add_argument("--key", required=True)
    goal.add_argument("--current", required=True, type=non_negative_int("current"))
    goal.add_argument("--target", type=positive_int("target"))
    add_dry_run_argument(goal)
    goal.set_defaults(func=update_goal)

    goal_increment = subparsers.add_parser(
        "goal-increment",
        help="Increment the current value for one goal.",
    )
    goal_increment.add_argument("--key", required=True)
    goal_increment.add_argument("--amount", type=positive_int("amount"), default=1)
    add_dry_run_argument(goal_increment)
    goal_increment.set_defaults(func=increment_goal)

    event = subparsers.add_parser(
        "event",
        help="Append a recent stream event.",
    )
    event.add_argument("--type", required=True)
    event.add_argument("--name", required=True)
    event.add_argument("--detail", required=True)
    event.add_argument("--time", default="Just now")
    event.add_argument("--keep", default=25, type=positive_int("keep"))
    add_dry_run_argument(event)
    event.set_defaults(func=add_event)

    raid_event = subparsers.add_parser(
        "raid-event",
        help="Append a raid event with generated detail text.",
    )
    raid_event.add_argument("--name", required=True)
    raid_event.add_argument("--viewers", required=True, type=non_negative_int("viewers"))
    raid_event.add_argument("--time", default="Just now")
    raid_event.add_argument("--keep", default=25, type=positive_int("keep"))
    add_dry_run_argument(raid_event)
    raid_event.set_defaults(func=add_raid_event)

    bits_event = subparsers.add_parser(
        "bits-event",
        help="Append a bits event with generated detail text.",
    )
    bits_event.add_argument("--name", required=True)
    bits_event.add_argument("--bits", required=True, type=non_negative_int("bits"))
    bits_event.add_argument("--time", default="Just now")
    bits_event.add_argument("--keep", default=25, type=positive_int("keep"))
    add_dry_run_argument(bits_event)
    bits_event.set_defaults(func=add_bits_event)

    follow_event = subparsers.add_parser(
        "follow-event",
        help="Append a follow event.",
    )
    follow_event.add_argument("--name", required=True)
    follow_event.add_argument("--time", default="Just now")
    follow_event.add_argument("--keep", default=25, type=positive_int("keep"))
    add_dry_run_argument(follow_event)
    follow_event.set_defaults(func=add_follow_event)

    sub_event = subparsers.add_parser(
        "sub-event",
        help="Append a subscription event.",
    )
    sub_event.add_argument("--name", required=True)
    sub_event.add_argument("--time", default="Just now")
    sub_event.add_argument("--keep", default=25, type=positive_int("keep"))
    add_dry_run_argument(sub_event)
    sub_event.set_defaults(func=add_sub_event)

    repair_raids_parser = subparsers.add_parser(
        "repair-raids",
        help="Normalize raid data and repair missing biggestRaid fields.",
    )
    add_dry_run_argument(repair_raids_parser)
    repair_raids_parser.set_defaults(func=repair_raids)

    repair_current_raid_parser = subparsers.add_parser("repair-current-raid")
    repair_current_raid_parser.add_argument("--name", required=True)
    repair_current_raid_parser.add_argument("--viewers", type=int, required=True)
    repair_current_raid_parser.add_argument("--dry-run", action="store_true")
    repair_current_raid_parser.set_defaults(func=repair_current_raid)


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
