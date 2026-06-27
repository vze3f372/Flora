# Flora Roadmap




















## v0.9.7 - Subscription Goal Option

- Add an optional subscription goal panel.
- Let Subscription triggers optionally update the subscription goal.
- Keep the default Subscription endpoint recent-activity-only.
- Use `updateGoal=true` for stream setups that want automatic local sub goal progress.

## v0.9.6 - Follow Goal Auto-Increment

- Let Follow triggers optionally update the follower goal.
- Keep the default Follow endpoint recent-activity-only.
- Use `updateGoal=true` for stream setups that want automatic local goal progress.
- Avoid relying on unavailable Streamer.bot follower-count variables.

## v0.9.5 - Recent Activity Relative Timestamps

- Store machine-readable timestamps for recent activity events.
- Render human-readable relative time in the browser panel.
- Keep compatibility with existing event data.
- Improve live readability during stream tests.
- Refresh displayed relative times without reloading the whole panel.

## v0.9.4 - Live Twitch Trigger Recipes

- Document real Twitch trigger wiring for Streamer.bot.
- Use Fetch URL for live trigger actions.
- Verify raid trigger variables before live use.
- Prepare for end-to-end stream testing.

## v0.9.3 - Streamer.bot Fetch URL Setup Polish

- Make the Streamer.bot setup path clearer.
- Prefer Fetch URL over C# HTTP code for Wine/Linux.
- Document the first manual trigger test.
- Add variable troubleshooting guidance.
- Prepare for live Twitch trigger wiring.

## v0.9.2 - Streamer.bot Fetch URL Compatibility

- Support Streamer.bot's built-in Fetch URL sub-action.
- Allow local GET requests with query parameters.
- Keep POST endpoints available for other clients.
- Add dry-run-first Fetch URL workflow.
- Remove the need for C# HTTP code in Wine.

## v0.9.0 - Streamer.bot HTTP Action Integration

- Add a localhost API bridge for Streamer.bot.
- Avoid direct Wine-to-Linux Python command execution.
- Route Streamer.bot events through the local Flora HTTP API.
- Reuse the existing Flora JSON writer.
- Add dry-run testing for real Streamer.bot actions.
- Document raid, bits, follow, sub, goal, and custom event actions.

## v0.8.2 - Event Writer Convenience Commands

- Add shortcut commands for common recent event types.
- Reduce quoted detail strings in Streamer.bot actions.
- Keep the generic event writer command for custom event text.
- Keep recent events as a bounded newest-first feed.
- Prepare for full Streamer.bot action integration.

## v0.8.1 - Event Panel Polish

- Add event type display labels.
- Add event type colors.
- Improve sample recent event data.
- Add recent events to the default rotation list.

## v0.8.0 - Stream Event Panel Foundation

- Add recent stream activity panel.
- Add event panel data validation.
- Add writer support for appending events.
- Keep existing table, goal, and rotation behavior unchanged.

## v0.7.2 - Writer Command Examples for Streamer.bot

- Add practical Streamer.bot command examples.
- Add dry-run workflow documentation.
- Add Linux and Wine usage notes.
- Keep code unchanged unless integration testing exposes an issue.

## v0.7.1 - Streamer.bot Writer Hardening

- Add dry-run support for data writer commands.
- Add data inspection commands.
- Improve writer argument validation.
- Improve Streamer.bot usage documentation.
- Keep renderers unchanged.

## v0.7.0 - Streamer.bot Data Writer Foundation

- Add command-line data writer tooling.
- Add safe raid, bits, and goal update commands.
- Add atomic JSON writes.
- Document Streamer.bot usage.
- Keep renderers unchanged.

## v0.6.1 - Rotation Runtime Polish

- Add configurable rotation start panel.
- Add query overrides for rotation testing.
- Add optional rotation debug overlay.
- Keep existing renderer behavior unchanged.

## v0.6.0 - Panel Rotation Foundation

- Add optional panel rotation mode.
- Add configurable rotation order.
- Add configurable panel display durations.
- Keep direct panel URLs unchanged.
- Keep existing renderers unchanged.
- Add fade/dissolve transitions between rotated panels.

## v0.5.2 - Goal Panel Theme Configuration

- Add configurable goal progress colors.
- Validate goal progress color configuration.
- Keep existing goal panel behavior unchanged.
- Keep table panels unchanged.

## v0.5.1 - Goal Panel Configuration Polish

- Add optional number formatting for goal panels.
- Add optional completion message behavior.
- Add optional percentage text visibility.
- Keep existing table panels unchanged.

## v0.5.0 - Goal Panel Foundation

- Add the first non-table panel renderer.
- Add sample goal panel configuration and data.
- Validate goal panel configuration and data.
- Keep existing table panels unchanged.

## v0.4.4 - Table Panel Header and Label Polish

- Add optional table panel rank labels.
- Add optional table panel name labels.
- Validate optional label configuration.
- Keep populated table rendering unchanged.

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
