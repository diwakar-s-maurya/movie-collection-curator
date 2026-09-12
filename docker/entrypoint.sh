#!/bin/sh
# Starts the API, then hands the foreground to nginx so the proxy is PID 1:
# it receives Fly's signals directly and the container's lifetime is its own.
# Written for dash — no `wait -n`.
set -eu

node /app/apps/api/dist/app.js &
api=$!

# If the API stops, so does the container: Fly restarts the machine rather
# than leaving nginx serving a frontend with no API behind it.
watch_api() {
  wait "$api" || true
  echo '[entrypoint] api exited, stopping nginx' >&2
  kill -TERM 1 2>/dev/null || true
}
watch_api &

# The API drains through its own graceful shutdown when nginx forwards the
# signal on the way down.
trap 'kill -TERM "$api" 2>/dev/null || true' TERM INT

exec nginx -c /etc/nginx/nginx.conf -g 'daemon off;'
