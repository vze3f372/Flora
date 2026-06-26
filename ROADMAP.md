# Flora Roadmap









## v0.4.3 - Table Panel Empty-State Configuration

- Add configurable empty-state text per table panel.
- Keep renderer error states reserved for broken config or data.
- Validate empty-state configuration.
- Keep populated table rendering unchanged.

## v0.4.2 - Renderer Error-State Robustness

- Improve user-facing renderer error states.
- Handle missing data files clearly.
- Handle malformed data JSON clearly.
- Handle invalid table data shape at render time.
- Keep valid table rendering unchanged.

## v0.4.1 - Table Panel Data Robustness

- Validate configured table panel data files.
- Detect missing sort fields in table panel data.
- Detect missing column fields in table panel data.
- Keep renderer behavior unchanged.

## v0.4.0 - Multi-Panel Table Foundation

- Add a second configured table panel.
- Add a second local data file.
- Prove the table renderer can render multiple configured panels.
- Validate that configured panel data files exist.
- Document multiple panel URLs.

## v0.3.4 - Developer Workflow Cleanup

- Add a local project check script.
- Validate required project files.
- Validate config syntax and semantics from one command.
- Document the developer check command.
- Add a changelog if missing.

## v0.3.3 - Configuration Documentation and Validation

- Add a configuration reference for `config.json`.
- Document top-level configuration fields.
- Document table panel configuration.
- Document columns, sorting, and scroll settings.
- Add a standard-library validation script for `config.json`.

## v0.3.2 - Documentation and Setup Cleanup

- Move prototype Streamer.bot instructions into `docs/streamerbot/`.
- Document the current `panels.raids` configuration model.
- Document the OBS Browser Source URL.
- Clarify that Streamer.bot writes data and Flora renders panels.
- Add README setup instructions.

## v0.3.0 - Panel Engine Foundation

- Introduce generic `panels` configuration root.
- Add explicit panel `type` support.
- Keep the existing raids table panel working.
- Add renderer dispatch for future panel types.
- Make table column widths config-driven.
- Preserve compatibility with the legacy `leaderboards` configuration root during transition.

## Completed

- [x] Local Git repository
- [x] Project folder structure
- [x] Streamer.bot raid tracking
- [x] JSON raid database
- [x] Local Python HTTP server
- [x] OBS/browser-compatible renderer
- [x] Generic leaderboard configuration
- [x] Basic cyan overlay styling

## Next

- [x] Generic column definitions
- [ ] Split CSS into layout/theme/animation files
- [ ] Smooth scrolling without visible scrollbar
- [ ] OBS Browser Source setup documentation
- [ ] Streamer.bot startup server action
- [ ] `!topraids` chat command

## Later

- [ ] Subscriber leaderboard
- [ ] Gifted subs leaderboard
- [ ] Bits leaderboard
- [ ] Twitch avatar cache
- [ ] Event celebration cards
- [ ] Panel rotation
- [ ] Theme presets
- [ ] Windows testing
- [ ] Full README
- [ ] v1.0 release checkpoint
