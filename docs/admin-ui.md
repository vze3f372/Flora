# Flora Local Admin UI

Flora includes a local browser-based admin page for managing common stream panel settings without manually editing JSON files.

The admin page is served by the local Flora server and is intended to run on `127.0.0.1`.

```text
http://127.0.0.1:8000/admin.html
```

## Start the Flora server

From the project directory:

```bash
./start-server-linux.sh
```

This starts the local server at:

```text
http://127.0.0.1:8000
```

## Open the admin page

Open:

```text
http://127.0.0.1:8000/admin.html
```

The admin page currently provides controls for:

- follower and subscriber goals
- panel colors
- panel rotation
- recent activity event labels and colors
- copyable OBS browser source URLs
- copyable Streamer.bot Fetch URLs

## Goals

The Goals section edits the values stored in:

```text
data/goals.json
```

Available goal controls:

- Followers current
- Followers target
- Subscribers current
- Subscribers target

After editing values, click **Save Goals**.

Goal panels using these values:

```text
http://127.0.0.1:8000/panel.html?type=follower-goal
http://127.0.0.1:8000/panel.html?type=sub-goal
```

## Panel Style

The Panel Style section edits theme color tokens stored in:

```text
config.json
```

The editor controls:

- Background
- Panel
- Panel alternate
- Text
- Muted text
- Accent
- Border
- Success
- Error

After editing colors, click **Save Style**.

Refresh OBS browser sources or browser panel pages after saving style changes.

The **Accent** color is used for prominent panel highlights, including the goal progress bar.

## Panel Rotation

The Panel Rotation section edits:

```text
config.json -> rotation
```

Available controls:

- Enable rotation by default
- Start panel
- Transition milliseconds
- Included panels
- Duration seconds per panel
- Copyable rotation URL

The rotation URL has this form:

```text
http://127.0.0.1:8000/panel.html?rotation=true&start=<panel-name>
```

Example:

```text
http://127.0.0.1:8000/panel.html?rotation=true&start=bits
```

Rotation can also be opened manually with a query parameter even if rotation is not enabled by default in `config.json`.

## Event Theme

The Event Theme section edits recent activity event labels and colors stored in:

```text
config.json -> panels -> recent-events -> eventTypes
```

Default event types:

- raid
- bits
- follow
- sub
- goal

After editing labels or colors, click **Save Event Theme**.

Refresh the recent activity panel to see changes:

```text
http://127.0.0.1:8000/panel.html?type=recent-events
```

The event theme editor does not change the event data format. Existing Streamer.bot triggers and existing entries in `data/events.json` continue to work.

## OBS Browser Source URLs

The admin page shows copyable OBS browser source URLs for:

```text
http://127.0.0.1:8000/panel.html?type=raids
http://127.0.0.1:8000/panel.html?type=bits
http://127.0.0.1:8000/panel.html?type=follower-goal
http://127.0.0.1:8000/panel.html?type=sub-goal
http://127.0.0.1:8000/panel.html?type=recent-events
http://127.0.0.1:8000/panel.html?rotation=true&duration=3
```

Use these as OBS Browser Source URLs. The admin page also provides **Open Preview** buttons for panel URLs so each panel can be checked quickly in a browser tab.

## Streamer.bot Fetch URLs

The admin page shows copyable Streamer.bot Fetch URLs for:

```text
http://127.0.0.1:8000/api/raid?name=%userName%&viewers=%viewers%
http://127.0.0.1:8000/api/bits?name=%userName%&bits=%bits%&cheers=1
http://127.0.0.1:8000/api/follow?name=%userName%&updateGoal=true
http://127.0.0.1:8000/api/sub?name=%userName%&updateGoal=true
```

Use these with Streamer.bot's built-in **Fetch URL** sub-action.

Streamer.bot Fetch URLs are copy-only in the admin page. They do not have preview buttons because opening those URLs can create or update stream data.

## Refreshing OBS/browser sources

After changing admin settings, refresh the relevant OBS browser source if the change does not appear immediately.

For normal browser testing, use a hard refresh:

```text
Ctrl + Shift + R
```

For stubborn browser caching, add a temporary query parameter:

```text
http://127.0.0.1:8000/panel.html?type=recent-events&v=test
```

## Presets

The local admin page includes a Presets section for saving and reusing admin-managed setups.

A preset includes:

- panel style colors
- panel rotation settings
- recent activity event theme labels and colors
- goals data

Presets are stored locally under:

```text
presets/
```

Importing a preset backs up the current `config.json` and `data/goals.json` before applying the selected preset.

Presets are local files and are ignored by git.
## Restore Backups

The local admin page includes a Restore Backups section.

It shows the latest available local admin backups for:

- `config.json`
- `data/goals.json`

The restore buttons restore the latest backup for the selected file.

The backup browser can show multiple backups for each file. Select a backup from the list before restoring.

Backups can also be tagged with short labels and notes. Tag metadata is stored beside the backup file as a local metadata sidecar file.

The **Mark Current Setup as Working** button creates fresh backups for both `config.json` and `data/goals.json` and tags them together, usually as `known-good`.

Before restoring an older backup, Flora creates another backup of the current file. This means restore actions are reversible as long as the backup files remain available.

Backup files are stored under:

```text
backups/admin/
```

Example backup files:

```text
backups/admin/config.json.20260628T143012123456Z.bak
backups/admin/data__goals.json.20260628T143012123456Z.bak
```

Restore buttons use confirmation prompts before changing files.

## Admin write backups

Before the local admin API writes to `config.json` or `data/goals.json`, Flora creates a timestamped backup under:

```text
backups/admin/
```

These backups are local safety files and are ignored by git.

Example backup filenames:

```text
backups/admin/config.json.20260628T143012123456Z.bak
backups/admin/data__goals.json.20260628T143012123456Z.bak
```

## Safety notes

The admin page is designed for local use.

Recommended server address:

```text
127.0.0.1
```

Do not expose the admin page publicly without adding proper authentication and access controls.

The admin API validates known goal keys, rotation panel names, style color values, and event theme keys before writing configuration changes.
