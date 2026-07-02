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

## What the updater does

The updater:

1. Stops the Flora server if it is running.
2. Creates a backup of local config and runtime data.
3. Refuses to continue if there are local Git changes.
4. Fetches updates and tags from origin.
5. Updates the repo with fast-forward only.
6. Recreates missing runtime files from data/defaults/.
7. Runs Flora validation checks.

## Important safety behavior

The updater preserves ignored runtime data.

If `config.json` or source files have local edits, the updater refuses to continue. This avoids overwriting local customization or creating Git conflicts.

To preview what the updater would do without changing files:

    ./update-flora-linux.sh --dry-run

On Windows:

    update-flora-windows.bat --dry-run
