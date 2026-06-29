# Runtime Data and Defaults

Flora separates versioned starter data from local runtime data.

## Versioned default files

These files are tracked by Git:

- `data/defaults/raids.json`
- `data/defaults/bits.json`
- `data/defaults/events.json`
- `data/defaults/goals.json`

They provide clean starter data for a fresh checkout or for recreating missing runtime files.

## Local runtime files

These files are created and updated while Flora runs:

- `data/raids.json`
- `data/bits.json`
- `data/events.json`
- `data/goals.json`
- `data/avatar-cache.json`
- `logs/flora-server.log`
- files under `assets/avatars/`
- files under `backups/`

These files are intentionally ignored by Git. Normal stream activity, panel refreshes, raid tests, bits tests, avatar downloads, and server logs should not dirty the working tree.

## Startup behavior

When the Flora server starts, it checks for the main runtime data files. If any are missing, Flora recreates them from `data/defaults/`.

This means a fresh clone does not need committed live runtime data files. Start the server normally:

    python scripts/flora-launcher.py

## Resetting runtime data

Preferred method:

1. Open `admin.html`.
2. Go to the Data Safety tab.
3. Use the Runtime Reset tools.

Manual reset method:

    cd /home/vze3f372/Documents/streamerbot/streampanel

    pkill -f '[s]cripts/flora-server.py' 2>/dev/null || true
    sleep 1

    rm -f data/raids.json data/bits.json data/events.json data/goals.json

    python scripts/flora-launcher.py

Flora will recreate the deleted runtime files from `data/defaults/`.

## Git workflow note

Do not reset runtime data with Git restore commands. The live data files are ignored local runtime files, not versioned source files.

Use `git status --short --untracked-files=all` to verify that normal runtime activity is not dirtying the repository.
