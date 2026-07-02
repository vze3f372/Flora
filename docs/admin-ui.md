# Flora Local Admin UI

## Current Admin UI Feature Summary

The Admin UI currently provides local controls for:

- server status and common URLs
- goal values
- panel style colors
- panel theme presets
- panel layout presets
- default panel rotation
- named rotation groups
- recent activity event labels and colors
- runtime data reset
- runtime backup restore
- config/goals backup restore
- local admin setup presets
- OBS source URL quick-copy
- Streamer.bot Fetch URL generation


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

## Panel Layout Presets

The Admin UI includes a **Panel Layout Presets** card for applying built-in layout presets.

Layout presets update existing configuration fields only:

- leaderboard row limits
- recent activity event limits
- leaderboard scroll speed
- default rotation settings
- named rotation groups

Before applying a layout preset, Flora creates a timestamped backup of:

    config.json

Layout presets do not change:

- panel colors
- recent activity event labels or colors
- goals
- runtime data
- avatar cache files
- Streamer.bot action URLs

Built-in layout presets include:

- Balanced
- Compact
- Leaderboard Focus
- Goals and Activity

After applying a layout preset, refresh OBS browser sources or browser panel pages to see updated layout behavior.


## Panel Theme Presets

The Admin UI includes a **Panel Theme Presets** card for applying built-in panel color presets.

Theme presets update:

    config.json -> style.colors

Before applying a theme preset, Flora creates a timestamped backup of:

    config.json

Theme presets do not change:

- panel rotation
- recent activity event labels
- goals
- runtime data
- avatar cache files
- Streamer.bot action URLs

Built-in theme presets include:

- Default Flora
- Night Gold
- Neon Purple
- Forest
- Minimal Contrast

After applying a theme preset, refresh OBS browser sources or browser panel pages to see the updated panel styling.


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
http://127.0.0.1:8000/panel.html?type=sub-months-total
http://127.0.0.1:8000/panel.html?type=sub-months-streak
http://127.0.0.1:8000/panel.html?type=gift-subs
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
http://127.0.0.1:8000/api/sub?name=%userName%&totalMonths=%badgeCount%&streakMonths=%monthsSubscribed%&tier=%tier%&isPrimeSub=%isPrimeSub%&avatarUrl=%targetUserProfileImageUrlEscaped%
http://127.0.0.1:8000/api/gift-sub?name=%userName%&recipient=%recipientUserName%&giftCount=1&totalGifted=%totalSubsGifted%&tier=%tier%&anonymous=%anonymous%&monthsGifted=%monthsGifted%&avatarUrl=%targetUserProfileImageUrlEscaped%
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

## Flora Server Status

The Admin UI includes a **Flora Server Status** card near the top of the page.

The card checks:

    /api/health

It shows the local server status, host, port, and commonly used URLs:

    http://127.0.0.1:8000/api/health
    http://127.0.0.1:8000/admin.html
    http://127.0.0.1:8000/panel.html

The card also includes copy buttons for the health URL, Admin URL, and panel base URL.

Startup reminders are shown for:

- Linux
- Windows
- Streamer.bot running on Linux through Wine

The Admin UI does not start the server directly. If the Admin UI is visible, the Flora server is already running.


## Runtime Reset Backup Restore

The Admin UI includes a **Runtime Reset Backups** card for restoring runtime data from backups created by the Fresh Start reset card.

The restore card can restore:

- Raid leaderboard data
- Bits leaderboard data
- Subscription leaderboard data
- Gift sub leaderboard data
- Recent events
- Avatar cache metadata
- Avatar image files
- Goals

Before restoring selected data, Flora creates a safety backup under:

    backups/runtime-restore/

Runtime reset backups are read from:

    backups/runtime-reset/

The restore card requires typing:

    RESTORE

before the restore button will perform the action.

This keeps reset and restore operations reversible while keeping runtime data backups separate from admin configuration backups.


## Fresh Start / Reset Runtime Data

The Admin UI includes a **Fresh Start / Reset Runtime Data** card for returning runtime stream data to a clean default state.

This is useful before a new stream, event, demo, or test run.

The card can reset:

- Raid leaderboard data
- Bits leaderboard data
- Subscription leaderboard data
- Gift sub leaderboard data
- Recent events
- Avatar cache metadata
- Avatar image files
- Goal progress

Flora creates a backup before resetting selected data.

Runtime reset backups are stored under:

    backups/runtime-reset/

Reset behavior:

    data/raids.json        -> {}
    data/bits.json         -> {}
    data/subs.json         -> {}
    data/gift-subs.json    -> {}
    data/events.json       -> { "events": [] }
    data/avatar-cache.json -> {}
    assets/avatars/        -> selected image files removed
    data/goals.json        -> goal targets preserved, current values set to 0

These are local runtime files and are ignored by Git. Flora keeps versioned starter files in `data/defaults/`, and missing runtime files are recreated from those defaults when the server starts.

The card requires typing:

    RESET

before the reset button will perform the action.


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

