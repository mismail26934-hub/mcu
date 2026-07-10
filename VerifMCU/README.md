# Deploy ke Shared Hosting (File Manager)

Versi **PHP** aplikasi MCU PDF to Excel — untuk Hostinger Premium, Niagahoster, cPanel, dan hosting PHP lainnya.

## Persyaratan hosting

| Item | Minimum |
|------|---------|
| PHP | **8.1+** |
| Ekstensi | `zip`, `xml`, `gd` atau `mbstring`, `fileinfo` |
| Upload limit | 15 MB+ per file (disarankan 100 MB) |
| Composer | Di PC lokal (vendor di-upload ke hosting) |

Tidak perlu: Node.js, SSH (opsional), database.

---

## Struktur folder `VerifMCU/`

Upload seluruh isi folder `VerifMCU/` ke `public_html/` (atau subfolder, mis. `public_html/mcu/`):

```
public_html/
├── index.php
├── .htaccess
├── composer.json
├── config.php
├── assets/
│   ├── app.js
│   └── styles.css
├── api/
│   ├── status.php
│   ├── upload.php
│   ├── process.php
│   ├── preview.php
│   ├── download.php
│   └── delete.php
├── lib/
├── vendor/              ← hasil composer install
├── PDF FIle/
├── PDF-backup/
└── Excel File/
    └── NEW List Pengajuan Verifikasi MCU KPC.xlsx
```

---

## Langkah deploy

### 1. Install dependency di PC lokal

```bash
cd VerifMCU
composer install --no-dev
```

Ini membuat folder `vendor/` (~15 MB). **Wajib** di-upload ke hosting bersama file lainnya.

> Jika belum punya Composer: https://getcomposer.org/download/

### 2. Upload via File Manager

**Hostinger hPanel** → **Files** → **File Manager** → `public_html`

1. Upload **zip** seluruh folder `VerifMCU/` (termasuk `vendor/`)
2. Extract di `public_html`
3. Atau upload ke subfolder `public_html/mcu/` jika ingin URL `domain.com/mcu/`

### 3. Upload file Excel template

Letakkan di:

```
public_html/Excel File/NEW List Pengajuan Verifikasi MCU KPC.xlsx
```

Via File Manager: buat folder `Excel File`, upload file `.xlsx`.

### 4. Set permission folder (jika perlu)

Folder berikut harus **writable** (755 atau 775):

- `PDF FIle/`
- `PDF-backup/`
- `Excel File/`

Di File Manager: klik kanan folder → **Permissions** → centang Write untuk Owner/Group.

### 5. Buka browser

- Root: `https://domain-anda.com/`
- Subfolder: `https://domain-anda.com/mcu/`

---

## Naikkan limit upload PDF

Jika upload gagal untuk file besar, ubah di **hPanel** → **Advanced** → **PHP Configuration**:

| Setting | Nilai disarankan |
|---------|------------------|
| `upload_max_filesize` | 100M |
| `post_max_size` | 100M |
| `max_execution_time` | 300 |
| `memory_limit` | 256M |

File `.htaccess` sudah mencoba set nilai ini; tidak semua hosting mengizinkan override via `.htaccess`.

---

## Deploy ke subfolder

Jika app ada di `public_html/mcu/` (bukan root), **tidak perlu ubah kode** — path relatif `api/status.php` sudah benar.

---

## Update aplikasi

1. Backup folder `Excel File/` dan `PDF-backup/`
2. Upload file PHP/JS/CSS yang berubah via File Manager
3. Jika `composer.json` berubah, jalankan `composer install` di lokal dan upload ulang `vendor/`

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `Dependency belum terinstall` | Upload folder `vendor/` hasil `composer install` |
| Excel tidak ditemukan | Upload template ke `Excel File/` |
| Upload PDF gagal | Naikkan `upload_max_filesize` & `post_max_size` di PHP config |
| Permission denied | Set folder `PDF FIle`, `PDF-backup`, `Excel File` writable (755/775) |
| Sheet CONTOH tidak ditemukan | Pastikan template Excel benar |
| 500 Internal Server Error | Cek error log hosting; pastikan PHP 8.1+ |
| PDF tidak ter-parse | Beberapa PDF scan/image-only tidak punya teks — sama seperti versi Node.js |

---

## Keamanan

- Folder `lib/` dan `vendor/` diblokir via `.htaccess`
- App **belum punya login** — batasi akses via password directory hosting, atau hanya jaringan kantor/VPN
- Jangan expose folder `Excel File/` dan `PDF-backup/` ke publik (tetap di dalam app path, download hanya via `api/download.php`)

---

## Perbedaan vs versi Node.js

| Fitur | Node.js | PHP |
|-------|---------|-----|
| Hosting shared / File Manager | ❌ | ✅ |
| Excel formatting preserved | Partial (recreate sheet) | ✅ (PhpSpreadsheet edit in-place) |
| CLI `npm run extract` | ✅ | ❌ (hanya web app) |
| VPS / NAS Docker | ✅ | ✅ (dengan PHP-FPM) |

Versi Node.js (`server.js`) tetap tersedia untuk VPS, NAS, dan penggunaan lokal.
