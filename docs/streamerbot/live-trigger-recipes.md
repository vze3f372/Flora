# Live Twitch trigger recipes

These recipes connect real Streamer.bot Twitch triggers to Flora using Fetch URL.

Use Fetch URL instead of C# HTTP code on Linux/Wine.

## Prerequisite

Start Flora:

~~~bash
./start-server-linux.sh
~~~

Health check:

~~~text
http://127.0.0.1:8000/api/health
~~~

## Recommended workflow

For each trigger:

1. Create or open a Streamer.bot action.
2. Add the Twitch trigger.
3. Add a Fetch URL sub-action.
4. Start with `dryRun=true`.
5. Trigger or simulate the event.
6. Confirm the Flora server terminal shows the GET request.
7. Remove `dryRun=true`.
8. Test live.
9. Confirm the Flora panel updated.
10. Restore test data before committing repo changes.

If Streamer.bot asks for a response variable name, use:

~~~text
floraResponse
~~~

The response variable is optional. The most useful confirmation is the Flora server terminal output.

## Raid trigger

Trigger:

~~~text
Twitch → Raid → Raid
~~~

Dry-run Fetch URL:

~~~text
http://127.0.0.1:8000/api/raid?name=%userName%&viewers=%viewers%&dryRun=true
~~~

Live Fetch URL:

~~~text
http://127.0.0.1:8000/api/raid?name=%userName%&viewers=%viewers%
~~~

Expected result:

~~~text
data/raids.json updates.
data/events.json gets a newest-first raid event.
~~~

Panels:

~~~text
http://127.0.0.1:8000/panel.html?type=raids
http://127.0.0.1:8000/panel.html?type=recent-events
~~~

Important:

~~~text
Use %viewers% for raid size.
Do not use %viewerCount% for the raid trigger.
~~~

## Bits / cheer trigger

Trigger:

~~~text
Twitch → Chat → Cheer
~~~

Dry-run Fetch URL:

~~~text
http://127.0.0.1:8000/api/bits?name=%userName%&bits=%bits%&cheers=1&dryRun=true
~~~

Live Fetch URL:

~~~text
http://127.0.0.1:8000/api/bits?name=%userName%&bits=%bits%&cheers=1
~~~

Expected result:

~~~text
data/bits.json updates.
data/events.json gets a newest-first bits event.
~~~

Panels:

~~~text
http://127.0.0.1:8000/panel.html?type=bits
http://127.0.0.1:8000/panel.html?type=recent-events
~~~

If `%bits%` is not replaced, inspect Action History for the exact Cheer trigger variable name and update the URL.

## Follow trigger

Trigger:

~~~text
Twitch → Channel → Follow
~~~

Dry-run Fetch URL:

~~~text
http://127.0.0.1:8000/api/follow?name=%userName%&dryRun=true
~~~

Live Fetch URL:

~~~text
http://127.0.0.1:8000/api/follow?name=%userName%
~~~

Expected result:

~~~text
data/events.json gets a newest-first follow event.
~~~

Panel:

~~~text
http://127.0.0.1:8000/panel.html?type=recent-events
~~~

## Subscription trigger

Trigger:

~~~text
Twitch → Subscriptions → Subscription
~~~

Dry-run Fetch URL:

~~~text
http://127.0.0.1:8000/api/sub?name=%userName%&dryRun=true
~~~

Live Fetch URL:

~~~text
http://127.0.0.1:8000/api/sub?name=%userName%
~~~

Subscription leaderboard Fetch URL:

~~~text
http://127.0.0.1:8000/api/sub?name=%userName%&totalMonths=%badgeCount%&streakMonths=%monthsSubscribed%&tier=%tier%&isPrimeSub=%isPrimeSub%&avatarUrl=%targetUserProfileImageUrlEscaped%
~~~

Expected result:

~~~text
data/events.json gets a newest-first subscription event.
~~~

Panel:

~~~text
http://127.0.0.1:8000/panel.html?type=recent-events
~~~

Optional subscription detail variable to inspect:

~~~text
%tier%
~~~

