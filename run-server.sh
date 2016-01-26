#!/bin/bash
export GEN_WS_PORT=8888
export GEN_WS_AS_HOST=192.168.1.101
until node index.js; do
	notify-send "Server crashed with exit code $?.  Respawning.." >&2
	sleep 1
done
