## v0.12.5 - Server Launcher

- Added `scripts/flora-launcher.py` for starting the Flora server only when it is not already running.
- Added cross-platform server startup support for Streamer.bot Run a Program actions.
- Added `start-server-windows.bat` for Windows startup.
- Added `start-server-wine.bat` for Streamer.bot running under Wine on Linux.
- Added server launcher documentation.
- Added server log output at `logs/flora-server.log`.

## v0.12.4 - Avatar Action Builder

- Added an optional Twitch avatar URL checkbox to the Streamer.bot Action Builder.
- Added an avatar URL variable field with `%targetUserProfileImageUrl%` as the default.
- Updated generated Fetch URLs to include `avatarUrl` when avatar support is enabled.
- Added guidance that Streamer.bot should run **Twitch → User → Get User Info For Target** before the Flora Fetch URL when avatar support is enabled.

## v0.12.3 - User Avatar Cache

- Added optional user avatar caching for stream events.
- Added support for avatar URL fields such as `avatarUrl`, `avatar`, `profileImageUrl`, `profileImage`, and `userProfileImageUrl`.
- Added local avatar image caching in `assets/avatars/`.
- Added local avatar metadata cache in `data/avatar-cache.json`.
- Added avatar display support for leaderboard panels.
- Added avatar display support for recent events.
- Added initials fallback badges when no avatar is cached.
- Added no-cache headers for local development so browser and OBS sources refresh static assets more reliably.

## v0.12.2 - Named Rotation Groups

- Added named rotation groups with `config.rotations`.
- Added support for named rotation URLs:
  - `?rotation=leaderboards`
  - `?rotation=goals`
  - `?rotation=<custom-name>`
- Kept the existing default rotation behavior:
  - `?rotation=true`
- Added an Admin UI editor for named rotation groups.
- Added support for creating, saving, previewing, copying, and deleting named rotation groups from the GUI.
- Added `/api/admin/rotations` for reading and saving named rotation groups.
- Updated config validation for named rotation groups.

## v0.12.1 - Leaderboard Sort Modes

- Added biggest single raid tracking with `biggestRaid`.
- Added biggest single cheer tracking with `biggestCheer`.
- Backfilled existing raid and bits rows with legacy best-estimate values.
- Added raid leaderboard panel variants:
  - `raids` for total raid viewers
  - `raids-count` for number of raids
  - `raids-biggest` for biggest individual raid
- Added bits leaderboard panel variants:
  - `bits` for total bits
  - `bits-count` for number of cheers
  - `bits-biggest` for biggest individual cheer
- Kept Streamer.bot event URLs unchanged; OBS panel URLs now decide which ranked view is displayed.

# Changelog

## v0.12.0 - Streamer.bot Action Builder

- Added a Streamer.bot Action Builder section to the local admin UI.
- Added role-based Fetch URL generation for raids, bits, follows, and subscriptions.
- Added common Streamer.bot variable presets such as `%userName%`, `%viewers%`, and `%bits%`.
- Added Custom mode for mapping variables to existing Flora targets.
- Added copy and preview buttons for generated Fetch URLs.

## v0.11.1 - Preset Preview and Management

- Added selected preset preview support in the admin UI.
- Added preset detail and delete admin endpoints.
- Added style, rotation, event theme, and goals summary before import.
- Added local preset deletion from the admin UI.
- Improved preset import confirmation with selected preset details.

## v0.11.0 - Presets Export/Import

- Added local admin preset export support.
- Added local admin preset import support.
- Stored local presets under `presets/`.
- Exported style, rotation, recent activity event theme, and goals.
- Backed up current config and goals before importing a preset.
- Added `presets/` to `.gitignore`.

## v0.10.7 - Backup Browser and Tags

- Added selectable backup lists for `config.json` and `data/goals.json`.
- Added restore support for a selected backup instead of only the latest backup.
- Added backup tags and notes stored in local metadata sidecar files.
- Added Mark Current Setup as Working to create tagged config and goals backups.
- Preserved latest-backup restore behavior for compatibility.

## v0.10.6 - Admin Restore Backups

- Added local admin controls for restoring the latest `config.json` backup.
- Added local admin controls for restoring the latest `data/goals.json` backup.
- Added backup status display for the latest available admin backups.
- Added confirmation prompts before restore actions.
- Backed up the current file again before restoring from an older backup.

## v0.10.5 - Admin Preview Buttons

- Added Open Preview buttons for OBS browser source URLs in the local admin UI.
- Added an Open Preview button for the rotation URL.
- Kept Streamer.bot Fetch URLs copy-only to avoid accidental write actions.

## v0.10.4 - Admin Write Backups

