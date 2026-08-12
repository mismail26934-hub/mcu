# MCU PDF to Excel

Ekstrak data MCU (format Trakindo / Tirta Medical Centre) dari PDF ke sheet **CONTOH** pada file Excel.

Aplikasi web berbasis **Next.js 16** + React 19.

## Quick start

```bash
cd next-app
npm install
npm run dev
```

Buka **http://localhost:3000**

## Struktur repo

```
├── next-app/                 # Aplikasi Next.js (semua kode & data)
│   ├── src/app/              # UI + API routes
│   ├── src/lib/              # Logic ekstraksi PDF → Excel
│   ├── Excel File/           # Template & output Excel
│   ├── PDF FIle/             # Upload PDF
│   └── PDF-backup/           # Arsip PDF terproses
└── README.md
```

Dokumentasi lengkap: [`next-app/README.md`](next-app/README.md)

## Branch

Versi Next.js murni ada di branch **`feat/nextjs`**.

Branch lain (`main`, `feat/web`, `feat/file-manager`) masih berisi versi Express, PHP, dan CLI.
