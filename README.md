# Ekstrak PDF MCU ke Excel

Aplikasi untuk mengekstrak data MCU (format Trakindo / Tirta Medical Centre) dari PDF ke sheet **CONTOH** pada file Excel.

Tersedia dalam beberapa mode:
- **Next.js app** — React 19 + Next.js 16 (`next-app/`)
- **Web app** — upload massal PDF, proses, preview, dan download Excel
- **CLI** — script command line untuk otomasi lokal

## Struktur project

```
D:\Help\
├── server.js                 # Web server (Express)
├── extract-mcu-to-excel.js   # CLI script
├── lib/
│   ├── extract.js            # Logic ekstraksi PDF → Excel
│   └── paths.js              # Path folder & konfigurasi
├── public/
│   ├── index.html            # UI web app
│   ├── app.js                # Frontend logic
│   └── styles.css            # Styles
├── next-app/                 # Next.js 16 + React 19 web app
│   ├── src/app/              # App Router pages & API routes
│   └── README.md
├── deploy/                   # Script & config deploy VPS
│   ├── setup-vps.sh
│   ├── update.sh
│   ├── nginx-mcu-app.conf
│   └── ecosystem.config.cjs
├── PDF FIle/                 # Input PDF (upload / manual)
├── PDF-backup/               # PDF sukses diproses
├── Excel File/               # File Excel output
│   └── NEW List Pengajuan Verifikasi MCU KPC.xlsx
└── package.json
```

## Tech stack

| Layer | Teknologi |
|-------|-----------|
| Runtime | Node.js 18+ |
| Web server | Express.js |
| Upload | Multer |
| PDF parsing | pdfjs-dist |
| Excel | xlsx (SheetJS) |
| Frontend | HTML, CSS, JavaScript (vanilla) |
| Next.js app | Next.js 16, React 19 (`next-app/`) |

## Cara pakai — Next.js app

```bash
cd next-app
npm install
npm run dev
```

Buka **http://localhost:3000** — fitur sama dengan web app Express. Detail: [`next-app/README.md`](next-app/README.md).

## Cara pakai — Web app

### 1. Install dependency

```bash
cd D:\Help
npm install
```

### 2. Pastikan file Excel ada

Letakkan file template di:

```
D:\Help\Excel File\NEW List Pengajuan Verifikasi MCU KPC.xlsx
```

### 3. Jalankan server

```bash
npm start
```

Buka browser: **http://localhost:3000**

### 4. Alur di web app

1. **Upload PDF** — pilih banyak file sekaligus (drag & drop atau browse)
2. **Proses MCU** — ekstrak data ke sheet CONTOH
3. **Preview** — lihat data Excel di browser
4. **Download Excel** — unduh file `.xlsx`

PDF yang sukses diproses otomatis dipindah ke `PDF-backup`.

## Cara pakai — CLI

1. Letakkan file PDF di folder `D:\Help\PDF FIle`
2. Pastikan file Excel ada di folder `D:\Help\Excel File`
3. **Tutup file Excel** jika sedang dibuka
4. Jalankan:

```bash
npm run extract
```

atau:

```bash
node extract-mcu-to-excel.js
```

## API endpoints (web app)

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/api/status` | Status PDF menunggu & file Excel |
| POST | `/api/upload` | Upload massal PDF (`pdfs` field) |
| POST | `/api/process` | Proses semua PDF → Excel |
| POST | `/api/excel/delete` | Hapus banyak baris Excel (`excelRows`: array nomor baris) |
| GET | `/api/excel/preview` | Preview data sheet CONTOH (JSON) |
| GET | `/api/excel/download` | Download file Excel |

## Field yang diekstrak

| Kolom Excel | Sumber di PDF |
|-------------|---------------|
| MCU Date | Tanggal Kunjungan (format dd-mmm-yy, contoh: 07-Jul-26) |
| Company | Nama file (`Trakindo Utama_...`) |
| E/N | Nomor Karyawan |
| Name | Nama Pasien |
| Gender | Jenis Kelamin (Pria → M) |
| Positions | Departemen / Bagian |
| DOB | Tanggal Lahir |
| MCU Provider | TIRTA MEDICAL CENTRE |
| Visus | Memakai Kacamata Sehari-hari |
| BP | Tekanan Darah Sistol/Diastol |
| Lipid | Cholesterol & Trigliserid |
| GDP | Estimated Average Glucose |
| BMI > 30 | Nilai BMI |
| LFT | SGPT & SGOT |
| Smoking | Merokok |

## Catatan operasional

- Jika Excel sedang dibuka, hasil disimpan ke `NEW List Pengajuan Verifikasi MCU KPC - updated.xlsx`
- Baris yang sudah ada (berdasarkan E/N) akan di-update; baris kosong berikutnya diisi untuk PDF baru
- Kolom **Verifc. date** diisi `diisi KPC` (manual oleh tim KPC)
- Preview web menampilkan **data tabel**; formatting/merge cell Excel asli mungkin berbeda
- **Tutup file Excel** sebelum hapus/proses — jika Excel dibuka, perubahan disimpan ke file `- updated.xlsx`
- Upload maks. 50 file, 15 MB per file (bisa diubah lewat env `MAX_UPLOAD_FILES`, `MAX_UPLOAD_MB`)

## Deploy ke Hostinger VPS

Paling cocok untuk app ini (upload PDF, simpan Excel, storage persisten).

### File deploy

```
deploy/
├── setup-vps.sh           # Setup awal VPS
├── update.sh              # Update app
├── nginx-mcu-app.conf     # Template Nginx
├── ecosystem.config.cjs   # Konfigurasi PM2
└── README.md              # Panduan lengkap
```

### Langkah cepat

**1. Login VPS**

```bash
ssh root@IP_VPS_ANDA
```

**2. Clone & setup otomatis**

```bash
apt install -y git
git clone https://github.com/mismail26934-hub/mcu.git /var/www/mcu-app
cd /var/www/mcu-app
chmod +x deploy/setup-vps.sh deploy/update.sh
DOMAIN=mcu.domain-anda.com bash deploy/setup-vps.sh
```

**3. Upload Excel template (dari PC)**

```bash
scp "Excel File/NEW List Pengajuan Verifikasi MCU KPC.xlsx" \
  root@IP_VPS_ANDA:"/var/www/mcu-app/Excel File/"