- Added automatic timestamped backups before local admin writes.
- Backed up `config.json` before style, rotation, and event theme changes.
- Backed up `data/goals.json` before goal changes.
- Stored local admin backups under `backups/admin/`.
- Added `backups/` to `.gitignore`.

## v0.10.3 - Event Theme Editor

- Added recent activity event label/color controls to the local admin UI.
- Added `/api/admin/event-theme` for validated event theme updates.
- Reused the existing `panels.recent-events.eventTypes` configuration shape.
- Kept existing event data and Streamer.bot endpoints unchanged.

## v0.10.2 - Panel Rotation Editor

- Added rotation controls to the local admin UI.
- Added `/api/admin/rotation` for validated rotation updates.
- Added controls for rotation enablement, start panel, transition timing, panel membership, and per-panel duration.
- Added a copyable rotation browser source URL.

## v0.10.1 - Panel Style Editor

- Added panel color controls to the local admin UI.
- Added `style.colors` settings in `config.json`.
- Added `/api/admin/style` for validated style updates.
- Added runtime CSS variable overrides for OBS panels.

## v0.10.0 - Local Admin UI Foundation

- Added a local admin page at `/admin.html`.
- Added admin API endpoints for reading `config.json` and reading/updating `data/goals.json`.
- Added browser controls for follower and subscriber goal current/target values.
- Added copyable OBS browser source URLs and Streamer.bot Fetch URLs.

All notable changes to Flora will be documented in this file.

## v0.9.7 - Subscription Goal Option

- Add a `subscribers` goal data entry.
- Add a `sub-goal` panel configuration.
- Support `updateGoal=true` on the Subscription API endpoint.
- Allow live Subscription triggers to increment `subscribers.current`.
- Document the Subscription Fetch URL for recent activity plus subscription goal updates.

## v0.9.6 - Follow Goal Auto-Increment

- Add a `goal-increment` data writer command.
- Support `updateGoal=true` on the Follow API endpoint.
- Allow live Follow triggers to increment `followers.current`.
- Document the Follow Fetch URL for recent activity plus follower goal updates.

## v0.9.5 - Recent Activity Relative Timestamps

- Add generated `createdAt` timestamps to new recent activity events.
- Display recent activity times relative to the current browser time.
- Keep the existing `time` field as a fallback for older event data.
- Preserve the current `Just now` display for events less than one minute old.
- Refresh relative recent activity timestamps automatically in the browser.

## v0.9.4 - Live Twitch Trigger Recipes

- Add Streamer.bot recipes for live Twitch raid, cheer, follow, and subscription triggers.
- Document Fetch URL actions for each trigger.
- Correct the raid trigger viewer variable to `%viewers%`.
- Add manual fallback URLs for trigger-variable debugging.
- Add Action History troubleshooting notes.

## v0.9.3 - Streamer.bot Fetch URL Setup Polish

- Add a Fetch URL quickstart for Streamer.bot.
- Document a dry-run-first manual raid test action.
- Clarify that Fetch URL is the recommended Streamer.bot path under Wine.
- Add setup notes for trigger-based testing.
- Add response-variable and troubleshooting guidance.

## v0.9.2 - Streamer.bot Fetch URL Compatibility

- Add GET-compatible Flora API handling for Streamer.bot Fetch URL.
- Keep existing POST API behavior.
- Add Fetch URL recipes for raid, bits, follow, sub, goal, and custom events.
- Document dry-run and live Fetch URL examples.
- Avoid requiring Streamer.bot C# HTTP access under Wine.

## v0.9.0 - Streamer.bot HTTP Action Integration

- Add local Flora HTTP server.
- Serve OBS browser-source files through the Flora server.
- Add `/api/raid` endpoint for raid table and recent event updates.
- Add `/api/bits` endpoint for bits table and recent event updates.
- Add `/api/follow` endpoint for recent follow events.
- Add `/api/sub` endpoint for recent subscription events.
- Add `/api/goal` endpoint for goal updates.
- Add `/api/event` endpoint for custom recent events.
- Add dry-run support for Streamer.bot HTTP actions.
- Document Streamer.bot HTTP request setup.

## v0.8.2 - Event Writer Convenience Commands

- Add `raid-event` writer shortcut.
- Add `bits-event` writer shortcut.
- Add `follow-event` writer shortcut.
- Add `sub-event` writer shortcut.
- Keep the generic `event` writer command.
- Keep recent events as a fixed newest-first feed.
- Update Streamer.bot writer examples.

## v0.8.1 - Event Panel Polish

- Add configurable event type labels.
- Add configurable event type colors.
- Add event type configuration validation.
- Expand sample event data.
- Add recent events to panel rotation.

## v0.8.0 - Stream Event Panel Foundation

