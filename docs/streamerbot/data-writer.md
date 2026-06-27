# Flora data writer

Flora includes a small Python command-line tool for updating panel data files safely.

The script is:

~~~text
scripts/flora-data.py
~~~

It uses Python standard library only and writes JSON files atomically.

## Show current data

Show all data:

~~~bash
python scripts/flora-data.py show --panel all
~~~

Show one data file:

~~~bash
python scripts/flora-data.py show --panel raids
python scripts/flora-data.py show --panel bits
python scripts/flora-data.py show --panel goals
~~~

## Dry runs

Most write commands support `--dry-run`.

A dry run prints the result that would be written but does not change the data file.

Example:

~~~bash
python scripts/flora-data.py raid --name "ExampleRaider" --viewers 25 --dry-run
~~~

Dry runs are useful when testing Streamer.bot variables.

## Raid updates

Increment one raider's total viewers and raid count:

~~~bash
python scripts/flora-data.py raid --name "ExampleRaider" --viewers 25
~~~

This updates:

~~~text
data/raids.json
~~~

The default raid increment is `1`.

To add more than one raid:

~~~bash
python scripts/flora-data.py raid --name "ExampleRaider" --viewers 75 --raids 3
~~~

## Bits updates

Increment one user's bits and cheer count:

~~~bash
python scripts/flora-data.py bits --name "ExampleUser" --bits 100
~~~

This updates:

~~~text
data/bits.json
~~~

The default cheer increment is `1`.

To add multiple cheers:

~~~bash
python scripts/flora-data.py bits --name "ExampleUser" --bits 500 --cheers 5
~~~

## Goal updates

Set a goal's current value:

~~~bash
python scripts/flora-data.py goal --key followers --current 55
~~~

Set both current and target:

~~~bash
python scripts/flora-data.py goal --key followers --current 55 --target 100
~~~

This updates:

~~~text
data/goals.json
~~~

## Reset data

Reset raids:

~~~bash
python scripts/flora-data.py reset --panel raids --yes
~~~

Reset bits:

~~~bash
python scripts/flora-data.py reset --panel bits --yes
~~~

Reset goals:

~~~bash
python scripts/flora-data.py reset --panel goals --yes
~~~

The `--yes` flag is required so resets are deliberate.

Dry-run reset example:

~~~bash
python scripts/flora-data.py reset --panel bits --yes --dry-run
~~~

For copy-paste Streamer.bot command examples, see:

~~~text
docs/streamerbot/command-examples.md
~~~

## Streamer.bot usage

In Streamer.bot, create an action that runs a command.

Use the Flora project folder as the working directory:

~~~text
/home/vze3f372/Documents/streamerbot/streampanel
~~~

Example command for a raid action:

~~~text
python scripts/flora-data.py raid --name "%userName%" --viewers "%viewers%"
~~~

Example command for a bits action:

~~~text
python scripts/flora-data.py bits --name "%userName%" --bits "%bits%" --cheers 1
~~~

Dry-run examples for testing Streamer.bot variables:

~~~text
python scripts/flora-data.py raid --name "%userName%" --viewers "%viewers%" --dry-run
python scripts/flora-data.py bits --name "%userName%" --bits "%bits%" --cheers 1 --dry-run
~~~

The exact variable names depend on the Streamer.bot trigger and action context.

If a Streamer.bot variable may contain spaces, keep it wrapped in quotes.

## Recent event updates

Append a recent stream event:

~~~bash
python scripts/flora-data.py event --type raid --name "ExampleRaider" --detail "Raided with 25 viewers"
~~~

Dry-run example:

~~~bash
python scripts/flora-data.py event --type bits --name "ExampleUser" --detail "Cheered 100 bits" --dry-run
~~~

The newest event is inserted at the top of `data/events.json`.

By default, Flora keeps the newest 25 events when appending. Use `--keep` to change this:

~~~bash
python scripts/flora-data.py event --type raid --name "ExampleRaider" --detail "Raided with 25 viewers" --keep 50
~~~