## Follower goal update

This action is not usually tied to the Follow trigger directly unless you already have the current follower count available.

Manual dry-run Fetch URL:

~~~text
http://127.0.0.1:8000/api/goal?key=followers&current=55&target=100&dryRun=true
~~~

Manual live Fetch URL:

~~~text
http://127.0.0.1:8000/api/goal?key=followers&current=55&target=100
~~~

Expected result:

~~~text
data/goals.json updates the followers goal.
~~~

Panel:

~~~text
http://127.0.0.1:8000/panel.html?type=follower-goal
~~~

If using a real follower count variable, first inspect Action History to confirm the exact variable name.

## Variable verification

Streamer.bot variables are scoped to the current action run. To see what variables were populated, run the action, then open:

~~~text
Action Queues → Action History
~~~

Double-click the action run to inspect populated variables.

Use this whenever a URL fails because a value was not replaced.

Common failure examples:

~~~text
viewers must be an integer
bits must be an integer
name is required
~~~

These usually mean Streamer.bot sent the literal variable text, such as `%viewers%`, instead of replacing it with a real value.

## Manual fallback URLs

Use these to prove the Flora side works before testing trigger variables.

Raid:

~~~text
http://127.0.0.1:8000/api/raid?name=ManualRaidTest&viewers=12&dryRun=true
~~~

Bits:

~~~text
http://127.0.0.1:8000/api/bits?name=ManualBitsTest&bits=100&cheers=1&dryRun=true
~~~

Follow:

~~~text
http://127.0.0.1:8000/api/follow?name=ManualFollowTest&dryRun=true
~~~

Sub:

~~~text
http://127.0.0.1:8000/api/sub?name=ManualSubTest&dryRun=true
~~~

Goal:

~~~text
http://127.0.0.1:8000/api/goal?key=followers&current=55&target=100&dryRun=true
~~~

## Restore after live tests

After live manual or trigger tests, restore test data before committing:

~~~bash
rm -f data/raids.json data/bits.json data/subs.json data/gift-subs.json data/events.json data/goals.json
python scripts/flora-launcher.py
python scripts/check.py
python scripts/validate-config.py
~~~

## Follow goal auto-increment

Use `updateGoal=true` on the Follow Fetch URL to increment `followers.current` by 1.

~~~text
http://127.0.0.1:8000/api/follow?name=%userName%&updateGoal=true
~~~

## Subscription goal auto-increment

Use `updateGoal=true` on the Subscription Fetch URL to increment `subscribers.current` by 1.

Dry-run:

~~~text
http://127.0.0.1:8000/api/sub?name=%userName%&updateGoal=true&dryRun=true
~~~

Live:

~~~text
http://127.0.0.1:8000/api/sub?name=%userName%&updateGoal=true
~~~

## Gift subscription leaderboard

Trigger:

~~~text
Twitch → Subscriptions → Gift Subscription
~~~

Dry-run Fetch URL:

~~~text
http://127.0.0.1:8000/api/gift-sub?name=%userName%&recipient=%recipientUserName%&giftCount=1&totalGifted=%totalSubsGifted%&tier=%tier%&anonymous=%anonymous%&monthsGifted=%monthsGifted%&avatarUrl=%targetUserProfileImageUrlEscaped%&dryRun=true
~~~

Live Fetch URL:

~~~text
http://127.0.0.1:8000/api/gift-sub?name=%userName%&recipient=%recipientUserName%&giftCount=1&totalGifted=%totalSubsGifted%&tier=%tier%&anonymous=%anonymous%&monthsGifted=%monthsGifted%&avatarUrl=%targetUserProfileImageUrlEscaped%
~~~

Live Fetch URL with subscriber goal increment:

~~~text
http://127.0.0.1:8000/api/gift-sub?name=%userName%&recipient=%recipientUserName%&giftCount=1&totalGifted=%totalSubsGifted%&tier=%tier%&anonymous=%anonymous%&monthsGifted=%monthsGifted%&avatarUrl=%targetUserProfileImageUrlEscaped%&updateGoal=true
~~~
