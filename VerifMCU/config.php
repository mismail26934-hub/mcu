<?php

declare(strict_types=1);

define('APP_ROOT', __DIR__);
define('PDF_DIR', APP_ROOT . '/PDF FIle');
define('BACKUP_DIR', APP_ROOT . '/PDF-backup');
define('EXCEL_DIR', APP_ROOT . '/Excel File');
define('EXCEL_FILE', EXCEL_DIR . '/NEW List Pengajuan Verifikasi MCU KPC.xlsx');
define('EXCEL_FALLBACK_NAME', 'NEW List Pengajuan Verifikasi MCU KPC - updated.xlsx');

define('TARGET_SHEET', 'CONTOH');
define('HEADER_ROW', 7);
define('DATA_START_ROW', HEADER_ROW + 1);
define('MCU_PROVIDER', 'TIRTA MEDICAL CENTRE');
define('VERIF_DATE_PLACEHOLDER', 'diisi KPC');

define('MAX_UPLOAD_FILES', (int) (getenv('MAX_UPLOAD_FILES') ?: 50));
define('MAX_UPLOAD_MB', (int) (getenv('MAX_UPLOAD_MB') ?: 15));

define('COLUMN_HEADERS', [
    'No',
    'Verifc. date',
    'MCU Date',
    'Company',
    'E/N',
    'Name',
    'Gender',
    'Positions',
    'DOB',
    'MCU Provider',
    'Visus',
    'BP',
    'Lipid',
    'GDP',
    'BMI > 30',
    'Underweight',
    'LFT',
    'Smoking',
]);
