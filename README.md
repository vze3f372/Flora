# Flora

Flora is a local-first broadcast graphics engine for OBS Studio and Streamer.bot.

It renders configurable broadcast panels from local JSON data using HTML, CSS, vanilla JavaScript, and Python's standard library HTTP server. Flora is designed to stay lightweight, local, browser-source friendly, and easy to wire into Streamer.bot.

## What Flora can do

Flora currently supports:

- Raid leaderboards
- Bits / cheer leaderboards
- Follower goals
- Subscriber goals
- Recent stream activity
- Single-panel OBS browser sources
- Default and named panel rotations
- Streamer.bot Fetch URL integration
- Twitch avatar caching for users
- Local Admin UI configuration
- Runtime data reset and restore
- Admin backups and local presets
- Built-in panel theme presets
- Built-in panel layout presets
- OBS source URL quick-copy tools

## Run locally

From the repository root on Linux:

```bash
./start-server-linux.sh
```

On Windows:

```bat
start-server-windows.bat
```

On Omarchy/Linux when Streamer.bot is running through Wine, use the Wine wrapper from Streamer.bot:

```bat
start-server-wine.bat
```

Health check:

```text
http://127.0.0.1:8000/api/health
```

Admin UI:

```text
http://127.0.0.1:8000/admin.html
```

## OBS browser sources

Open the Admin UI and use the **OBS Source URLs** card for copyable source URLs.

Common panel URLs:

```text
http://127.0.0.1:8000/panel.html?type=raids
http://127.0.0.1:8000/panel.html?type=raids-count
http://127.0.0.1:8000/panel.html?type=raids-biggest
http://127.0.0.1:8000/panel.html?type=bits
http://127.0.0.1:8000/panel.html?type=bits-count
http://127.0.0.1:8000/panel.html?type=bits-biggest
http://127.0.0.1:8000/panel.html?type=follower-goal
http://127.0.0.1:8000/panel.html?type=sub-goal
http://127.0.0.1:8000/panel.html?type=recent-events
```

Rotation URLs:

```text
http://127.0.0.1:8000/panel.html?rotation=true
http://127.0.0.1:8000/panel.html?rotation=leaderboards
http://127.0.0.1:8000/panel.html?rotation=goals
```

## Streamer.bot setup

For normal setup, start here:

```text
docs/streamerbot/setup-checklist.md
```

The recommended workflow is:

```text
Streamer.bot trigger
  -> optional Twitch user info lookup for avatar URL
  -> Core → Network → Fetch URL
  -> Flora local API endpoint
  -> local JSON data file
  -> OBS browser source updates
```

The Admin UI includes a **Streamer.bot Action Builder** that generates Fetch URLs for common actions.

## Local Admin UI

Open:

```text
http://127.0.0.1:8000/admin.html
```

The Admin UI can manage:

- Server status and common URLs
- Goals
- Panel style colors
- Panel theme presets
- Panel layout presets
- Default panel rotation
- Named rotation groups
- Recent activity event labels and colors
- Runtime data reset
- Runtime backup restore
- Config/goals backup restore
- Admin setup presets
- OBS source URLs
- Streamer.bot Fetch URLs

## Data files

Runtime stream data is stored under:

```text
data/
```

Important runtime files:

```text
data/raids.json
data/bits.json
data/events.json
data/goals.json
data/avatar-cache.json
```

Downloaded Twitch avatars are stored under:

```text
assets/avatars/
```

Runtime cache, generated backups, and exported local presets are intentionally ignored by Git.

## Developer checks

Run these before committing:

```bash
python -m py_compile scripts/flora-data.py scripts/flora-server.py scripts/flora-launcher.py scripts/validate-config.py
python scripts/check.py
python scripts/validate-config.py
git diff --check
```

Expected check output includes:

```text
All checks passed
config.json is valid
```

## Documentation

Recommended entry points:

- [Local Admin UI Guide](docs/admin-ui.md)
- [Server Launcher Guide](docs/server-launcher.md)
- [Streamer.bot Setup Checklist](docs/streamerbot/setup-checklist.md)
- [Streamer.bot Fetch URL Quickstart](docs/streamerbot/fetch-url-quickstart.md)
- [Streamer.bot Fetch URL Recipes](docs/streamerbot/fetch-url-recipes.md)
- [Live Twitch Trigger Recipes](docs/streamerbot/live-trigger-recipes.md)

Additional project docs:

- [Design Notes](docs/DESIGN.md)
- [Configuration Guide](docs/configuration.md)
- [Roadmap](ROADMAP.md)
- [Changelog](CHANGELOG.md)
