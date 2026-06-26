# Flora data writer

Flora includes a small Python command-line tool for updating panel data files safely.

The script is:

~~~text
scripts/flora-data.py
~~~

It uses Python standard library only and writes JSON files atomically.

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

## Streamer.bot usage

In Streamer.bot, create an action that runs a command.

Use the Flora project folder as the working directory:

~~~text
/home/vze3f372/Documents/streamerbot/streampanel
~~~

Example command for a raid action:

~~~text
python scripts/flora-data.py raid --name "%userName%" --viewers "%viewerCount%"
~~~

Example command for a bits action:

~~~text
python scripts/flora-data.py bits --name "%userName%" --bits "%bits%" --cheers 1
~~~

The exact variable names depend on the Streamer.bot trigger and action context.
