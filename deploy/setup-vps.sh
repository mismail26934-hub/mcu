#!/usr/bin/env bash
set -euo pipefail

# Setup MCU app di VPS Hostinger (Ubuntu 22.04+)
# Usage (di VPS, sebagai root):
#   curl -fsSL .../setup-vps.sh | bash
#   atau:
#   bash deploy/setup-vps.sh
#
# Env opsional:
#   APP_DIR=/var/www/mcu-app
#   DOMAIN=mcu.domain-anda.com
#   GIT_REPO=https://github.com/mismail26934-hub/mcu.git

APP_DIR="${APP_DIR:-/var/www/mcu-app}"
DOMAIN="${DOMAIN:-_}"
GIT_REPO="${GIT_REPO:-https://github.com/mismail26934-hub/mcu.git}"
NODE_MAJOR="${NODE_MAJOR:-20}"

echo "==> Update sistem..."
apt update
apt upgrade -y

if ! command -v node >/dev/null 2>&1; then
  echo "==> Install Node.js ${NODE_MAJOR}.x..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt install -y nodejs
fi

echo "Node: $(node -v)"
echo "NPM : $(npm -v)"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Install PM2..."
  npm install -g pm2
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "==> Install Nginx..."
  apt install -y nginx
fi

echo "==> Siapkan folder app: ${APP_DIR}"
mkdir -p "${APP_DIR}"

if [ ! -d "${APP_DIR}/.git" ]; then
  echo "==> Clone repository..."
  git clone "${GIT_REPO}" "${APP_DIR}"
else
  echo "==> Repository sudah ada, pull terbaru..."
  git -C "${APP_DIR}" pull
fi

cd "${APP_DIR}"

echo "==> Install dependency..."
npm install --omit=dev

echo "==> Buat folder data..."
mkdir -p "PDF FIle" "PDF-backup" "Excel File"

if [ ! -f "Excel File/NEW List Pengajuan Verifikasi MCU KPC.xlsx" ]; then
  echo ""
  echo "PERINGATAN: File Excel template belum ada."
  echo "Upload manual ke:"
  echo "  ${APP_DIR}/Excel File/NEW List Pengajuan Verifikasi MCU KPC.xlsx"
  echo ""
fi

if [ -f ".env.example" ] && [ ! -f ".env" ]; then
  cp .env.example .env
fi

echo "==> Start/restart PM2..."
pm2 startOrRestart deploy/ecosystem.config.cjs
pm2 save

if ! pm2 startup systemd -u root --hp /root 2>/dev/null | grep -q "already"; then
  pm2 startup systemd -u root --hp /root | tail -n 1 | bash || true
fi

echo "==> Setup Nginx..."
NGINX_SITE="/etc/nginx/sites-available/mcu-app"
sed "s/domain-anda.com/${DOMAIN}/" deploy/nginx-mcu-app.conf > "${NGINX_SITE}"
ln -sf "${NGINX_SITE}" /etc/nginx/sites-enabled/mcu-app
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

if command -v ufw >/dev/null 2>&1; then
  echo "==> Setup firewall..."
  ufw allow OpenSSH || true
  ufw allow "Nginx Full" || true
  ufw --force enable || true
fi

echo ""
echo "Selesai."
echo "App PM2 : pm2 status"
echo "Logs    : pm2 logs mcu-app"
echo "URL     : http://${DOMAIN} (jika DOMAIN sudah di-set)"
echo ""
echo "SSL (opsional):"
echo "  apt install -y certbot python3-certbot-nginx"
echo "  certbot --nginx -d ${DOMAIN}"
