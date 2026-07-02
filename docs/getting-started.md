# Getting Started from Scratch

This guide starts from a fresh computer and ends with Flora running locally, an OBS browser source open, and Streamer.bot ready to send events.

Flora uses Python 3, HTML, CSS, vanilla JavaScript, and JSON. No Node.js, npm, database, or external Python packages are required.

## 1. Install Python

Flora needs Python 3 available from the command line.

### Windows

Install Python from:

```text
https://www.python.org/downloads/windows/
```

During installation, enable:

```text
Add python.exe to PATH
```

Then open a new PowerShell window and check:

```powershell
python --version
```

If that does not work, try:

```powershell
py -3 --version
```

Useful checks:

```powershell
where python
where py
```

If `python` is not found, rerun the Python installer, choose **Modify**, enable the PATH option, and reopen PowerShell.

### Linux

Check whether Python is already installed:

```bash
python --version
```

If that does not work:

```bash
python3 --version
```

On Arch, Omarchy, or other Arch-based systems:

```bash
sudo pacman -S python
```

On Ubuntu, Debian, or Linux Mint:

```bash
sudo apt update
sudo apt install python3
```

On Fedora:

```bash
sudo dnf install python3
```

Check the Python path:

```bash
command -v python || command -v python3
```

Most Flora examples use `python`. If your system only has `python3`, use `python3` in place of `python`.

## 2. Download Flora

There are two normal ways to get Flora.

### Option A: Clone the GitHub repo

Use this if you have Git installed and want to update Flora later with `git pull`.

```bash
git clone https://github.com/vze3f372/Flora.git
cd Flora
```

On Windows PowerShell:

```powershell
git clone https://github.com/vze3f372/Flora.git
cd Flora
```

### Option B: Download a ZIP release or source archive

Use this if you do not want to use Git.

1. Open the Flora GitHub page.
2. Open **Releases** or **Tags**.
3. Download the source ZIP for the version you want.
4. Extract the ZIP somewhere permanent.
5. Open a terminal in the extracted Flora folder.

## 3. Start Flora

From the Flora folder, start the local server.

### Linux

```bash
./start-server-linux.sh
```

Equivalent direct command:

```bash
python scripts/flora-launcher.py
```

If your system only has `python3`:

```bash
python3 scripts/flora-launcher.py
```

### Windows

```bat
start-server-windows.bat
```

If needed, run directly from PowerShell:

```powershell
python scripts\flora-launcher.py
```

or:

```powershell
py -3 scripts\flora-launcher.py
```

### Expected result

The launcher should print something like:

```json
{
  "ok": true,
  "action": "started",
  "pid": 12345,
  "url": "http://127.0.0.1:8000/api/health",
  "log": "logs/flora-server.log"
}
```

If Flora was already running, this is also good:

```json
{
  "ok": true,
  "action": "already-running",
  "url": "http://127.0.0.1:8000/api/health"
}
```

## 4. Check that Flora is running

Open this in a browser:

```text
http://127.0.0.1:8000/api/health
```

Linux terminal:

```bash
curl -s http://127.0.0.1:8000/api/health
```

