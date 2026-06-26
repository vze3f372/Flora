@echo off
cd /d "%~dp0"
py -3 scripts\flora-server.py --host 127.0.0.1 --port 8000
