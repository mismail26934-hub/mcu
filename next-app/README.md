# MCU PDF to Excel — Next.js 16

Aplikasi web untuk mengekstrak data MCU (format Trakindo / Tirta Medical Centre) dari PDF ke sheet **CONTOH** pada file Excel.

## Tech stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16.3 |
| UI | React 19 |
| Backend | App Router Route Handlers |
| PDF parsing | pdfjs-dist |
| Excel | xlsx (SheetJS) |

## Struktur

```
next-app/
├── src/
│   ├── app/                  # Pages & API routes
│   ├── components/           # React UI
│   └── lib/
│       ├── extract.js        # Logic ekstraksi
│       └── paths.js          # Path folder data
├── Excel File/               # Template & output Excel
├── PDF FIle/                 # Upload PDF
└── PDF-backup/               # Arsip PDF terproses
```

## Prerequisites

- Node.js 18+
- File Excel template di `Excel File/NEW List Pengajuan Verifikasi MCU KPC.xlsx`

## Cara jalankan

```bash
npm install
npm run dev
```

Buka **http://localhost:3000**

## Alur aplikasi

1. **Upload PDF** — pilih banyak file sekaligus (drag & drop atau browse)
2. **Proses MCU** — ekstrak data ke sheet CONTOH
3. **Preview** — lihat data Excel di browser
4. **Download Excel** — unduh file `.xlsx`

PDF yang sukses diproses otomatis dipindah ke `PDF-backup`.

## API endpoints

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/api/status` | Status PDF menunggu & file Excel |
| POST | `/api/upload` | Upload massal PDF (`pdfs` field) |
| POST | `/api/process` | Proses semua PDF → Excel |
| POST | `/api/excel/delete` | Hapus baris Excel terpilih |
| GET | `/api/excel/preview` | Preview data sheet CONTOH |
| GET | `/api/excel/download` | Download file Excel |

## Environment variables

| Variable | Default | Keterangan |
|----------|---------|------------|
| `PORT` | `3000` | Port dev server |
| `MAX_UPLOAD_FILES` | `50` | Maks. file per upload |
| `MAX_UPLOAD_MB` | `15` | Maks. ukuran per PDF (MB) |

## Production

```bash
npm run build
npm start
```

## Catatan

- **Tutup file Excel** sebelum proses/hapus — jika Excel dibuka, hasil disimpan ke `- updated.xlsx`
- Kolom **Verifc. date** diisi `diisi KPC` (manual oleh tim KPC)