Windows PowerShell:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/api/health
```

## 5. Open the Admin UI

Open:

```text
http://127.0.0.1:8000/admin.html
```

The Admin UI is the easiest place to configure Flora.

It includes controls for goals, panel colors, theme presets, layout presets, rotations, runtime reset/restore, OBS source URLs, and Streamer.bot Fetch URLs.

## 6. Preview a panel

Open one of these in a browser:

```text
http://127.0.0.1:8000/panel.html?type=raids
http://127.0.0.1:8000/panel.html?type=bits
http://127.0.0.1:8000/panel.html?type=sub-months-total
http://127.0.0.1:8000/panel.html?type=sub-months-streak
http://127.0.0.1:8000/panel.html?type=gift-subs
http://127.0.0.1:8000/panel.html?type=follower-goal
http://127.0.0.1:8000/panel.html?type=sub-goal
http://127.0.0.1:8000/panel.html?type=recent-events
```

Rotation examples:

```text
http://127.0.0.1:8000/panel.html?rotation=true
http://127.0.0.1:8000/panel.html?rotation=leaderboards
http://127.0.0.1:8000/panel.html?rotation=goals
```

## 7. Add Flora to OBS

In OBS Studio:

1. Add a new **Browser Source**.
2. Paste a Flora panel URL.
3. Set the browser source size.
4. Refresh the source after changing Flora settings.

Recommended starting URLs:

```text
http://127.0.0.1:8000/panel.html?type=recent-events
http://127.0.0.1:8000/panel.html?rotation=true
```

For all available URLs, open the Admin UI and use the **OBS Source URLs** card.

## 8. Send a test event

Raid test:

```text
http://127.0.0.1:8000/api/raid?name=TestRaider&viewers=12
```

Bits test:

```text
http://127.0.0.1:8000/api/bits?name=TestUser&bits=100&cheers=1
```

Follow test:

```text
http://127.0.0.1:8000/api/follow?name=TestFollower
```

Sub test:

```text
http://127.0.0.1:8000/api/sub?name=TestSub
http://127.0.0.1:8000/api/sub?name=TestSub&totalMonths=12&streakMonths=3&tier=tier%201&isPrimeSub=false
http://127.0.0.1:8000/api/gift-sub?name=TestGifter&recipient=TestRecipient&giftCount=1&totalGifted=5&tier=tier%202&anonymous=false&monthsGifted=3
```

Goal test:

```text
http://127.0.0.1:8000/api/goal?key=followers&current=55&target=100
```

After sending a test event, refresh or view the relevant panel.

## 9. Set up Streamer.bot

The recommended Streamer.bot workflow is Fetch URL.

Start with:

```text
docs/streamerbot/setup-checklist.md
```

Basic flow:

```text
Twitch trigger
  -> optional Twitch user info lookup
  -> Core → Network → Fetch URL
  -> Flora local API endpoint
```

The Admin UI has a **Streamer.bot Action Builder** that generates Fetch URLs for common event types.

Common API endpoints:

```text
http://127.0.0.1:8000/api/raid?name=%userName%&viewers=%viewers%
http://127.0.0.1:8000/api/bits?name=%userName%&bits=%bits%&cheers=1
http://127.0.0.1:8000/api/follow?name=%userName%
http://127.0.0.1:8000/api/sub?name=%userName%
http://127.0.0.1:8000/api/sub?name=%userName%&totalMonths=%badgeCount%&streakMonths=%monthsSubscribed%&tier=%tier%&isPrimeSub=%isPrimeSub%
http://127.0.0.1:8000/api/gift-sub?name=%userName%&recipient=%recipientUserName%&giftCount=1&totalGifted=%totalSubsGifted%&tier=%tier%&anonymous=%anonymous%&monthsGifted=%monthsGifted%
```

For avatar support, add a Twitch user info lookup before the Fetch URL action and include:

```text
avatarUrl=%targetUserProfileImageUrlEscaped%
```

## 10. Streamer.bot on Linux through Wine

If Streamer.bot is running through Wine on Linux, use:

```text
start-server-wine.bat
```

In Streamer.bot:

```text
Core → System → Run a Program
```

Example:

```text
File / Command:
Z:\home\vze3f372\Documents\streamerbot\streampanel\start-server-wine.bat

Working Directory:
Z:\home\vze3f372\Documents\streamerbot\streampanel

Arguments:
```

Leave `Arguments` empty.

For another install location, change both paths to match your local Flora folder.

## 11. Stop Flora

Linux:

```bash
pkill -f 'scripts/flora-server.py' || true
```

Windows users can stop the Python process from Task Manager or PowerShell.

## 12. Troubleshooting

### Python is not found

Check:

```bash
python --version
python3 --version
```

Windows:

```powershell
python --version
py -3 --version
where python
where py
```

Install Python again and enable the PATH option.

### The browser cannot open Flora

Check:

```text
http://127.0.0.1:8000/api/health
```

Check the log:

```text
logs/flora-server.log
```

### OBS does not update

Refresh the OBS browser source.

Also check that the OBS URL uses:

```text
http://127.0.0.1:8000
```

### Streamer.bot sends nothing

Test the Flora URL directly in a browser first.

Then check:

- Streamer.bot trigger is enabled.
- Fetch URL action is enabled.
- The URL starts with `http://127.0.0.1:8000`.
- Streamer.bot variables match the trigger type.
- Flora is running before the trigger fires.

## Next docs to read

- `docs/admin-ui.md`
- `docs/server-launcher.md`
- `docs/streamerbot/setup-checklist.md`
- `docs/streamerbot/fetch-url-quickstart.md`
- `docs/streamerbot/live-trigger-recipes.md`
