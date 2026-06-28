# Legacy Raid Table Panel Reference

> This is a legacy low-level reference for the raid table data format. For normal Streamer.bot setup, use `setup-checklist.md` and the Admin UI Streamer.bot Action Builder instead.


This document describes how to configure Streamer.bot to provide raid data for Flora.

Flora renders the panel in OBS. Streamer.bot should only write data to the local JSON file.

## Data file

The default raid table panel reads from:

```text
data/raids.json
```

The renderer finds this file through the panel configuration in:

```text
config.json
```

The current raid panel is configured under:

```text
panels.raids
```

## Data format

`data/raids.json` should contain a JSON object where each key is a raider name and each value contains raid statistics.

Example:

```json
{
  "ExampleRaider": {
    "viewers": 25,
    "raids": 1
  }
}
```

## OBS Browser Source URL

Use this local URL in an OBS Browser Source:

```text
http://localhost:8000/panel.html?type=raids
```

Recommended OBS Browser Source settings:

```text
Width: 1920
Height: 1080
Custom CSS: leave empty unless intentionally overriding Flora
Shutdown source when not visible: optional
Refresh browser when scene becomes active: optional
```

## Streamer.bot responsibility

Streamer.bot should update only the JSON data file.

Streamer.bot should not control layout, animation, styling, sorting, or rendering behaviour. Those concerns belong to Flora.

## Suggested Streamer.bot action

Create an action named:

```text
Flora - Record Raid
```

The action should:

```text
1. Read the current data/raids.json file.
2. Add the raider if they do not already exist.
3. Increment the raider's raid count.
4. Add or update the viewer count.
5. Write the updated JSON back to data/raids.json.
```

## Renderer refresh

Flora periodically reloads its configured data file according to `refreshSeconds` in `config.json`.

The default is:

```json
"refreshSeconds": 3
```

This means Streamer.bot only needs to write valid JSON. Flora will pick up the change automatically.

## Separation of concerns

Flora owns:

```text
- layout
- rendering
- sorting
- animation
- styling
- panel configuration
```

Streamer.bot owns:

```text
- detecting stream events
- updating local data files
```
