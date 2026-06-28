# Flora Server Launcher

Flora includes a small launcher that starts the local server only if it is not already running.

Launcher script:

```text
scripts/flora-launcher.py
```

Default server URL:

```text
http://127.0.0.1:8000
```

Health check:

```text
http://127.0.0.1:8000/api/health
```

Server log:

```text
logs/flora-server.log
```

The launcher is safe to call repeatedly. If Flora is already running, it exits without starting a duplicate server.

## Linux

From the repository root:

```bash
./start-server-linux.sh
```

Equivalent direct command:

```bash
python scripts/flora-launcher.py
```

## Windows

From the repository root:

```bat
start-server-windows.bat
```

The Windows script tries:

```bat
python scripts\flora-launcher.py
```

and then falls back to:

```bat
py -3 scripts\flora-launcher.py
```

## Streamer.bot on Linux through Wine

When Streamer.bot is running through Wine on Linux, use the Wine batch wrapper:

```bat
start-server-wine.bat
```

In Streamer.bot:

```text
Core → System → Run a Program
```

Use your local Flora path. For example:

```text
File / Command:
Z:\home\vze3f372\Documents\streamerbot\streampanel\start-server-wine.bat

Working Directory:
Z:\home\vze3f372\Documents\streamerbot\streampanel

Arguments:
```

Leave `Arguments` empty.

For another user or install path, adjust the `File / Command` and `Working Directory` paths to match the local Flora repo.

The Wine wrapper uses Wine's `start /unix` bridge to launch native Linux Python.

## Expected launcher output

If Flora was not running:

```json
{
  "ok": true,
  "action": "started",
  "pid": 12345,
  "url": "http://127.0.0.1:8000/api/health",
  "log": "logs/flora-server.log"
}
```

If Flora was already running:

```json
{
  "ok": true,
  "action": "already-running",
  "url": "http://127.0.0.1:8000/api/health"
}
```

## Troubleshooting

Check server health:

```bash
curl -s http://127.0.0.1:8000/api/health | python -m json.tool
```

Check for a running server:

```bash
pgrep -af 'flora-server.py'
```

Stop Flora manually:

```bash
pkill -f 'scripts/flora-server.py' || true
```

View the log:

```bash
tail -n 80 logs/flora-server.log
```
