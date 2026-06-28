# Streamer.bot Setup Checklist

This checklist walks through the recommended Streamer.bot setup for Flora.

It covers:

- Starting the Flora server
- OBS browser source URLs
- Raid leaderboard actions
- Bits leaderboard actions
- Follower goal actions
- Subscriber goal actions
- Twitch avatar support
- Testing and troubleshooting

## 1. Start the Flora server

Flora must be running before Streamer.bot Fetch URL actions can update panels.

Health check:

    http://127.0.0.1:8000/api/health

Expected response:

    {
      "ok": true,
      "service": "flora",
      "root": "..."
    }

### Windows native Streamer.bot

Use:

    Core → System → Run a Program

Settings:

    File / Command:
    python

    Working Directory:
    C:\path\to\streampanel

    Arguments:
    scripts\flora-launcher.py

Alternative:

    File / Command:
    C:\path\to\streampanel\start-server-windows.bat

    Working Directory:
    C:\path\to\streampanel

    Arguments:
    

Leave Arguments empty when using the batch file.

### Linux terminal

From the Flora project directory:

    python scripts/flora-launcher.py

### Streamer.bot on Linux through Wine

Use:

    Core → System → Run a Program

Settings:

    File / Command:
    Z:\home\vze3f372\Documents\streamerbot\streampanel\start-server-wine.bat

    Working Directory:
    Z:\home\vze3f372\Documents\streamerbot\streampanel

    Arguments:
    

Leave Arguments empty.

The Wine wrapper uses native Linux Python through Wine's `start /unix` bridge.

## 2. Add OBS browser sources

Use these URLs as OBS browser sources.

Raid leaderboard:

    http://127.0.0.1:8000/panel.html?type=raids

Raid count leaderboard:

    http://127.0.0.1:8000/panel.html?type=raids-count

Biggest raid leaderboard:

    http://127.0.0.1:8000/panel.html?type=raids-biggest

Bits leaderboard:

    http://127.0.0.1:8000/panel.html?type=bits

Cheer count leaderboard:

    http://127.0.0.1:8000/panel.html?type=bits-count

Biggest cheer leaderboard:

    http://127.0.0.1:8000/panel.html?type=bits-biggest

Follower goal:

    http://127.0.0.1:8000/panel.html?type=follower-goal

Subscriber goal:

    http://127.0.0.1:8000/panel.html?type=sub-goal

Recent events:

    http://127.0.0.1:8000/panel.html?type=recent-events

Default rotation:

    http://127.0.0.1:8000/panel.html?rotation=true

Named leaderboard rotation:

    http://127.0.0.1:8000/panel.html?rotation=leaderboards

Named goals rotation:

    http://127.0.0.1:8000/panel.html?rotation=goals

## 3. Use the Admin Action Builder

Open:

    http://127.0.0.1:8000/admin.html

Go to:

    Streamer.bot Action Builder

Use it to generate Fetch URLs for Streamer.bot.

The generated URLs can be copied directly into:

    Core → Network → Fetch URL

## 4. Raid action

Streamer.bot trigger:

    Twitch → Raid

Recommended sub-actions:

    1. Twitch → User → Get User Info For Target
    2. Core → Network → Fetch URL

For the user info sub-action:

    User Login:
    %userName%

Fetch URL without avatar support:

    http://127.0.0.1:8000/api/raid?name=%userName%&viewers=%viewers%

Fetch URL with avatar support:

    http://127.0.0.1:8000/api/raid?name=%userName%&avatarUrl=%targetUserProfileImageUrl%&viewers=%viewers%

Test URL with dry run:

    http://127.0.0.1:8000/api/raid?name=TestRaider&viewers=5&dryRun=true

## 5. Bits / cheer action

Streamer.bot trigger:

    Twitch → Cheer

Recommended sub-actions:

    1. Twitch → User → Get User Info For Target
    2. Core → Network → Fetch URL

For the user info sub-action:

    User Login:
    %userName%

Fetch URL without avatar support:

    http://127.0.0.1:8000/api/bits?name=%userName%&bits=%bits%&cheers=1

