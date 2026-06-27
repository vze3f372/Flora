# Streamer.bot HTTP action integration

Flora provides local HTTP endpoints for Streamer.bot.

This is the recommended integration method when running Streamer.bot through Wine on Linux.

Streamer.bot sends a local HTTP request to Flora. Flora then updates the JSON data files safely.

## Server

Start Flora with the project start script.

~~~bash
./start-server-linux.sh
~~~

The server provides both the OBS browser source files and the local write API.

Health check:

~~~text
GET http://127.0.0.1:8000/api/health
~~~

Panel examples:

~~~text
http://127.0.0.1:8000/panel.html\?type\=raids
http://127.0.0.1:8000/panel.html\?type\=bits
http://127.0.0.1:8000/panel.html\?type\=follower-goal
http://127.0.0.1:8000/panel.html\?type\=recent-events
http://127.0.0.1:8000/panel.html\?rotation\=true\&duration\=3
~~~

## Dry-run mode

Add `dryRun=true` to an API URL to test the action without changing JSON files.

Example:

~~~text
http://127.0.0.1:8000/api/raid\?dryRun\=true
~~~

## Raid action

Use a Streamer.bot HTTP request sub-action.

Method:

~~~text
POST
~~~

URL:

~~~text
http://127.0.0.1:8000/api/raid
~~~

Content type:

~~~text
application/json
~~~

Dry-run body:

~~~json
{
  "name": "%userName%",
  "viewers": "%viewers%"
}
~~~

This updates:

~~~text
data/raids.json
data/events.json
~~~

## Bits action

Method:

~~~text
POST
~~~

URL:

~~~text
http://127.0.0.1:8000/api/bits
~~~

Content type:

~~~text
application/json
~~~

Body:

~~~json
{
  "name": "%userName%",
  "bits": "%bits%",
  "cheers": "1"
}
~~~

This updates:

~~~text
data/bits.json
data/events.json
~~~

## Follow action

Method:

~~~text
POST
~~~

URL:

~~~text
http://127.0.0.1:8000/api/follow
~~~

Content type:

~~~text
application/json
~~~

Body:

~~~json
{
  "name": "%userName%"
}
~~~

This updates:

~~~text
data/events.json
~~~

## Subscription action

Method:

~~~text
POST
~~~

URL:

~~~text
http://127.0.0.1:8000/api/sub
~~~

Content type:

~~~text
application/json
~~~

Body:

~~~json
{
  "name": "%userName%"
}
~~~

This updates:

~~~text
data/events.json
~~~

## Follower goal action

Method:

~~~text
POST
~~~

URL:

~~~text
http://127.0.0.1:8000/api/goal
~~~

Content type:

~~~text
application/json
~~~

Body:

~~~json
{
  "key": "followers",
  "current": "55",
  "target": "100"
}
~~~

This updates:

~~~text
data/goals.json
~~~

## Generic event action

Use this when the event detail text needs to be custom.

Method:

~~~text
POST
~~~

URL:

~~~text
http://127.0.0.1:8000/api/event
~~~

Content type:

~~~text
application/json
~~~

Body:

~~~json
{
  "type": "custom",
  "name": "%userName%",
  "detail": "Did something interesting",
  "time": "Just now"
}
~~~

This updates:

~~~text
data/events.json
~~~

## Variable names

Streamer.bot variable names may differ between triggers.

Start with `dryRun=true`.

If the API returns an error such as `viewers must be an integer`, the trigger variable was probably not replaced by Streamer.bot. Adjust the variable name in the request body and test again.

## Recommended setup order

1. Create the Streamer.bot action.
2. Add the HTTP request sub-action.
3. Use `dryRun=true` first.
4. Trigger the event manually.
5. Confirm the API returns `"ok": true`.
6. Remove `dryRun=true`.
7. Trigger the event again.
8. Refresh the relevant Flora panel in the browser or OBS.

## Fetch URL compatibility

For Streamer.bot Fetch URL recipes that do not require C# POST requests, see:

~~~text
docs/streamerbot/fetch-url-recipes.md
~~~
