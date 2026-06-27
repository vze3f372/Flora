# Streamer.bot Fetch URL recipes

These recipes use Streamer.bot's built-in Fetch URL sub-action.

Use these recipes when Streamer.bot is running through Wine and C# HTTP requests are unavailable.

Flora supports local GET API calls for Streamer.bot compatibility.

## Server

Start Flora:

~~~bash
./start-server-linux.sh
~~~

Health check:

~~~text
http://127.0.0.1:8000/api/health
~~~

## General setup

For each Streamer.bot action:

1. Add a Fetch URL sub-action.
2. Use the dry-run URL first.
3. Run the action manually.
4. Confirm the response contains `"ok": true`.
5. Remove `dryRun=true`.
6. Run the action again.
7. Refresh the matching Flora panel.

## Raid dry-run

~~~text
http://127.0.0.1:8000/api/raid?name=ManualRaidTest&viewers=12&dryRun=true
~~~

## Raid live

~~~text
http://127.0.0.1:8000/api/raid?name=ManualRaidTest&viewers=12
~~~

Expected panels:

~~~text
http://127.0.0.1:8000/panel.html?type=raids
http://127.0.0.1:8000/panel.html?type=recent-events
~~~

## Bits dry-run

~~~text
http://127.0.0.1:8000/api/bits?name=ManualBitsTest&bits=100&cheers=1&dryRun=true
~~~

## Bits live

~~~text
http://127.0.0.1:8000/api/bits?name=ManualBitsTest&bits=100&cheers=1
~~~

Expected panels:

~~~text
http://127.0.0.1:8000/panel.html?type=bits
http://127.0.0.1:8000/panel.html?type=recent-events
~~~

## Follow dry-run

~~~text
http://127.0.0.1:8000/api/follow?name=ManualFollowTest&dryRun=true
~~~

## Follow live

~~~text
http://127.0.0.1:8000/api/follow?name=ManualFollowTest
~~~

## Sub dry-run

~~~text
http://127.0.0.1:8000/api/sub?name=ManualSubTest&dryRun=true
~~~

## Sub live

~~~text
http://127.0.0.1:8000/api/sub?name=ManualSubTest
~~~

## Goal dry-run

~~~text
http://127.0.0.1:8000/api/goal?key=followers&current=55&target=100&dryRun=true
~~~

## Goal live

~~~text
http://127.0.0.1:8000/api/goal?key=followers&current=55&target=100
~~~

## Custom event dry-run

~~~text
http://127.0.0.1:8000/api/event?type=custom&name=ManualEventTest&detail=Manual%20custom%20event&time=Just%20now&dryRun=true
~~~

## Custom event live

~~~text
http://127.0.0.1:8000/api/event?type=custom&name=ManualEventTest&detail=Manual%20custom%20event&time=Just%20now
~~~

## Streamer.bot variable examples

Raid:

~~~text
http://127.0.0.1:8000/api/raid?name=%userName%&viewers=%viewers%&dryRun=true
~~~

Bits:

~~~text
http://127.0.0.1:8000/api/bits?name=%userName%&bits=%bits%&cheers=1&dryRun=true
~~~

Follow:

~~~text
http://127.0.0.1:8000/api/follow?name=%userName%&dryRun=true
~~~

Sub:

~~~text
http://127.0.0.1:8000/api/sub?name=%userName%&dryRun=true
~~~

## URL encoding

Spaces in query parameters should be written as `%20`.

Example:

~~~text
Manual%20custom%20event
~~~

For normal Twitch usernames and numbers, no special encoding is usually needed.

## Troubleshooting

If Flora returns an error such as:

~~~text
viewers must be an integer
~~~

Streamer.bot probably did not replace the variable. Test with a manual URL first, then replace one value at a time with Streamer.bot variables.
## Quickstart

For the recommended first Streamer.bot test action, see:

~~~text
docs/streamerbot/fetch-url-quickstart.md
~~~
## Live Twitch triggers

For recipes using real Twitch triggers, see:

~~~text
docs/streamerbot/live-trigger-recipes.md
~~~

## Follow goal auto-increment

For follow triggers that should also update the follower goal, add `updateGoal=true` to the Follow Fetch URL.

~~~text
http://127.0.0.1:8000/api/follow?name=%userName%&updateGoal=true
~~~

## Subscription goal auto-increment

For subscription triggers that should also update the subscription goal, add `updateGoal=true` to the Subscription Fetch URL.

~~~text
http://127.0.0.1:8000/api/sub?name=%userName%&updateGoal=true
~~~