- Add `events` panel renderer type.
- Add `recent-events` panel configuration.
- Add `data/events.json` sample data.
- Add event panel styling.
- Validate event panel configuration and data.
- Add data writer support for appending recent events.

## v0.7.2 - Writer Command Examples for Streamer.bot

- Add copy-paste Streamer.bot command examples.
- Document dry-run testing workflow.
- Add Linux and Wine path notes.
- Add raid, bits, goal, reset, and show examples.
- Keep renderer and writer behavior unchanged.

## v0.7.1 - Streamer.bot Writer Hardening

- Add `--dry-run` support to data writer commands.
- Add `show` command for inspecting current data.
- Improve numeric argument validation messages.
- Expand Streamer.bot data writer documentation.
- Keep renderers unchanged.

## v0.7.0 - Streamer.bot Data Writer Foundation

- Add `scripts/flora-data.py` for safe data updates.
- Support raid data updates.
- Support bits and cheer data updates.
- Support goal data updates.
- Support deliberate data resets.
- Use atomic JSON writes.
- Add Streamer.bot data writer documentation.

## v0.6.1 - Rotation Runtime Polish

- Add optional rotation start panel configuration.
- Add `start` query override for rotation.
- Add `duration` query override for rotation testing.
- Add `debug=true` rotation status overlay.
- Keep direct `type` URLs authoritative.

## v0.6.0 - Panel Rotation Foundation

- Add optional panel rotation configuration.
- Add `?rotation=true` URL support.
- Allow one OBS browser source to cycle through configured panels.
- Support per-panel rotation durations.
- Keep direct `?type=` panel URLs working.
- Validate rotation configuration.
- Add fade/dissolve transitions between rotated panels.

## v0.5.2 - Goal Panel Theme Configuration

- Add optional goal progress fill color configuration.
- Add optional goal progress empty color configuration.
- Validate goal progress colors as hex values.
- Keep the current cyan/teal goal colors as defaults.
- Keep table panels unchanged.

## v0.5.1 - Goal Panel Configuration Polish

- Add optional goal number formatting.
- Add optional goal completion messages.
- Add optional percentage text visibility.
- Validate new goal panel display options.
- Keep table panels unchanged.

## v0.5.0 - Goal Panel Foundation

- Add a new `goal` panel renderer type.
- Add a sample `follower-goal` panel.
- Add `data/goals.json` sample data.
- Add goal panel styling.
- Extend configuration validation for goal panels.
- Extend developer checks for goal panel data.

## v0.4.4 - Table Panel Header and Label Polish

- Add configurable table panel rank labels.
- Add configurable table panel name labels.
- Validate optional table panel label fields.
- Keep default labels as `Rank` and `Name`.

## v0.4.3 - Table Panel Empty-State Configuration

- Add configurable table panel empty-state messages.
- Use panel-specific empty messages when valid data contains no rows.
- Validate `emptyMessage` configuration when present.
- Preserve the default `No entries yet` fallback.

## v0.4.2 - Renderer Error-State Robustness

- Improve renderer error states for missing or malformed config and data files.
- Render clear panel errors for unsupported panel types.
- Validate table data shape at render time before rendering rows.
- Preserve normal table rendering for valid panel data.

## v0.4.1 - Table Panel Data Robustness

- Validate table panel data files in the developer check script.
- Detect missing configured sort fields in panel data rows.
- Detect missing configured column fields in panel data rows.
- Require configured sort fields to be numeric.

## v0.4.0 - Multi-Panel Table Foundation

- Add a second configured table panel.
- Add `data/bits.json` as a second panel data file.
- Validate configured panel data file paths in the developer check script.
- Document multiple panel URLs.

## v0.3.4 - Developer Workflow Cleanup

- Add a local project check script.
- Document the developer check command.
- Add this changelog.

## v0.3.3 - Configuration Documentation and Validation

- Add configuration reference documentation.
- Document top-level configuration fields.
- Document table panel configuration.
- Document columns, sorting, and scroll settings.
- Add a standard-library validation script for config.json.

## v0.3.2 - Documentation and Setup Cleanup

- Add README setup documentation.
- Move Streamer.bot raid setup documentation into docs/streamerbot/.
- Document the OBS Browser Source URL.
- Clarify that Streamer.bot writes data and Flora renders panels.

## v0.3.1 - Renderer Naming Cleanup

- Align renderer-facing names with panel and table-panel terminology.
- Rename DOM ids and CSS classes away from leaderboard-specific names.
- Update Linux server script wording.

## v0.3.0 - Panel Engine Foundation

- Introduce generic panels configuration.
- Add explicit panel type support.
- Add renderer dispatch for table panels.
- Make table column widths configuration-driven.
- Preserve legacy leaderboards configuration fallback during transition.
