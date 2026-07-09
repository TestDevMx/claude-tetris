#!/usr/bin/env bash
# Fetches current weather via wttr.in (no API key required).
# Usage: weather.sh [location] [format]
#   location: city name, airport code, or "" for IP-based auto-detect
#   format:   "full" (default, human-readable) or "json" (raw data)
set -euo pipefail

location="${1:-}"
format="${2:-full}"

# wttr.in expects spaces encoded as "+"
location="${location// /+}"

if [[ "$format" == "json" ]]; then
  curl -fsS "https://wttr.in/${location}?format=j1"
else
  # ?0 = current conditions only, compact one-line-per-metric report
  curl -fsS "https://wttr.in/${location}?0"
fi
