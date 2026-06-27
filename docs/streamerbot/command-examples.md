# Streamer.bot command examples for Flora

This document provides copy-paste examples for calling the Flora data writer from Streamer.bot actions.

The Flora data writer is:

~~~text
scripts/flora-data.py
~~~

Use the Flora project folder as the command working directory:

~~~text
/home/vze3f372/Documents/streamerbot/streampanel
~~~

The exact variable names available in Streamer.bot depend on the trigger type and action context. Treat the variable names below as templates and adjust them to match the variables shown in Streamer.bot.

## Recommended setup pattern

For each Streamer.bot action:

1. Add a command/external program sub-action.
2. Set the working directory to the Flora project folder.
3. Start with a `--dry-run` command.
4. Trigger the action once.
5. Check the command output.
6. Remove `--dry-run` when the values look correct.
7. Refresh the OBS browser source or wait for Flora's normal refresh interval.

## Raid action

Purpose:

~~~text
Update TOP RAIDERS when a raid happens.
~~~

Dry-run test command:

~~~text
python scripts/flora-data.py raid --name "%userName%" --viewers "%viewers%" --dry-run
~~~

Live command:

~~~text
python scripts/flora-data.py raid --name "%userName%" --viewers "%viewers%"
~~~

For the Twitch Raid trigger, Streamer.bot uses `%viewers%` for raid size.

Example with a manually tested value:

~~~text
python scripts/flora-data.py raid --name "ExampleRaider" --viewers 25 --dry-run
~~~

Expected dry-run output shape:

~~~json
{
  "action": "raid",
  "dryRun": true,
  "file": "data/raids.json",
  "name": "ExampleRaider",
  "raids": 1,
  "viewers": 25
}
~~~

## Bits action

Purpose:

~~~text
Update TOP BITS when a bits/cheer event happens.
~~~

Dry-run test command:

~~~text
python scripts/flora-data.py bits --name "%userName%" --bits "%bits%" --cheers 1 --dry-run
~~~

Live command:

~~~text
python scripts/flora-data.py bits --name "%userName%" --bits "%bits%" --cheers 1
~~~

If Streamer.bot provides a cheer count variable, you can use it instead of `1`.

Example:

~~~text
python scripts/flora-data.py bits --name "%userName%" --bits "%bits%" --cheers "%cheerCount%"
~~~

Example with manually tested values:

~~~text
python scripts/flora-data.py bits --name "ExampleUser" --bits 100 --cheers 1 --dry-run
~~~

Expected dry-run output shape:

~~~json
{
  "action": "bits",
  "bits": 100,
  "cheers": 1,
  "dryRun": true,
  "file": "data/bits.json",
  "name": "ExampleUser"
}
~~~

## Follower goal update

Purpose:

~~~text
Update the follower goal panel.
~~~

Dry-run test command:

~~~text
python scripts/flora-data.py goal --key followers --current "%followerCount%" --dry-run
~~~

Live command:

~~~text
python scripts/flora-data.py goal --key followers --current "%followerCount%"
~~~

To set both current and target:

~~~text
python scripts/flora-data.py goal --key followers --current "%followerCount%" --target 100
~~~

Example with manually tested values:

~~~text
python scripts/flora-data.py goal --key followers --current 55 --target 100 --dry-run
~~~

Expected dry-run output shape:

~~~json
{
  "action": "goal",
  "current": 55,
  "dryRun": true,
  "file": "data/goals.json",
  "key": "followers",
  "target": 100
}
~~~

## Reset examples

Reset TOP RAIDERS:

~~~text
python scripts/flora-data.py reset --panel raids --yes
~~~

Reset TOP BITS:

~~~text
python scripts/flora-data.py reset --panel bits --yes
~~~

Reset goal data:

~~~text
python scripts/flora-data.py reset --panel goals --yes
~~~

Dry-run reset example:

~~~text
python scripts/flora-data.py reset --panel bits --yes --dry-run
~~~

The `--yes` flag is required so resets are deliberate.

## Inspect current data

Show all Flora data:

~~~text
python scripts/flora-data.py show --panel all
~~~

Show only raid data:

~~~text
python scripts/flora-data.py show --panel raids
~~~

Show only bits data:

~~~text
python scripts/flora-data.py show --panel bits
~~~

Show only goal data:

~~~text
python scripts/flora-data.py show --panel goals
~~~

## Linux and Wine notes

If Streamer.bot is running through Wine, command execution may be sensitive to paths.

Use the Flora project folder as the working directory whenever possible:

~~~text
/home/vze3f372/Documents/streamerbot/streampanel
~~~

Then call the script with a relative path:

~~~text
python scripts/flora-data.py show --panel all
~~~

If Streamer.bot cannot find `python`, use the full Python path from Linux.

Find it with:

~~~bash
which python
~~~

Common result:

~~~text
/usr/bin/python
~~~

Then use:

~~~text
/usr/bin/python scripts/flora-data.py show --panel all
~~~

## Quoting rules

Keep Streamer.bot variables wrapped in quotes when they may contain spaces.

Good:

~~~text
python scripts/flora-data.py raid --name "%userName%" --viewers "%viewers%"
~~~

Risky:

~~~text
python scripts/flora-data.py raid --name %userName% --viewers %viewers%
~~~

Names can contain spaces. Numeric values should not contain commas or extra text.

Good numeric value:

~~~text
100
~~~

Bad numeric values:

~~~text
100 bits
1,000
unknown
~~~

## Troubleshooting

If a command does not update a panel:

1. Add `--dry-run` and trigger the action again.
2. Check whether the output contains the expected user name and number.
3. Run `python scripts/flora-data.py show --panel all`.
4. Confirm the relevant data file changed.
5. Refresh the matching Flora URL.

Useful test URLs:

~~~text
http://localhost:8000/panel.html?type=raids
http://localhost:8000/panel.html?type=bits
http://localhost:8000/panel.html?type=follower-goal
http://localhost:8000/panel.html?rotation=true&duration=3&debug=true
~~~

## Recent event panel examples

Add a raid event:

~~~text
python scripts/flora-data.py event --type raid --name "%userName%" --detail "Raided with %viewers% viewers"
~~~

Add a bits event:

~~~text
python scripts/flora-data.py event --type bits --name "%userName%" --detail "Cheered %bits% bits"
~~~

Dry-run raid event:

~~~text
python scripts/flora-data.py event --type raid --name "%userName%" --detail "Raided with %viewers% viewers" --dry-run
~~~

Recent event panel URL:

~~~text
http://localhost:8000/panel.html\?type\=recent-events
~~~
