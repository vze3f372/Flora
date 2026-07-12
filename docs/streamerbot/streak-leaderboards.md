# Streak leaderboards

Flora supports two separate streak leaderboard panels:

- `stream-streaks`: Flora Watch Streak, managed locally by Flora.
- `watch-streaks`: Twitch Watch Streak reported by Streamer.bot.

Keep these separate. They measure different things.

## OBS browser source URLs

Flora Watch Streak:

~~~text
http://127.0.0.1:8000/panel.html?type=stream-streaks
~~~

Twitch Watch Streak:

~~~text
http://127.0.0.1:8000/panel.html?type=watch-streaks
~~~

## Flora Watch Streak

Use this when you want Flora to calculate its own consecutive-stream attendance leaderboard.

Recommended Streamer.bot trigger:

~~~text
Twitch -> Chat -> First Words
~~~

Fetch URL:

~~~text
http://127.0.0.1:8000/api/streaks/attendance/check-in?name=%userName%&streamId=%date:yyyy-MM-dd%
~~~

This writes to:

~~~text
data/streaks.json
data/stream-sessions.json
~~~

Rules:

- A viewer can only gain one attendance streak credit per stream.
- Repeated check-ins for the same stream do not increment the streak.
- If the viewer checked in during the previous stream, their streak increments.
- If they missed the previous stream, their current streak resets to `1`.
- `bestStreak` stores their highest Flora attendance streak.

## Twitch Watch Streak

Use this when you want Flora to display Twitch's official watch streak value.

Recommended Streamer.bot trigger:

~~~text
Twitch -> Chat -> Watch Streak
~~~

Fetch URL:

~~~text
http://127.0.0.1:8000/api/streaks/twitch/watch-streak\?name\=%userName%\&watchStreak\=%watchStreak%\&watchStreakId\=%watchStreakId%\&message\=%systemMessage%
~~~

This writes to:

~~~text
data/watch-streaks.json
~~~

Rules:

- Flora does not calculate this value.
- Flora stores the Twitch-reported `%watchStreak%`.
- `bestWatchStreak` stores the highest Twitch-reported value Flora has seen for that viewer.
- Only viewers who share/spark a Twitch watch streak will appear in this panel.
- Channel points are not displayed in the panel.

## API test commands

Flora attendance streak test:

~~~bash
curl "http://127.0.0.1:8000/api/streaks/attendance/check-in?name=ApiAttendanceTest&streamId=2026-07-09"
~~~

Twitch-native watch streak test:

~~~bash
curl "http://127.0.0.1:8000/api/streaks/twitch/watch-streak?name=ApiTwitchTest&watchStreak=9&watchStreakId=sample-api-watch-streak-id&message=Sample%20API%20watch%20streak"
~~~