The Presets section can preview a selected preset before import. The preview summarizes style colors, rotation settings, recent activity event types, and included goals.

Local presets can also be deleted from the Presets section. Deleting a preset only removes the local preset file and does not change the active Flora setup.

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

## OBS Source URLs

The Admin UI includes an **OBS Source URLs** card for quickly copying browser source URLs.

The card includes copy and preview actions for:

- Raid leaderboard
- Raid count leaderboard
- Biggest raid leaderboard
- Bits leaderboard
- Cheer count leaderboard
- Biggest cheer leaderboard
- Follower goal
- Subscriber goal
- Recent events
- Default rotation
- Fast default rotation
- Leaderboards rotation
- Goals rotation

The URLs are generated from the current Admin page origin. For the default local server this means URLs start with:

    http://127.0.0.1:8000

Use the copied URLs as OBS browser source URLs.


## Streamer.bot Action Builder

The local admin page includes a Streamer.bot Action Builder for generating Fetch URLs for Streamer.bot actions.

The builder supports preset mappings for:

- raids
- bits / cheers
- follows
- subscriptions

The builder also includes a Custom mode for mapping common Streamer.bot variables to existing Flora targets. Variables are mapped to data roles such as name and amount, rather than directly to display columns.

Generated URLs can be copied into a Streamer.bot Fetch action. The preview button opens the generated URL in a browser tab, which is useful for testing with temporary test values.

When testing from a browser, replace Streamer.bot placeholders such as `%userName%`, `%viewers%`, and `%bits%` with temporary test values to avoid writing literal placeholder strings into the local data files.

## Leaderboard panel variants

Flora supports multiple leaderboard panels reading from the same data file. This makes it possible to show different ranked views in OBS without changing Streamer.bot actions.

Raid panel URLs:

```text
http://127.0.0.1:8000/panel.html?type=raids
http://127.0.0.1:8000/panel.html?type=raids-count
http://127.0.0.1:8000/panel.html?type=raids-biggest
```

Bits panel URLs:

```text
http://127.0.0.1:8000/panel.html?type=bits
http://127.0.0.1:8000/panel.html?type=bits-count
http://127.0.0.1:8000/panel.html?type=bits-biggest
```

The Streamer.bot fetch URLs remain unchanged. Streamer.bot updates the data, while the OBS browser source URL decides which leaderboard view is shown.

Existing historical data is backfilled with a best estimate for biggest raid and biggest cheer. Future events track the true single-event maximum.

## Named rotation groups

Named rotation groups make it possible to create multiple independent rotating OBS browser sources.

The default/global rotation still uses:

    http://127.0.0.1:8000/panel.html?rotation=true

Named rotations use the group name in the `rotation` query parameter:

    http://127.0.0.1:8000/panel.html?rotation=leaderboards
    http://127.0.0.1:8000/panel.html?rotation=goals
    http://127.0.0.1:8000/panel.html?rotation=supporters

Named rotation groups can be managed from the Admin UI under **Named Rotation Groups**.

Each group can configure:

- enabled/disabled status
- start panel
- transition duration
- included panels
- duration per included panel

Rotation group names should use lowercase letters, numbers, and hyphens.

## Action Builder avatar URLs

The Streamer.bot Action Builder can optionally add an `avatarUrl` parameter to generated Flora Fetch URLs.

Enable:

    Include Twitch avatar URL

The default avatar URL variable is:

    %targetUserProfileImageUrlEscaped%

When this option is enabled, add this Streamer.bot sub-action before the Flora Fetch URL:

    Twitch → User → Get User Info For Target

For live user-triggered events, set the target user login to:

    %userName%

The generated raid URL will look like:

    http://127.0.0.1:8000/api/raid?name=%userName%&avatarUrl=%targetUserProfileImageUrlEscaped%&viewers=%viewers%

The generated bits URL will look like:

    http://127.0.0.1:8000/api/bits?name=%userName%&avatarUrl=%targetUserProfileImageUrlEscaped%&bits=%bits%&cheers=1

Avatar support is optional. Leave the checkbox disabled to generate the original non-avatar Fetch URLs.


## User avatars

Flora can display user avatars in leaderboard panels and recent event panels.

Avatar support is optional. Existing Streamer.bot Fetch URL actions continue to work without changes. If no avatar is available for a user, Flora displays an initials fallback badge.

To cache real Twitch avatars, add a Streamer.bot **Twitch → User → Get User Info For Target** sub-action before the Flora Fetch URL action.

For raids, set the target user login to:

    %userName%

Then use an avatar-enabled Fetch URL:

    http://127.0.0.1:8000/api/raid?name=%userName%&viewers=%viewers%&avatarUrl=%targetUserProfileImageUrlEscaped%

For bits, use:

    http://127.0.0.1:8000/api/bits?name=%userName%&bits=%bits%&cheers=1&avatarUrl=%targetUserProfileImageUrlEscaped%

Flora stores downloaded avatar images locally in `assets/avatars/` and stores avatar metadata in `data/avatar-cache.json`. These are runtime cache files and are ignored by Git.
