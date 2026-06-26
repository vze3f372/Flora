# Flora Configuration

Flora is configured through `config.json`.

The configuration file controls the active theme, data refresh interval, and available panels.

## Top-level fields

```json
{
  "theme": "cyan",
  "refreshSeconds": 3,
  "panels": {}
}
```

### `theme`

The `theme` field selects the visual theme.

Current default:

```json
"theme": "cyan"
```

Theme styles live in:

```text
css/themes/
```

### `refreshSeconds`

The `refreshSeconds` field controls how often Flora reloads the active panel data file.

Example:

```json
"refreshSeconds": 3
```

A value greater than `0` enables periodic reloads.

### `panels`

The `panels` object contains named panel configurations.

Example:

```json
"panels": {
  "raids": {}
}
```

A panel is selected through the browser URL:

```text
http://localhost:8000/panel.html?type=raids
```

The `type` query parameter maps to a key in `panels`.

## Multiple panels

Flora can define multiple panels under the same `panels` object.

Example:

~~~json
"panels": {
  "raids": {
    "type": "table"
  },
  "bits": {
    "type": "table"
  }
}
~~~

The selected panel is controlled by the `type` query parameter:

~~~text
http://localhost:8000/panel.html?type=raids
http://localhost:8000/panel.html?type=bits
~~~

Each panel can use its own title, subtitle, data file, sort fields, columns, and scroll settings.


## Table panels

The current supported panel type is:

```json
"type": "table"
```

A table panel renders ranked rows from a JSON data file.

Example:

```json
{
  "type": "table",
  "title": "TOP RAIDERS",
  "subtitle": "THANK YOU FOR THE SUPPORT",
  "dataFile": "data/raids.json",
  "maxRows": 10,
  "sortBy": "viewers",
  "sortThenBy": "raids",
  "columns": [],
  "scroll": {}
}
```

### `rankLabel`

Optional label for the rank column.

Example:

~~~json
"rankLabel": "Rank"
~~~

If omitted, Flora displays:

~~~text
Rank
~~~

### `nameLabel`

Optional label for the name column.

Example:

~~~json
"nameLabel": "Raider"
~~~

If omitted, Flora displays:

~~~text
Name
~~~

### `title`

Displayed as the main panel title.

### `subtitle`

Displayed below the panel title.

### `dataFile`

Path to the local JSON data file read by the renderer.

Example:

```json
"dataFile": "data/raids.json"
```

### `emptyMessage`

Optional text displayed when a table panel data file is valid but contains no rows.

Example:

~~~json
"emptyMessage": "No raids recorded yet"
~~~

If omitted, Flora displays:

~~~text
No entries yet
~~~

### `maxRows`

Maximum number of rows displayed before scroll duplication is applied.

Example:

```json
"maxRows": 10
```

### `sortBy`

Primary numeric field used for descending sort order.

Example:

```json
"sortBy": "viewers"
```

### `sortThenBy`

Optional secondary numeric field used when the primary sort field is tied.

Example:

```json
"sortThenBy": "raids"
```

## Columns

Table panel columns are configured with the `columns` array.

Example:

```json
"columns": [
  {
    "label": "Viewers",
    "field": "viewers",
    "className": "primary-number",
    "align": "center",
    "width": "150px"
  }
]
```

### `label`

Text displayed in the table header.

### `field`

Data field read from each row in the panel data file.

### `className`

Optional CSS modifier used for styling the column values.

### `align`

Optional text alignment.

Common values:

```text
left
center
right
```

### `width`

CSS width used when building the table grid.

Example:

```json
"width": "150px"
```

## Scroll configuration

Table panels can scroll when their content exceeds the visible row area.

Example:

```json
"scroll": {
  "enabled": true,
  "speedPixelsPerSecond": 24,
  "startDelaySeconds": 1,
  "gapPixels": 20
}
```

### `enabled`

Enables or disables automatic scrolling.

### `speedPixelsPerSecond`

Controls scroll speed.

### `startDelaySeconds`

Delay before scrolling begins.

### `gapPixels`

Vertical gap between the original rows and duplicated rows in the scroll loop.

## Data file format

The current raid table panel expects an object where each key is a display name and each value contains numeric fields referenced by the table configuration.

Example:

```json
{
  "ExampleRaider": {
    "viewers": 25,
    "raids": 1
  }
}
```

## Legacy compatibility

Flora currently supports the old top-level `leaderboards` configuration root as a temporary fallback.

New configuration should use:

```json
"panels": {}
```

