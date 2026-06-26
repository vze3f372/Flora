# Changelog

All notable changes to Flora will be documented in this file.

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
