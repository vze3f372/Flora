# Updating Flora

Flora includes update scripts for Linux and Windows.

The updater is designed to preserve local runtime data. It does not delete or reset live stream data.

Runtime data includes:

- data/raids.json
- data/bits.json
- data/subs.json
- data/gift-subs.json
- data/events.json
- data/goals.json
- data/avatar-cache.json
- assets/avatars/

Before updating, Flora creates a timestamped safety backup under:

    backups/manual-update/

The backup includes:

- config.json
- data/
- assets/avatars/

## Linux update

From the Flora folder:

    ./update-flora-linux.sh

## Windows update

From the Flora folder, double-click:

    update-flora-windows.bat

Or run it from Command Prompt:

    update-flora-windows.bat

## Update modes

The updater automatically chooses the safest available update mode.

### Git mode

If the Flora folder contains a `.git/` directory, the updater uses Git mode.

Git mode:

1. Stops the Flora server if it is running.
2. Creates a backup of local config and runtime data.
3. Refuses to continue if there are local Git changes.
4. Fetches updates and tags from origin.
5. Updates the repo with fast-forward only.
6. Recreates missing runtime files from data/defaults/.
7. Runs Flora validation checks.

### Archive mode

If the Flora folder does not contain a `.git/` directory, the updater uses archive mode.

Archive mode is intended for downloaded GitHub release folders such as:

    Flora-0.15.10

Archive mode:

1. Stops the Flora server if it is running.
2. Creates a backup of local config and runtime data.
3. Downloads the latest Flora release archive from GitHub.
4. Extracts the release to a temporary folder.
5. Copies new application files into the existing Flora folder.
6. Preserves runtime data.
7. Preserves the existing config.json by default.
8. Saves the release config as config.release.json.
9. Recreates missing runtime files from data/defaults/.
10. Runs Flora validation checks.

## Preview an update

To preview what the updater would do without changing files:

    ./update-flora-linux.sh --dry-run

On Windows:

    update-flora-windows.bat --dry-run

## Update to a specific release

To update a downloaded release folder to a specific tag:

    ./update-flora-linux.sh --mode archive --tag v0.15.10

On Windows:

    update-flora-windows.bat --mode archive --tag v0.15.10

## Important safety behavior

The updater preserves ignored runtime data.

In archive mode, the updater also preserves `config.json` by default. The release version of the config is saved as:

    config.release.json

To replace `config.json` with the release version during an archive update, use:

    ./update-flora-linux.sh --mode archive --replace-config

On Windows:

    update-flora-windows.bat --mode archive --replace-config

## Recovery from an older release archive

Releases before v0.15.10 had a Git-only updater.

If an older downloaded release folder shows this error:

    Command failed: git rev-parse --show-toplevel

download v0.15.10 or newer, then either:

1. Copy your old `data/`, `assets/avatars/`, and `config.json` into the newer Flora folder, or
2. Copy the newer updater files into the old Flora folder and run the updater again.

The updater files are:

- scripts/flora-update.py
- update-flora-linux.sh
- update-flora-windows.bat