```

**4. Buka browser**

`http://IP_VPS_ANDA` atau domain Anda.

### Update setelah ada perubahan

```bash
cd /var/www/mcu-app
bash deploy/update.sh
```

### SSL (opsional)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d mcu.domain-anda.com
```

Detail lengkap: lihat [`deploy/README.md`](deploy/README.md).

## Deploy ke Synology NAS

Cocok untuk intranet kantor — PDF & Excel disimpan di shared folder NAS.

### File Docker

```
Dockerfile              # Image Node.js 20
docker-compose.yml      # Container + volume folder data
deploy/README-synology.md   # Panduan lengkap Synology
```

### Langkah cepat (Container Manager)

1. Install **Container Manager** di Package Center
2. Upload/clone project ke `/volume1/docker/mcu-app`
3. Upload Excel template ke `Excel File/`
4. SSH ke NAS:

```bash
cd /volume1/docker/mcu-app
sudo docker compose up -d --build
```

5. Buka **http://IP_NAS:3000**

Detail lengkap (Reverse Proxy, HTTPS, troubleshooting): [`deploy/README-synology.md`](deploy/README-synology.md).

## Deploy ke Shared Hosting (PHP / File Manager)

Untuk Hostinger Premium, Niagahoster, cPanel — **tanpa Node.js**.

### Folder deploy

```
VerifMCU/
├── index.php              # UI web app
├── api/                   # REST endpoints PHP
├── lib/                   # Logic ekstraksi
├── assets/                # CSS + JS frontend
├── composer.json          # PhpSpreadsheet + pdfparser
├── PDF FIle/              # Upload PDF
├── PDF-backup/            # Arsip PDF terproses
└── Excel File/            # Template & output Excel
```

### Langkah cepat

1. Di PC: `cd VerifMCU && composer install --no-dev`
2. Upload seluruh folder `VerifMCU/` (termasuk `vendor/`) ke `public_html` via File Manager
3. Upload Excel template ke `Excel File/`
4. Buka `https://domain-anda.com/`

Detail lengkap: [`VerifMCU/README.md`](VerifMCU/README.md).

---

### Paket Premium (shared hosting)

**Gunakan versi PHP** di folder [`VerifMCU/`](VerifMCU/) — upload via File Manager, tanpa Node.js.

| Opsi | Keterangan |
|------|------------|
| **Shared hosting + File Manager** | **Versi PHP** — lihat [`VerifMCU/README.md`](VerifMCU/README.md) |
| **Jalankan lokal / intranet** | `npm start` di PC/server kantor (Node.js) |
| **Upgrade ke Business/Cloud** | Node.js Web App via hPanel |
| **Hostinger VPS** | Panduan deploy VPS — [`deploy/README.md`](deploy/README.md) |

### Checklist sebelum go-live

- [ ] File Excel template sudah di `Excel File/` di VPS
- [ ] `pm2 status` → app **online**
- [ ] Test upload PDF → proses → download Excel
- [ ] Backup rutin folder `Excel File` dan `PDF-backup`
- [ ] Tambah login/password jika diakses publik (belum built-in)

## Environment variables

| Variable | Default | Keterangan |
|----------|---------|------------|
| `PORT` | `3000` | Port web server |
| `MAX_UPLOAD_FILES` | `50` | Maks. file per upload |
| `MAX_UPLOAD_MB` | `15` | Maks. ukuran per PDF (MB) |
