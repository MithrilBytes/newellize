#!/usr/bin/env bash
# Regenerate assets/gaben.js (the embedded target portrait) from any image.
# Usage: ./tools/embed.sh path/to/portrait.jpg
set -euo pipefail
img="${1:?usage: embed.sh <image.jpg|png>}"
case "$img" in
  *.png|*.PNG) mime="image/png" ;;
  *) mime="image/jpeg" ;;
esac
out="$(cd "$(dirname "$0")/.." && pwd)/assets/gaben.js"
printf 'window.GABEN_DATA_URI = "data:%s;base64,%s";\n' \
  "$mime" "$(base64 -i "$img" | tr -d '\n')" > "$out"
echo "wrote $out ($(wc -c < "$out" | tr -d ' ') bytes)"
