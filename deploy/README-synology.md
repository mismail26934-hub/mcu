# Deploy ke Synology NAS

Panduan menjalankan aplikasi MCU PDF to Excel di Synology DSM 7+ dengan **Container Manager** (Docker).

## Persyaratan

| Item | Minimum |
|------|---------|
| DSM | 7.0+ |
| Package | **Container Manager** (Package Center) |
| RAM | 2 GB+ (app ~512 MB) |
| Arsitektur | x86_64 atau ARM64 (Plus series / DS923+ dll.) |

Tidak perlu: Web Station, PHP, MariaDB, Node.js package terpisah (Node.js sudah di dalam container).

## Struktur folder di NAS

Disarankan letakkan di shared folder, contoh:

```
/volume1/docker/mcu-app/
├── docker-compose.yml
├── Dockerfile
├── server.js
├── lib/
├── public/
├── package.json
├── PDF FIle/          ← upload PDF masuk sini
├── PDF-backup/        ← PDF sukses diproses
└── Excel File/
    └── NEW List Pengajuan Verifikasi MCU KPC.xlsx   ← WAJIB
```

---

## Metode A: Container Manager (GUI) — paling mudah

### 1. Install Container Manager

**Package Center** → cari **Container Manager** → Install.

### 2. Upload project ke NAS

**File Station** → buat folder `/docker/mcu-app` → upload seluruh isi project (tanpa `node_modules`).

Atau via SSH:

```bash
ssh admin@IP_NAS_ANDA
sudo mkdir -p /volume1/docker/mcu-app
cd /volume1/docker/mcu-app
# clone atau scp dari PC
git clone https://github.com/mismail26934-hub/mcu.git .
```

### 3. Upload file Excel template

Letakkan file template di:

```
/volume1/docker/mcu-app/Excel File/NEW List Pengajuan Verifikasi MCU KPC.xlsx
```

Via File Station atau SCP dari PC:

```bash
scp "Excel File/NEW List Pengajuan Verifikasi MCU KPC.xlsx" \
  admin@IP_NAS_ANDA:"/volume1/docker/mcu-app/Excel File/"
```

### 4. Build & jalankan via SSH

```bash
ssh admin@IP_NAS_ANDA
cd /volume1/docker/mcu-app
sudo docker compose up -d --build
```

Cek status:

```bash
sudo docker compose ps
sudo docker compose logs -f mcu-app
curl http://127.0.0.1:3000/api/status
```

Buka browser: **http://IP_NAS_ANDA:3000**

### 5. (Opsional) Reverse Proxy + HTTPS

Agar bisa diakses tanpa `:3000` dan dengan HTTPS:

1. **Control Panel** → **Login Portal** → **Advanced** → **Reverse Proxy**
2. **Create** → Reverse Proxy Rule:
   - **Source**: Protocol `HTTPS`, Hostname `mcu.nas-anda.synology.me`, Port `443`
   - **Destination**: Protocol `HTTP`, Hostname `localhost`, Port `3000`
3. **Control Panel** → **Security** → **Certificate** → tambah Let's Encrypt untuk hostname tersebut

Untuk upload PDF besar, di tab **Custom Header** reverse proxy, tambahkan jika perlu (biasanya default Synology sudah cukup).

---

## Metode B: Import di Container Manager (tanpa SSH)

Jika SSH tidak tersedia:

1. Upload project ke `/docker/mcu-app` via File Station
2. **Container Manager** → **Project** → **Create**
3. Pilih folder `/docker/mcu-app` (yang berisi `docker-compose.yml`)
4. Klik **Build** → **Start**
5. Buka **http://IP_NAS:3000**

---

## Metode C: Node.js langsung via SSH (tanpa Docker)

Hanya jika Docker tidak tersedia / model NAS lama.

### Install Node.js

```bash
# Opsi 1: nvm (disarankan)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Opsi 2: SynoCommunity Node.js SPK (Package Center → Settings → Package Sources)
```

### Jalankan app

```bash
cd /volume1/docker/mcu-app
npm install --omit=dev
mkdir -p "PDF FIle" "PDF-backup" "Excel File"
cp .env.example .env
npm start
```

Auto-restart dengan PM2:

```bash
npm install -g pm2
pm2 start server.js --name mcu-app
pm2 save
```

---

## Update aplikasi

```bash
cd /volume1/docker/mcu-app
git pull          # jika pakai git
sudo docker compose up -d --build
```

Data PDF dan Excel **tidak hilang** karena disimpan di volume folder lokal.

---

## Environment variables

Buat file `.env` di folder project (opsional, docker-compose sudah punya default):

```env
PORT=3000
MAX_UPLOAD_FILES=50
MAX_UPLOAD_MB=15
```

Untuk docker-compose, tambahkan di `environment:` section atau gunakan `env_file: .env`.

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Container tidak start | `sudo docker compose logs mcu-app` |
| Excel tidak ditemukan | Pastikan template ada di `Excel File/` |
| Upload PDF gagal | Naikkan `MAX_UPLOAD_MB` di docker-compose |
| Port 3000 sudah dipakai | Ubah mapping jadi `"8080:3000"` di docker-compose |
| Akses dari luar gagal | Buka port 3000 di **Control Panel → External Access → Router Configuration**, atau pakai Reverse Proxy |
| Permission denied folder | `sudo chown -R 1026:100 /volume1/docker/mcu-app` (sesuaikan UID/GID user NAS) |

---

## Backup rutin

Backup folder ini secara berkala:

- `Excel File/` — data utama
- `PDF-backup/` — arsip PDF terproses

Bisa dijadwalkan via **Hyper Backup** Synology.

---

## Keamanan

Aplikasi **belum punya login built-in**. Untuk produksi:

- Batasi akses ke jaringan lokal / VPN saja, atau
- Tambah autentikasi di Reverse Proxy Synology (Basic Auth), atau
- Jangan expose ke internet publik tanpa proteksi
