#!/usr/bin/env python3
"""Safely update Flora without overwriting local runtime data."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKUP_ROOT = ROOT / "backups" / "manual-update"

DEFAULT_REPO = "vze3f372/Flora"

RUNTIME_DEFAULTS = {
    ROOT / "data" / "raids.json": ROOT / "data" / "defaults" / "raids.json",
    ROOT / "data" / "bits.json": ROOT / "data" / "defaults" / "bits.json",
    ROOT / "data" / "subs.json": ROOT / "data" / "defaults" / "subs.json",
    ROOT / "data" / "gift-subs.json": ROOT / "data" / "defaults" / "gift-subs.json",
    ROOT / "data" / "events.json": ROOT / "data" / "defaults" / "events.json",
    ROOT / "data" / "goals.json": ROOT / "data" / "defaults" / "goals.json",
}

PRESERVED_RUNTIME_FILES = {
    Path("data/raids.json"),
    Path("data/bits.json"),
    Path("data/subs.json"),
    Path("data/gift-subs.json"),
    Path("data/events.json"),
    Path("data/goals.json"),
    Path("data/avatar-cache.json"),
}

PRESERVED_RUNTIME_DIRS = {
    Path("assets/avatars"),
    Path("backups"),
    Path("logs"),
    Path(".git"),
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


def relative(path: Path) -> Path:
    return path.resolve().relative_to(ROOT.resolve())


def has_git_repo() -> bool:
    completed = run(
        ["git", "rev-parse", "--show-toplevel"],
        check=False,
        echo_output=False,
    )

    if completed.returncode != 0:
        return False

    try:
        return Path(completed.stdout.strip()).resolve() == ROOT.resolve()
    except OSError:
        return False


def ensure_git_repo() -> None:
    completed = run(
        ["git", "rev-parse", "--show-toplevel"],
        check=False,
        echo_output=False,
    )

    if completed.returncode != 0:
        details = completed.stderr.strip() or completed.stdout.strip() or "git rev-parse failed"
        raise SystemExit(
            "This Flora folder is not a Git repository.\n\n"
            "The updater can still update downloaded release folders, but Git mode "
            "requires a cloned repository with a .git directory.\n\n"
            f"Git error: {details}"
        )

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


def update_repo_with_git(*, dry_run: bool = False) -> None:
    run(["git", "fetch", "--tags", "origin"], dry_run=dry_run)
    run(["git", "pull", "--ff-only", "origin", "main"], dry_run=dry_run)


def latest_release_tag(repo: str, *, dry_run: bool = False) -> str:
    url = f"https://api.github.com/repos/{repo}/releases/latest"

    if dry_run:
        log(f"dry-run: would query latest GitHub release from {url}")
        return "latest"

    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "Flora-Updater",
        },
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        data = json.loads(response.read().decode("utf-8"))

    tag = str(data.get("tag_name", "")).strip()

    if not tag:
        raise SystemExit("Could not determine latest release tag from GitHub.")

    return tag


def download_with_python(url: str, destination: Path) -> None:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Flora-Updater",
        },
    )

    with urllib.request.urlopen(request, timeout=120) as response:
        with destination.open("wb") as output:
            shutil.copyfileobj(response, output)


def download_with_command(command: list[str], destination: Path) -> bool:
    completed = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )

    if completed.returncode == 0 and destination.exists() and destination.stat().st_size > 0:
        return True

    if completed.stderr.strip():
        print(completed.stderr.strip(), file=sys.stderr)

    return False


def download_release_zip(repo: str, tag: str, target_dir: Path, *, dry_run: bool = False) -> Path:
    url = f"https://github.com/{repo}/archive/refs/tags/{tag}.zip"
    destination = target_dir / f"flora-{tag}.zip"

    if dry_run:
        log(f"dry-run: would download {url}")
        return destination

    log(f"downloading release archive: {tag}")

    try:
        download_with_python(url, destination)
        return destination
    except (OSError, urllib.error.URLError) as error:
        log(f"Python download failed: {error}")

    if os.name == "nt":
        log("trying Windows curl.exe download fallback")
        if download_with_command(["curl.exe", "-L", "--fail", "-o", str(destination), url], destination):
            return destination

        log("trying PowerShell download fallback")
        powershell_command = [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            (
                "$ProgressPreference = 'SilentlyContinue'; "
                f"Invoke-WebRequest -Uri '{url}' -OutFile '{destination}'"
            ),
        ]

        if download_with_command(powershell_command, destination):
            return destination

    raise SystemExit(
        "Could not download the Flora release archive. "
        "Check the internet connection, Windows certificate store, antivirus HTTPS inspection, or download the release manually."
    )


def extract_release_zip(archive: Path, target_dir: Path, *, dry_run: bool = False) -> Path:
    if dry_run:
        fake_root = target_dir / "Flora-release"
        log(f"dry-run: would extract {archive.name}")
        return fake_root

    extract_dir = target_dir / "extracted"
    extract_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(archive, "r") as zip_file:
        zip_file.extractall(extract_dir)

    roots = [path for path in extract_dir.iterdir() if path.is_dir()]

    if len(roots) != 1:
        raise SystemExit(f"Expected one extracted release folder, found {len(roots)}.")

    return roots[0]


def path_is_inside(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def should_preserve(relative_path: Path, *, preserve_config: bool) -> bool:
    if preserve_config and relative_path == Path("config.json"):
        return True

    if relative_path in PRESERVED_RUNTIME_FILES:
        return True

    for preserved_dir in PRESERVED_RUNTIME_DIRS:
        if relative_path == preserved_dir or path_is_inside(relative_path, preserved_dir):
            return True

    return False


def overlay_release_files(source_root: Path, *, preserve_config: bool, dry_run: bool = False) -> None:
    copied = 0
    skipped = 0

    if dry_run:
        log("dry-run: would overlay release files while preserving runtime data")
        return

    for source in source_root.rglob("*"):
        rel = source.relative_to(source_root)

        if should_preserve(rel, preserve_config=preserve_config):
            skipped += 1
            continue

        destination = ROOT / rel

        if source.is_dir():
            destination.mkdir(parents=True, exist_ok=True)
            continue

        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        copied += 1

    log(f"release files copied: {copied}")
    log(f"runtime/config paths preserved: {skipped}")

    if preserve_config:
        release_config = source_root / "config.json"
        if release_config.exists():
            shutil.copy2(release_config, ROOT / "config.release.json")
            log("release config saved as config.release.json")


def merge_missing_config_defaults(local_value, release_value):
    if not isinstance(local_value, dict) or not isinstance(release_value, dict):
        return local_value

    for key, release_child in release_value.items():
        if key not in local_value:
            local_value[key] = release_child
            continue

        local_child = local_value[key]

        if isinstance(local_child, dict) and isinstance(release_child, dict):
            merge_missing_config_defaults(local_child, release_child)

    return local_value


def merge_release_config_defaults(source_root: Path, *, dry_run: bool = False) -> None:
    local_config_path = ROOT / "config.json"
    release_config_path = source_root / "config.json"

    if not local_config_path.exists() or not release_config_path.exists():
        return

    if dry_run:
        log("dry-run: would merge missing release config defaults into config.json")
        return

    with local_config_path.open("r", encoding="utf-8") as input_file:
        local_config = json.load(input_file)

    with release_config_path.open("r", encoding="utf-8") as input_file:
        release_config = json.load(input_file)

    before = json.dumps(local_config, sort_keys=True)
    merge_missing_config_defaults(local_config, release_config)
    after = json.dumps(local_config, sort_keys=True)

    if before == after:
        log("config.json already contains release defaults")
        return

    with local_config_path.open("w", encoding="utf-8") as output_file:
        json.dump(local_config, output_file, indent=2)
        output_file.write("\n")

    log("merged missing release config defaults into config.json")


def update_from_archive(
    *,
    repo: str,
    tag: str | None,
    preserve_config: bool,
    dry_run: bool = False,
) -> None:
    release_tag = tag or latest_release_tag(repo, dry_run=dry_run)
    log(f"archive update target: {repo} {release_tag}")

    if dry_run:
        log("dry-run: archive update would preserve data/, assets/avatars/, backups/, and logs/")
        log("dry-run: existing config.json would be preserved")
        log("dry-run: missing release config defaults would be merged into config.json")
        if tag is None:
            log("dry-run: pass --tag vX.Y.Z to preview a specific release")
        return

    with tempfile.TemporaryDirectory(prefix="flora-update-") as temp_name:
        temp_dir = Path(temp_name)
        archive = download_release_zip(repo, release_tag, temp_dir, dry_run=dry_run)
        source_root = extract_release_zip(archive, temp_dir, dry_run=dry_run)
        overlay_release_files(source_root, preserve_config=preserve_config, dry_run=dry_run)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Safely update Flora.")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen without changing files.")
    parser.add_argument("--skip-stop", action="store_true", help="Do not stop a running Flora server.")
    parser.add_argument("--allow-non-main", action="store_true", help="Allow Git mode outside the main branch.")
    parser.add_argument(
        "--mode",
        choices=["auto", "git", "archive"],
        default="auto",
        help="Update mode. Auto uses Git when .git exists, otherwise archive mode.",
    )
    parser.add_argument("--repo", default=DEFAULT_REPO, help="GitHub repo for archive mode, for example owner/name.")
    parser.add_argument("--tag", help="Specific release tag for archive mode, for example v0.15.10.")
    parser.add_argument(
        "--replace-config",
        action="store_true",
        help="Archive mode only: replace config.json with the release version. Default preserves config.json.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    mode = args.mode

    if mode == "auto":
        mode = "git" if has_git_repo() else "archive"

    log(f"selected update mode: {mode}")

    if mode == "git":
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

    if mode == "git":
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
        update_repo_with_git(dry_run=args.dry_run)

    else:
        log("updating from GitHub release archive")
        update_from_archive(
            repo=args.repo,
            tag=args.tag,
            preserve_config=not args.replace_config,
            dry_run=args.dry_run,
        )

    log("ensuring runtime files exist")
    ensure_runtime_files(dry_run=args.dry_run)

    log("running validation")
    run_validation(dry_run=args.dry_run)

    print()
    print("Flora update complete.")
    print("Runtime data was preserved.")

    if mode == "archive" and not args.replace_config:
        print("Existing config.json was preserved.")
        print("Missing release config defaults were merged into config.json.")
        print("The full release config was saved as config.release.json.")

    print("Admin UI: http://127.0.0.1:8000/admin.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
