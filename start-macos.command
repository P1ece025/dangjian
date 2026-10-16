#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Please install Node.js 18 or newer, then run this file again."
  exit 1
fi
exec node server.mjs
