# Flora Server Launcher

Flora includes a small cross-platform launcher for starting the local Python server from Streamer.bot or from a desktop shortcut.

The launcher checks whether Flora is already running before starting a new server.

## Launcher script

    scripts/flora-launcher.py

Default server URL:

    http://127.0.0.1:8000

Health check URL:

    http://127.0.0.1:8000/api/health

Server logs are written to:

    logs/flora-server.log

## Linux

From the Flora project directory:

    python scripts/flora-launcher.py

The launcher starts `scripts/flora-server.py` in the background if it is not already running.

## Windows

From the Flora project directory:

    start-server-windows.bat

Or run directly:

    python scripts\flora-launcher.py

## Streamer.bot setup

Use:

    Core → System → Run a Program

For Windows native Streamer.bot:

    File / Command:
    python

    Working Directory:
    C:\path\to\streampanel

    Arguments:
    scripts\flora-launcher.py

For Linux or macOS:

    File / Command:
    python

    Working Directory:
    /path/to/streampanel

    Arguments:
    scripts/flora-launcher.py

## Notes for Linux with Streamer.bot under Wine

If Streamer.bot is running under Wine, it may not reliably call the native Linux Python executable. In that case, prefer starting Flora through the Linux desktop session, terminal, or an OS-level autostart method.

The launcher is still useful because it prevents duplicate Flora servers when called repeatedly.

## Streamer.bot on Linux through Wine

If Streamer.bot is running through Wine on Linux, use the Wine batch wrapper:

    start-server-wine.bat

This wrapper uses Wine's `start /unix` bridge to launch native Linux Python:

    start /unix /usr/bin/python /home/vze3f372/Documents/streamerbot/streampanel/scripts/flora-launcher.py

In Streamer.bot, create an action with:

    Core → System → Run a Program

Use:

    File / Command:
    Z:\home\vze3f372\Documents\streamerbot\streampanel\start-server-wine.bat

    Working Directory:
    Z:\home\vze3f372\Documents\streamerbot\streampanel

    Arguments:
    

Leave Arguments empty.

This is the recommended setup for Omarchy Linux when Streamer.bot is running under Wine.
