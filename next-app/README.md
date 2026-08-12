# MCU PDF to Excel — Next.js 16

Versi web app menggunakan **Next.js 16** (App Router + React 19). Logic ekstraksi PDF → Excel di-reuse dari `../lib/extract.js` di repo root.

## Tech stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16.3 |
| UI | React 19 |
| Backend | Route Handlers (`app/api/*`) |
| PDF / Excel | pdfjs-dist, xlsx (shared logic) |

## Prerequisites

- Node.js 18+
- File Excel template di folder root: `Excel File/NEW List Pengajuan Verifikasi MCU KPC.xlsx`

## Cara jalankan

```bash
cd next-app
npm install
npm run dev
```

Buka **http://localhost:3000**

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
| `PORT` | `3000` | Port dev server (Next.js) |
| `MAX_UPLOAD_FILES` | `50` | Maks. file per upload |
| `MAX_UPLOAD_MB` | `15` | Maks. ukuran per PDF (MB) |

## Production build

```bash
npm run build
npm start
```

## Catatan

- Folder data (`PDF FIle`, `PDF-backup`, `Excel File`) berada di **root repo**, bukan di dalam `next-app/`.
- Versi Express vanilla ada di root (`npm start`). Versi PHP ada di `VerifMCU/`.
