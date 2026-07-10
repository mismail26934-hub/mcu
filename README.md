# Ekstrak PDF MCU ke Excel

Aplikasi untuk mengekstrak data MCU (format Trakindo / Tirta Medical Centre) dari PDF ke sheet **CONTOH** pada file Excel.

Tersedia dalam dua mode:
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
- Upload maks. 50 file, 15 MB per file (bisa diubah lewat env `MAX_UPLOAD_FILES`, `MAX_UPLOAD_MB`)

## Deploy ke Hostinger

### Paket Premium (saat ini)

**Hostinger Premium tidak mendukung Node.js Web App.** Paket ini untuk PHP/WordPress/static site.

Opsi untuk menjalankan aplikasi ini:

| Opsi | Keterangan |
|------|------------|
| **Jalankan lokal / intranet** | `npm start` di PC/server kantor — **paling mudah dengan Premium** |
| **Upgrade ke Business/Cloud** | Mendukung Node.js Web App via hPanel (GitHub/ZIP upload) |
| **Hostinger VPS** | Full control, storage persisten — **paling cocok** untuk upload PDF & Excel |

### Deploy ke Business/Cloud atau VPS

1. Upload project (GitHub connect atau ZIP) di hPanel → **Add Website → Node.js Web App**
2. Set entry file: `server.js`
3. Set Node.js: **20.x**
4. Set start command: `npm start`
5. Pastikan folder `PDF FIle`, `Excel File`, `PDF-backup` writable
6. Upload file Excel template ke `Excel File/`

**Environment variables (opsional):**

```
PORT=3000
MAX_UPLOAD_FILES=50
MAX_UPLOAD_MB=15
```

### Checklist sebelum go-live

- [ ] Login/password untuk akses (belum built-in — tambahkan jika deploy publik)
- [ ] File Excel template sudah di server
- [ ] Backup rutin folder `Excel File` dan `PDF-backup`
- [ ] Tutup Excel desktop saat proses berjalan (hindari file lock)

## Environment variables

| Variable | Default | Keterangan |
|----------|---------|------------|
| `PORT` | `3000` | Port web server |
| `MAX_UPLOAD_FILES` | `50` | Maks. file per upload |
| `MAX_UPLOAD_MB` | `15` | Maks. ukuran per PDF (MB) |
