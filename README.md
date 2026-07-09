# Ekstrak PDF MCU ke Excel

Script ini membaca file PDF hasil MCU (format Trakindo / Tirta Medical Centre) dari folder `D:\Help\PDF FIle`, lalu mengisi field ke sheet **CONTOH** pada file Excel di `D:\Help\Excel File`.

## Cara pakai

1. Letakkan file PDF di folder `D:\Help\PDF FIle`
2. Pastikan file Excel ada di folder `D:\Help\Excel File`
3. **Tutup file Excel** `NEW List Pengajuan Verifikasi MCU KPC.xlsx` (jika sedang dibuka)
4. Jalankan:

```bash
cd D:\Help
npm run extract
```

atau:

```bash
node extract-mcu-to-excel.js
```

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

## Catatan

- Jika Excel sedang dibuka, hasil disimpan ke `D:\Help\Excel File\NEW List Pengajuan Verifikasi MCU KPC - updated.xlsx`
- Baris yang sudah ada (berdasarkan E/N) akan di-update, baris kosong berikutnya akan diisi untuk PDF baru
- Kolom **Verifc. date** diisi `diisi KPC` (manual oleh tim KPC)
- Setelah Excel berhasil disimpan, PDF yang sukses diproses dipindahkan ke `D:\Help\PDF-backup`
