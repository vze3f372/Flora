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
