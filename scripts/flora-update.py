#!/usr/bin/env python3
"""Safely update Flora without overwriting local runtime data."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKUP_ROOT = ROOT / "backups" / "manual-update"

RUNTIME_DEFAULTS = {
    ROOT / "data" / "raids.json": ROOT / "data" / "defaults" / "raids.json",
    ROOT / "data" / "bits.json": ROOT / "data" / "defaults" / "bits.json",
    ROOT / "data" / "subs.json": ROOT / "data" / "defaults" / "subs.json",
    ROOT / "data" / "gift-subs.json": ROOT / "data" / "defaults" / "gift-subs.json",
    ROOT / "data" / "events.json": ROOT / "data" / "defaults" / "events.json",
    ROOT / "data" / "goals.json": ROOT / "data" / "defaults" / "goals.json",
}


def log(message: str) -> None:
    print(f"==> {message}")


def run(
    command: list[str],
    *,
    check: bool = True,
    dry_run: bool = False,
    echo_output: bool = True,
) -> subprocess.CompletedProcess[str]:
    printable = " ".join(command)

    if dry_run:
        log(f"dry-run: {printable}")
        return subprocess.CompletedProcess(command, 0, "", "")

    completed = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )

    if echo_output and completed.stdout.strip():
        print(completed.stdout.strip())

    if echo_output and completed.stderr.strip():
        print(completed.stderr.strip(), file=sys.stderr)

    if check and completed.returncode != 0:
        raise SystemExit(f"Command failed: {printable}")

    return completed


def timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def ensure_git_repo() -> None:
    completed = run(["git", "rev-parse", "--show-toplevel"], check=True, echo_output=False)
    repo_root = Path(completed.stdout.strip()).resolve()

    if repo_root != ROOT.resolve():
        raise SystemExit(f"Updater must run from Flora repo root. Expected {ROOT}, got {repo_root}")


def current_branch() -> str:
    completed = run(["git", "branch", "--show-current"], check=True, echo_output=False)
    return completed.stdout.strip()


def git_status_lines() -> list[str]:
    completed = run(["git", "status", "--porcelain", "--untracked-files=all"], check=True, echo_output=False)
    return [line for line in completed.stdout.splitlines() if line.strip()]


def create_backup(*, dry_run: bool = False) -> Path:
    backup_dir = BACKUP_ROOT / timestamp()

    if dry_run:
        log(f"dry-run: would create backup at {backup_dir.relative_to(ROOT)}")
        return backup_dir

    backup_dir.mkdir(parents=True, exist_ok=True)

    config = ROOT / "config.json"

    if config.exists():
        shutil.copy2(config, backup_dir / "config.json")

    data_dir = ROOT / "data"

    if data_dir.exists():
        shutil.copytree(data_dir, backup_dir / "data", dirs_exist_ok=True)

    avatar_dir = ROOT / "assets" / "avatars"

    if avatar_dir.exists():
        destination = backup_dir / "assets" / "avatars"
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(avatar_dir, destination, dirs_exist_ok=True)

    log(f"backup created: {backup_dir.relative_to(ROOT)}")
    return backup_dir


def stop_flora(*, dry_run: bool = False) -> None:
    if os.name == "nt":
        command = [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            (
                "$patterns = 'flora-server.py','flora-launcher.py'; "
                "Get-CimInstance Win32_Process | "
                "Where-Object { $cmd = $_.CommandLine; $cmd -and ($patterns | Where-Object { $cmd -match [regex]::Escape($_) }) } | "
                "ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
            ),
        ]
        run(command, check=False, dry_run=dry_run)
        return

    run(["pkill", "-f", "[s]cripts/flora-server.py"], check=False, dry_run=dry_run)
    run(["pkill", "-f", "[s]cripts/flora-launcher.py"], check=False, dry_run=dry_run)


def ensure_runtime_files(*, dry_run: bool = False) -> None:
    for destination, source in RUNTIME_DEFAULTS.items():
        if destination.exists():
            continue

        if not source.exists():
            raise SystemExit(f"Missing runtime default: {source.relative_to(ROOT)}")

        if dry_run:
            log(f"dry-run: would recreate {destination.relative_to(ROOT)} from {source.relative_to(ROOT)}")
            continue

        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        log(f"created missing runtime file: {destination.relative_to(ROOT)}")


def run_validation(*, dry_run: bool = False) -> None:
    python = sys.executable

    run([
        python,
        "-m",
        "py_compile",
        "scripts/flora-data.py",
        "scripts/flora-server.py",
        "scripts/flora-launcher.py",
        "scripts/validate-config.py",
        "scripts/check.py",
    ], dry_run=dry_run)

    run([python, "scripts/check.py"], dry_run=dry_run)
    run([python, "scripts/validate-config.py"], dry_run=dry_run)


def update_repo(*, dry_run: bool = False) -> None:
    run(["git", "fetch", "--tags", "origin"], dry_run=dry_run)
    run(["git", "pull", "--ff-only", "origin", "main"], dry_run=dry_run)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Safely update Flora.")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen without changing files.")
    parser.add_argument("--skip-stop", action="store_true", help="Do not stop a running Flora server.")
    parser.add_argument("--allow-non-main", action="store_true", help="Allow running outside the main branch.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    log("checking repository")
    ensure_git_repo()

    branch = current_branch()

    if branch != "main" and not args.allow_non_main:
        raise SystemExit(f"Refusing to update from branch {branch!r}. Check out main first.")

    if not args.skip_stop:
        log("stopping Flora server if it is running")
        stop_flora(dry_run=args.dry_run)

    log("creating safety backup")
    backup_dir = create_backup(dry_run=args.dry_run)

    status = git_status_lines()

    if status:
        print()
        print("Flora has local Git changes:")
        for line in status:
            print(f"  {line}")
        print()
        print(f"Safety backup: {backup_dir.relative_to(ROOT)}")
        raise SystemExit("Refusing to update with local Git changes. Commit, stash, or restore them first.")

    log("updating repository with fast-forward only")
    update_repo(dry_run=args.dry_run)

    log("ensuring runtime files exist")
    ensure_runtime_files(dry_run=args.dry_run)

    log("running validation")
    run_validation(dry_run=args.dry_run)

    print()
    print("Flora update complete.")
    print("Runtime data was preserved.")
    print("Admin UI: http://127.0.0.1:8000/admin.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
