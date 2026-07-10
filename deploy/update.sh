#!/usr/bin/env bash
set -euo pipefail

# Update app setelah ada perubahan kode
# Usage (di VPS):
#   bash deploy/update.sh

APP_DIR="${APP_DIR:-/var/www/mcu-app}"

cd "${APP_DIR}"

echo "==> Pull kode terbaru..."
git pull

echo "==> Install dependency..."
npm install --omit=dev

echo "==> Restart app..."
pm2 restart mcu-app

echo "==> Status:"
pm2 status mcu-app
