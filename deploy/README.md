# Deploy ke VPS Hostinger

File bantu deploy aplikasi MCU PDF to Excel.

## File

| File | Fungsi |
|------|--------|
| `setup-vps.sh` | Setup awal VPS (Node, PM2, Nginx, clone, start app) |
| `update.sh` | Update kode + restart setelah `git pull` |
| `nginx-mcu-app.conf` | Template Nginx reverse proxy |
| `ecosystem.config.cjs` | Konfigurasi PM2 |

## Quick start (VPS Ubuntu baru)

### 1. Login SSH

```bash
ssh root@IP_VPS_ANDA
```

### 2. Clone & setup

```bash
apt install -y git
git clone https://github.com/mismail26934-hub/mcu.git /var/www/mcu-app
cd /var/www/mcu-app
chmod +x deploy/setup-vps.sh deploy/update.sh
DOMAIN=mcu.domain-anda.com bash deploy/setup-vps.sh
```

Ganti `mcu.domain-anda.com` dengan domain Anda, atau IP VPS.

### 3. Upload file Excel template

Dari PC lokal:

```bash
scp "Excel File/NEW List Pengajuan Verifikasi MCU KPC.xlsx" \
  root@IP_VPS_ANDA:"/var/www/mcu-app/Excel File/"
```

### 4. Cek app

```bash
pm2 status
pm2 logs mcu-app
curl http://127.0.0.1:3000/api/status
```

Buka browser: `http://IP_VPS_ANDA` atau domain Anda.

## Update setelah ada perubahan kode

```bash
cd /var/www/mcu-app
bash deploy/update.sh
```

## SSL HTTPS

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d mcu.domain-anda.com
```

## Upload via SFTP (alternatif Git)

1. Connect FileZilla/WinSCP ke VPS (port 22)
2. Upload project ke `/var/www/mcu-app` (tanpa `node_modules`)
3. Di VPS:

```bash
cd /var/www/mcu-app
npm install --omit=dev
mkdir -p "PDF FIle" "PDF-backup" "Excel File"
pm2 start deploy/ecosystem.config.cjs
bash deploy/setup-vps.sh   # hanya bagian nginx jika sudah pernah setup
```

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Upload PDF gagal | Pastikan `client_max_body_size 100M` di Nginx |
| App mati | `pm2 restart mcu-app` |
| Excel tidak ditemukan | Upload template ke `Excel File/` |
| 502 Bad Gateway | Cek `pm2 logs mcu-app`, pastikan port 3000 jalan |