Fetch URL with avatar support:

    http://127.0.0.1:8000/api/bits?name=%userName%&avatarUrl=%targetUserProfileImageUrl%&bits=%bits%&cheers=1

Test URL with dry run:

    http://127.0.0.1:8000/api/bits?name=TestCheerer&bits=100&cheers=1&dryRun=true

## 6. Follow action

Streamer.bot trigger:

    Twitch → Follow

Recommended sub-actions:

    1. Twitch → User → Get User Info For Target
    2. Core → Network → Fetch URL

For the user info sub-action:

    User Login:
    %userName%

Fetch URL without avatar support:

    http://127.0.0.1:8000/api/follow?name=%userName%&updateGoal=true

Fetch URL with avatar support:

    http://127.0.0.1:8000/api/follow?name=%userName%&avatarUrl=%targetUserProfileImageUrl%&updateGoal=true

Test URL with dry run:

    http://127.0.0.1:8000/api/follow?name=TestFollower&updateGoal=true&dryRun=true

## 7. Subscription action

Streamer.bot trigger:

    Twitch → Subscription

Recommended sub-actions:

    1. Twitch → User → Get User Info For Target
    2. Core → Network → Fetch URL

For the user info sub-action:

    User Login:
    %userName%

Fetch URL without avatar support:

    http://127.0.0.1:8000/api/sub?name=%userName%&updateGoal=true

Fetch URL with avatar support:

    http://127.0.0.1:8000/api/sub?name=%userName%&avatarUrl=%targetUserProfileImageUrl%&updateGoal=true

Test URL with dry run:

    http://127.0.0.1:8000/api/sub?name=TestSubscriber&updateGoal=true&dryRun=true

## 8. Avatar support

Avatar support is optional.

Flora only caches real Twitch avatars when Streamer.bot sends an avatar URL.

Required Streamer.bot sub-action before the Fetch URL:

    Twitch → User → Get User Info For Target

Set:

    User Login:
    %userName%

Then include this Fetch URL parameter:

    avatarUrl=%targetUserProfileImageUrl%

Flora stores avatar metadata in:

    data/avatar-cache.json

Flora stores downloaded avatar images in:

    assets/avatars/

Both are runtime cache locations and are ignored by Git.

## 9. Testing checklist

Before going live, confirm:

- Flora server health check returns `"ok": true`
- OBS browser sources load correctly
- Raid test updates `data/raids.json`
- Bits test updates `data/bits.json`
- Follow test updates follower goal and recent events
- Sub test updates subscriber goal and recent events
- Avatar-enabled tests create `data/avatar-cache.json`
- Avatar images appear in `assets/avatars/`
- Panels show avatars or initials fallback badges
- Streamer.bot startup action does not create duplicate Flora servers

Useful terminal checks:

    curl -s http://127.0.0.1:8000/api/health | python -m json.tool

    pgrep -af 'flora-server.py'

    python -m json.tool data/avatar-cache.json

    find assets/avatars -maxdepth 1 -type f

## 10. Troubleshooting

### Fetch URL fails

Check that Flora is running:

    curl -s http://127.0.0.1:8000/api/health | python -m json.tool

If not running, start it:

    python scripts/flora-launcher.py

### Streamer.bot creates no data

Check that the Fetch URL uses the correct variables for the trigger.

For raid:

    %userName%
    %viewers%

For bits:

    %userName%
    %bits%

### Avatar does not appear

Confirm that Streamer.bot runs this before the Fetch URL:

    Twitch → User → Get User Info For Target

Confirm the Fetch URL includes:

    avatarUrl=%targetUserProfileImageUrl%

Check:

    python -m json.tool data/avatar-cache.json

### Browser shows stale layout

Use a hard refresh.

Opera / Chromium:

    Ctrl + F5

OBS:

    Right-click Browser Source → Properties → Refresh cache of current page

### Duplicate server prevention

The launcher is safe to call repeatedly.

First call:

    "action": "started"

Later calls:

    "action": "already-running"
