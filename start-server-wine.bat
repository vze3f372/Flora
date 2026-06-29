@echo off
cd /d Z:\home\vze3f372\Documents\streamerbot\streampanel
start /unix /usr/bin/bash /home/vze3f372/Documents/streamerbot/streampanel/start-server-linux.sh --watch-streamerbot %*
exit /b 0
