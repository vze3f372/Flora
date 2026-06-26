# Changelog

All notable changes to Flora will be documented in this file.

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
