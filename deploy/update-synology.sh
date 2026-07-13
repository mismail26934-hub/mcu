#!/usr/bin/env bash
set -euo pipefail

# Update MCU app di Synology NAS (Docker)
# Usage (SSH ke NAS):
#   cd /volume1/docker/mcu-app
#   bash deploy/update-synology.sh

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${APP_DIR}"

echo "==> Pull kode terbaru (jika pakai git)..."
if [ -d ".git" ]; then
  git pull
fi

echo "==> Rebuild & restart container..."
if command -v docker >/dev/null 2>&1; then
  docker compose up -d --build
elif command -v /usr/local/bin/docker >/dev/null 2>&1; then
  /usr/local/bin/docker compose up -d --build
else
  echo "Docker tidak ditemukan. Install Container Manager di Package Center."
  exit 1
fi

echo ""
echo "Selesai."
echo "Status : docker compose ps"
echo "Logs   : docker compose logs -f mcu-app"
echo "URL    : http://$(hostname -I | awk '{print $1}'):3000"