The legacy fallback should not be used for new features.

## Panel rotation

Panel rotation allows one OBS browser source to cycle through multiple panels.

Example:

~~~json
"rotation": {
  "enabled": false,
  "startPanel": "raids",
  "transitionMilliseconds": 500,
  "panels": [
    {
      "panel": "raids",
      "durationSeconds": 10
    },
    {
      "panel": "bits",
      "durationSeconds": 10
    },
    {
      "panel": "follower-goal",
      "durationSeconds": 12
    }
  ]
}
~~~

Use this URL to force rotation mode:

~~~text
http://localhost:8000/panel.html?rotation=true
~~~

Direct panel URLs take priority over rotation:

~~~text
http://localhost:8000/panel.html?type=raids
~~~

`rotation.enabled` is optional. When set to `true`, Flora rotates panels when no direct `type` query is provided.

`rotation.startPanel` controls which configured rotation panel is shown first.

Use the `start` query parameter to override the starting panel for a specific browser source:

~~~text
http://localhost:8000/panel.html?rotation=true&start=bits
~~~

Use the `duration` query parameter to temporarily override all rotation durations:

~~~text
http://localhost:8000/panel.html?rotation=true&duration=3
~~~

Use the `debug` query parameter to show a small rotation status overlay:

~~~text
http://localhost:8000/panel.html?rotation=true&debug=true
~~~

`rotation.transitionMilliseconds` controls the fade/dissolve duration between panels. Use `0` to disable the transition.

Each rotation entry must reference an existing panel and define a positive `durationSeconds` value.

## Goal panels

### Goal panel progress colors

Goal panels support optional progress bar color configuration.

~~~json
"progressFill": "#5eead4",
"progressEmpty": "#16323a"
~~~

`progressFill` controls the filled portion of the progress bar.

`progressEmpty` controls the unfilled portion of the progress bar.

Both values must be hex colors.

Supported examples:

~~~text
#fff
#ffffff
#ffffffff
~~~

If omitted, Flora uses the default cyan/teal goal colors.

### Goal panel display options

Goal panels support optional display configuration.

~~~json
"numberFormat": "plain",
"completeMessage": "Goal reached!",
"showPercent": true
~~~

`numberFormat` controls how current and target values are displayed.

Supported values:

~~~text
plain
compact
~~~

`plain` displays full numbers such as `12500`.

`compact` displays shortened numbers such as `12.5K`.

`completeMessage` is displayed instead of the percentage text when `current` is greater than or equal to `target`.

`showPercent` controls whether the percentage text is displayed. The progress bar is still displayed when `showPercent` is `false`.


Goal panels display progress toward a numeric target.

Example:

~~~json
"follower-goal": {
  "type": "goal",
  "title": "FOLLOWER GOAL",
  "subtitle": "THANK YOU FOR THE SUPPORT",
  "dataFile": "data/goals.json",
  "goalKey": "followers",
  "currentLabel": "Followers",
  "targetLabel": "Goal",
  "percentLabel": "Complete"
}
~~~

The data file must contain an object keyed by `goalKey`.

Example:

~~~json
{
  "followers": {
    "current": 42,
    "target": 100
  }
}
~~~

Required fields:

~~~text
type
title
subtitle
dataFile
goalKey
~~~

Optional labels:

~~~text
currentLabel
targetLabel
percentLabel
~~~

`current` and `target` must be numeric. `target` must be greater than zero.

## Event panels

Event panels display recent stream activity.

Example:

~~~json
"recent-events": {
  "type": "events",
  "title": "RECENT ACTIVITY",
  "subtitle": "LATEST STREAM EVENTS",
  "dataFile": "data/events.json",
  "maxEvents": 8,
  "emptyMessage": "No recent events yet"
}
~~~

The data file must contain an `events` array.

Example:

~~~json
{
  "events": [
    {
      "type": "raid",
      "name": "ExampleRaider",
      "detail": "Raided with 25 viewers",
      "time": "Just now"
    }
  ]
}
~~~

Each event must include:

~~~text
type
name
detail
time
~~~

### Event type labels and colors

Event panels support optional display configuration per event type.

~~~json
"eventTypes": {
  "raid": {
    "label": "RAID",
    "color": "#5eead4"
  },
  "bits": {
    "label": "BITS",
    "color": "#67e8f9"
  }
}
~~~

`label` controls the text displayed for the event type.

`color` controls the event type text color. Colors must be hex values.

If an event type is not configured, Flora displays the raw event type from the data file.
