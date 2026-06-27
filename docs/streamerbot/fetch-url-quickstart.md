# Streamer.bot Fetch URL quickstart

This is the recommended Streamer.bot setup path for Flora on Linux/Wine.

Use Streamer.bot's built-in Fetch URL sub-action. Do not use C# HTTP code for the normal setup.

## Prerequisite

Start Flora:

~~~bash
./start-server-linux.sh
~~~

Check that Flora is running:

~~~text
http://127.0.0.1:8000/api/health
~~~

## First test action

Start with a manual raid test because it updates both the raid panel and recent activity panel.

In Streamer.bot, create an action named:

~~~text
Flora - Fetch URL Raid Test
~~~

Add a temporary trigger that is easy to run manually, such as a chat command:

~~~text
!floratest
~~~

## Add the Fetch URL sub-action

Add a sub-action:

~~~text
Core → Network → Fetch URL
~~~

Use this dry-run URL first:

~~~text
http://127.0.0.1:8000/api/raid?name=ManualRaidTest&viewers=12&dryRun=true
~~~

If Streamer.bot asks for a variable name, use:

~~~text
floraResponse
~~~

The response variable is optional for normal operation. The important confirmation is that the Flora server terminal shows the request.

## Run the dry-run test

Trigger the action.

Expected Flora server output should show a request like:

~~~text
GET /api/raid?name=ManualRaidTest&viewers=12&dryRun=true
~~~

Dry-run does not modify the JSON data files.

## Run the live test

Change the Fetch URL to:

~~~text
http://127.0.0.1:8000/api/raid?name=ManualRaidTest&viewers=12
~~~

Trigger the action again.

Expected result:

~~~text
ManualRaidTest appears in the raid panel.
ManualRaidTest appears at the top of recent activity.
~~~

Check:

~~~text
http://127.0.0.1:8000/panel.html?type=raids
http://127.0.0.1:8000/panel.html?type=recent-events
~~~

## Restore test data

After a live manual test, restore the test data before committing repo changes:

~~~bash
git restore data/raids.json data/events.json
python scripts/check.py
python scripts/validate-config.py
~~~

## Replace manual values with Streamer.bot variables

After the manual test works, replace the manual URL with a trigger-variable URL.

Example raid URL:

~~~text
http://127.0.0.1:8000/api/raid?name=%userName%&viewers=%viewerCount%&dryRun=true
~~~

Remove `dryRun=true` only after the variable version works.

## Troubleshooting

If Flora receives the request but returns an error, the most likely problem is an unreplaced Streamer.bot variable.

Example:

~~~text
viewerCount must be an integer
~~~

That usually means Flora received this literal text:

~~~text
%viewerCount%
~~~

instead of a number.

Use manual values first, then replace one value at a time with Streamer.bot variables.
