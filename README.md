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

## Documentation

- `ROADMAP.md`
- `docs/DESIGN.md`
- `docs/streamerbot/raid-table-panel.md`
