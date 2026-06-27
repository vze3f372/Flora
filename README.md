# Flora

Flora is a local-first broadcast graphics engine for OBS Studio and Streamer.bot.

It renders configurable broadcast panels from local data files using HTML, CSS, vanilla JavaScript, JSON, and Python's standard library web server.

Flora is not intended to be only a Twitch overlay. The long-term goal is a modular panel engine for leaderboards, event cards, goals, schedules, timers, alerts, diagnostics, and future panel types.

## Principles

- Local-first
- Cross-platform
- Open source
- Lightweight
- Framework-free
- OBS Browser Source friendly
- Streamer.bot friendly
- Configuration-driven
- Panel-oriented

## Run locally

From the repository root on Linux:

```bash
./start-server-linux.sh
```

On Windows:

```bat
start-server-windows.bat
```

Then open:

```text
http://localhost:8000/panel.html?type=raids
http://localhost:8000/panel.html?type=bits
http://localhost:8000/panel.html?type=follower-goal
http://localhost:8000/panel.html?type=recent-events
```

## Current panel

The current built-in panel is:

```text
raids
```

It is configured in:

```text
config.json
```

under:

```text
panels.raids
```

The default data file is:

```text
data/raids.json
```

## OBS Browser Source

Use this URL in OBS:

```text
http://localhost:8000/panel.html?type=raids
```

## Streamer.bot

Streamer.bot should write data only. Flora handles rendering, sorting, layout, animation, and styling.

See:

```text
docs/streamerbot/raid-table-panel.md
```


## Panel rotation

Use rotation mode when one OBS browser source should cycle through multiple panels.

~~~text
http://localhost:8000/panel.html?rotation=true
~~~

Direct panel URLs still work and take priority over rotation:

~~~text
http://localhost:8000/panel.html?type=raids
http://localhost:8000/panel.html?type=bits
http://localhost:8000/panel.html?type=follower-goal
~~~

## Streamer.bot data updates

- Streamer.bot data writer: `docs/streamerbot/data-writer.md`
- Streamer.bot command examples: `docs/streamerbot/command-examples.md
- [Streamer.bot HTTP action integration](docs/streamerbot/http-actions.md)`

Flora data files can be updated with:

~~~bash
python scripts/flora-data.py --help
~~~

## Developer checks

Run the local project checks before committing:

The check script validates configuration syntax, configuration semantics, required files, and configured table panel data files.

```bash
python scripts/check.py
```

## Validate configuration

Flora includes a standard-library validation script for `config.json`.

Run:

```bash
python scripts/validate-config.py
```

Expected output:

```text
config.json is valid
```

## Documentation

- `CHANGELOG.md`
- `ROADMAP.md`
- `docs/DESIGN.md`
- `docs/configuration.md`
- `docs/streamerbot/raid-table-panel.md`
- [Streamer.bot Fetch URL recipes](docs/streamerbot/fetch-url-recipes.md)
- [Live Twitch trigger recipes](docs/streamerbot/live-trigger-recipes.md)
- [Streamer.bot Fetch URL quickstart](docs/streamerbot/fetch-url-quickstart.md)
