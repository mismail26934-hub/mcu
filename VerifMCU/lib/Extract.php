<?php

declare(strict_types=1);

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Smalot\PdfParser\Parser as PdfParser;

final class Extract
{
    private const MONTHS = [
        'januari' => 1,
        'februari' => 2,
        'maret' => 3,
        'april' => 4,
        'mei' => 5,
        'juni' => 6,
        'juli' => 7,
        'agustus' => 8,
        'september' => 9,
        'oktober' => 10,
        'november' => 11,
        'desember' => 12,
    ];

    private const MONTH_ABBR = [
        1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr',
        5 => 'May', 6 => 'Jun', 7 => 'Jul', 8 => 'Aug',
        9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Dec',
    ];

    private const COL = [
        'no' => 1,
        'verifDate' => 2,
        'mcuDate' => 3,
        'company' => 4,
        'employeeNumber' => 5,
        'name' => 6,
        'gender' => 7,
        'position' => 8,
        'dob' => 9,
        'mcuProvider' => 10,
        'visus' => 11,
        'bp' => 12,
        'lipid' => 13,
        'gdp' => 14,
        'bmi' => 15,
        'underweight' => 16,
        'lft' => 17,
        'smoking' => 18,
    ];

    public static function getStatus(): array
    {
        Paths::ensureDirs();
        $pdfs = Paths::listPdfFiles();
        $excelPath = Paths::resolveExcelOutputPath();
        $excelExists = is_file($excelPath);

        return [
            'pendingPdfCount' => count($pdfs),
            'pendingPdfs' => $pdfs,
            'excelExists' => $excelExists,
            'excelFile' => $excelExists ? basename($excelPath) : null,
            'excelPath' => $excelExists ? $excelPath : null,
            'backupDir' => BACKUP_DIR,
            'pdfDir' => PDF_DIR,
        ];
    }

    public static function extractPdfText(string $filePath): string
    {
        $parser = new PdfParser();
        $pdf = $parser->parseFile($filePath);
        return $pdf->getText();
    }

    public static function extractFields(string $text, string $fileName): array
    {
        $fromFile = self::parseFilename($fileName);

        $mcuDateMatch = self::firstMatch($text, [
            '/Tanggal Kunjungan \/ Lokasi\s*:\s*([^\/]+?)\s*\/\s*Site/i',
            '/Tanggal Kunjungan\s*:\s*([^\/]+?)\s+\s*Tanggal Lahir/i',
        ]);

        $employeeMatch = self::firstMatch($text, ['/Nomor Karyawan\s*:\s*(\S+)/i']);
        $nameMatch = self::firstMatch($text, ['/Nama Pasien\s*:\s*(.+?)\s+Jenis Kelamin/i']);
        $genderDobMatch = self::firstMatch($text, [
            '/Jenis Kelamin \/ Tanggal Lahir\s*:\s*(\w+)\s*\/\s*(\d+\s+\w+\s+\d{4})/i',
        ]);
        $departmentMatch = self::firstMatch($text, [
            '/Departemen \/ Bagian\s*:\s*(.+?)\s+Tanggal Kunjungan/i',
        ]);
        $glassesMatch = self::firstMatch($text, ['/Memakai Kacamata Sehari-hari\s+(\w+)/i']);
        $bpMatch = self::firstMatch($text, ['/Sistol\s+(\d+)\s*mmHg\s+Diastol\s+(\d+)\s*mmHg/i']);
        $cholesterolMatch = self::firstMatch($text, ['/Cholesterol\s+(\d+)\s*mg\/dL/i']);
        $triglycerideMatch = self::firstMatch($text, ['/Trigliserid\s+(\d+)\s*mg\/dL/i']);
        $glucoseMatch = self::firstMatch($text, ['/Estimated Average Glucose \(eAG\)\s+(\d+(?:[.,]\d+)?)/i']);
        $bmiMatch = self::firstMatch($text, ['/BMI\s+(\d+(?:[.,]\d+)?)/i']);
        $sgptMatch = self::firstMatch($text, ['/SGPT\s+(\d+)\s*U\/L/i']);
        $sgotMatch = self::firstMatch($text, ['/SGOT\s+(\d+)\s*U\/L/i']);
        $smokingMatch = self::firstMatch($text, ['/Merokok\s+(.+?)\s+Alkohol/i']);

        $mcuDate = $mcuDateMatch ? self::parseIndonesianDate($mcuDateMatch[1]) : null;
        $dob = $genderDobMatch ? self::parseIndonesianDate($genderDobMatch[2]) : null;
        $bmiValue = $bmiMatch ? (float) str_replace(',', '.', $bmiMatch[1]) : null;

        $employeeNumber = self::normalizeEmployeeNumber(
            $employeeMatch[1] ?? '',
            $fromFile['employeeNumber']
        );

        return [
            'mcuDate' => self::formatDateDDMmmYY($mcuDate),
            'company' => $fromFile['company'] ?: 'Trakindo',
            'employeeNumber' => $employeeNumber,
            'name' => trim($nameMatch[1] ?? $fromFile['name'] ?? ''),
            'gender' => self::mapGender($genderDobMatch[1] ?? ''),
            'position' => self::extractPosition($departmentMatch[1] ?? ''),
            'dob' => self::formatDateDDMmmYY($dob),
            'mcuProvider' => MCU_PROVIDER,
            'visus' => self::mapYesNo($glassesMatch[1] ?? ''),
            'bp' => $bpMatch ? "BP: {$bpMatch[1]}/{$bpMatch[2]}" : '',
            'lipid' => ($cholesterolMatch && $triglycerideMatch)
                ? "TC: {$cholesterolMatch[1]} TG: {$triglycerideMatch[1]}"
                : '',
            'gdp' => $glucoseMatch ? 'GF: ' . str_replace(',', '.', $glucoseMatch[1]) : '',
            'bmi' => $bmiValue !== null ? "BMI: {$bmiValue}" : '',
            'underweight' => ($bmiValue !== null && $bmiValue < 18) ? "BMI: {$bmiValue}" : '',
            'lft' => ($sgptMatch && $sgotMatch)
                ? "SGPT: {$sgptMatch[1]} SGOT: {$sgotMatch[1]}"
                : '',
            'smoking' => self::mapSmoking($smokingMatch[1] ?? ''),
        ];
    }

    public static function processAllPdfs(bool $moveToBackup = true): array
    {
        Paths::ensureDirs();

        if (!is_file(EXCEL_FILE)) {
            throw new RuntimeException('File Excel tidak ditemukan: ' . EXCEL_FILE);
        }

        $pdfFiles = Paths::listPdfFiles();
        if ($pdfFiles === []) {
            throw new RuntimeException('Tidak ada file PDF di folder PDF FIle.');
        }

        $excelPath = Paths::resolveExcelOutputPath();
        $spreadsheet = self::loadSpreadsheet($excelPath);
        $sheet = self::getTargetSheet($spreadsheet);

        $results = [];
        $processedPdfs = [];

        foreach ($pdfFiles as $pdfFile) {
            $pdfPath = PDF_DIR . '/' . $pdfFile;
            try {
                $text = self::extractPdfText($pdfPath);
                $extracted = self::extractFields($text, $pdfFile);
                $targetRow = self::findTargetRow($sheet, $extracted['employeeNumber']);
                $existing = self::readRecord($sheet, $targetRow);

                $updated = array_merge($existing, $extracted, [
                    'no' => $existing['no'] ?: ($targetRow - HEADER_ROW),
                    'verifDate' => $existing['verifDate'] ?: VERIF_DATE_PLACEHOLDER,
                ]);

                self::writeRecord($sheet, $targetRow, $updated);
                $processedPdfs[] = $pdfFile;

                $results[] = [
                    'file' => $pdfFile,
                    'status' => 'ok',
                    'employeeNumber' => $updated['employeeNumber'],
                    'name' => $updated['name'],
                    'excelRow' => $targetRow,
                    'bp' => $updated['bp'],
                    'lipid' => $updated['lipid'],
                    'gdp' => $updated['gdp'],
                ];
            } catch (Throwable $error) {
                $results[] = [
                    'file' => $pdfFile,
                    'status' => 'skip',
                    'error' => $error->getMessage(),
                ];
            }
        }

        if ($processedPdfs === []) {
            throw new RuntimeException('Tidak ada PDF yang berhasil diproses.');
        }

        $writeResult = self::saveSpreadsheet($spreadsheet, $excelPath);
        $moved = $moveToBackup ? self::moveProcessedPdfs($processedPdfs) : [];

        return [
            'results' => $results,
            'processedCount' => count($processedPdfs),
            'skippedCount' => count(array_filter($results, static fn(array $item): bool => $item['status'] === 'skip')),
            'outputFile' => $writeResult['outputFile'],
            'outputFileName' => basename($writeResult['outputFile']),
            'isFallbackCopy' => $writeResult['isFallbackCopy'],
            'moved' => $moved,
        ];
    }

    public static function deleteExcelRows(array $excelRows): array
    {
        Paths::ensureDirs();
        $excelPath = Paths::resolveExcelOutputPath();
        $uniqueRows = array_values(array_unique(array_map('intval', $excelRows)));
        $uniqueRows = array_values(array_filter($uniqueRows, static fn(int $row): bool => $row > HEADER_ROW));

        if ($uniqueRows === []) {
            throw new RuntimeException('Tidak ada baris valid untuk dihapus.');
        }

        $spreadsheet = self::loadSpreadsheet($excelPath);
        $sheet = self::getTargetSheet($spreadsheet);
        $deleted = [];

        foreach ($uniqueRows as $excelRow) {
            $record = self::readRecord($sheet, $excelRow);
            if ($record['employeeNumber'] === '' && $record['name'] === '') {
                continue;
            }

            self::clearRecord($sheet, $excelRow);
            $deleted[] = [
                'excelRow' => $excelRow,
                'employeeNumber' => $record['employeeNumber'],
                'name' => $record['name'],
            ];
        }

        if ($deleted === []) {
            throw new RuntimeException('Baris yang dipilih tidak berisi data.');
        }

        $writeResult = self::saveSpreadsheet($spreadsheet, $excelPath);

        return [
            'deletedCount' => count($deleted),
            'deleted' => $deleted,
            'outputFile' => $writeResult['outputFile'],
            'outputFileName' => basename($writeResult['outputFile']),
            'isFallbackCopy' => $writeResult['isFallbackCopy'],
            'preview' => self::getExcelPreview($writeResult['outputFile']),
        ];
    }

    public static function getExcelPreview(?string $excelPath = null): array
    {
        $resolvedPath = $excelPath ?? Paths::resolveExcelOutputPath();
        $spreadsheet = self::loadSpreadsheet($resolvedPath);
        $sheet = self::getTargetSheet($spreadsheet);

        $dataRows = [];
        $highestRow = max($sheet->getHighestRow(), DATA_START_ROW);

        for ($row = DATA_START_ROW; $row <= $highestRow; $row++) {
            $record = self::readRecord($sheet, $row);
            if ($record['employeeNumber'] === '' && $record['name'] === '') {
                continue;
            }

            $dataRows[] = array_merge(['excelRow' => $row], $record);
        }

        return [
            'sheet' => TARGET_SHEET,
            'headers' => COLUMN_HEADERS,
            'rows' => $dataRows,
            'excelFile' => basename($resolvedPath),
            'excelPath' => $resolvedPath,
            'totalRows' => count($dataRows),
        ];
    }

    private static function loadSpreadsheet(string $excelPath): Spreadsheet
    {
        if (!is_file($excelPath)) {
            throw new RuntimeException("File Excel tidak ditemukan: {$excelPath}");
        }

        return IOFactory::load($excelPath);
    }

    private static function getTargetSheet(Spreadsheet $spreadsheet): Worksheet
    {
        $sheet = $spreadsheet->getSheetByName(TARGET_SHEET);
        if ($sheet === null) {
            throw new RuntimeException('Sheet "' . TARGET_SHEET . '" tidak ditemukan di Excel.');
        }

        return $sheet;
    }

    private static function saveSpreadsheet(Spreadsheet $spreadsheet, string $sourcePath): array
    {
        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');

        try {
            $writer->save($sourcePath);
            if ($sourcePath === EXCEL_FILE) {
                Paths::removeStaleFallbackCopy();
            }

            return ['outputFile' => $sourcePath, 'isFallbackCopy' => false];
        } catch (Throwable) {
            $outputFile = Paths::getFallbackExcelPath();
            $writer->save($outputFile);

            return ['outputFile' => $outputFile, 'isFallbackCopy' => true];
        }
    }

    private static function findTargetRow(Worksheet $sheet, string $employeeNumber): int
    {
        $highestRow = max($sheet->getHighestRow(), DATA_START_ROW);

        for ($row = DATA_START_ROW; $row <= $highestRow; $row++) {
            $value = trim((string) $sheet->getCell([self::COL['employeeNumber'], $row])->getValue());
            if ($value === $employeeNumber) {
                return $row;
            }
        }

        for ($row = DATA_START_ROW; $row <= $highestRow; $row++) {
            if (self::isDataRowEmpty($sheet, $row)) {
                return $row;
            }
        }

        return $highestRow + 1;
    }

    private static function isDataRowEmpty(Worksheet $sheet, int $row): bool
    {
        $record = self::readRecord($sheet, $row);
        return $record['employeeNumber'] === '' && $record['name'] === '';
    }

    private static function readRecord(Worksheet $sheet, int $row): array
    {
        return [
            'no' => self::cellValue($sheet, $row, 'no'),
            'verifDate' => self::cellValue($sheet, $row, 'verifDate'),
            'mcuDate' => self::cellValue($sheet, $row, 'mcuDate'),
            'company' => self::cellValue($sheet, $row, 'company'),
            'employeeNumber' => self::cellValue($sheet, $row, 'employeeNumber'),
            'name' => self::cellValue($sheet, $row, 'name'),
            'gender' => self::cellValue($sheet, $row, 'gender'),
            'position' => self::cellValue($sheet, $row, 'position'),
            'dob' => self::cellValue($sheet, $row, 'dob'),
            'mcuProvider' => self::cellValue($sheet, $row, 'mcuProvider'),
            'visus' => self::cellValue($sheet, $row, 'visus'),
            'bp' => self::cellValue($sheet, $row, 'bp'),
            'lipid' => self::cellValue($sheet, $row, 'lipid'),
            'gdp' => self::cellValue($sheet, $row, 'gdp'),
            'bmi' => self::cellValue($sheet, $row, 'bmi'),
            'underweight' => self::cellValue($sheet, $row, 'underweight'),
            'lft' => self::cellValue($sheet, $row, 'lft'),
            'smoking' => self::cellValue($sheet, $row, 'smoking'),
        ];
    }

    private static function writeRecord(Worksheet $sheet, int $row, array $record): void
    {
        foreach (self::COL as $key => $col) {
            $sheet->setCellValue([$col, $row], $record[$key] ?? '');
        }
    }

    private static function clearRecord(Worksheet $sheet, int $row): void
    {
        foreach (self::COL as $col) {
            $sheet->setCellValue([$col, $row], '');
        }
    }

    private static function cellValue(Worksheet $sheet, int $row, string $key): string
    {
        $value = $sheet->getCell([self::COL[$key], $row])->getFormattedValue();
        return trim((string) $value);
    }

    private static function moveProcessedPdfs(array $pdfFiles): array
    {
        Paths::ensureDirs();
        $moved = [];

        foreach ($pdfFiles as $pdfFile) {
            $src = PDF_DIR . '/' . $pdfFile;
            if (!is_file($src)) {
                continue;
            }

            $dest = Paths::uniqueBackupPath($pdfFile);
            rename($src, $dest);
            $moved[] = ['file' => $pdfFile, 'backupName' => basename($dest)];
        }

        return $moved;
    }

    private static function parseFilename(string $fileName): array
    {
        $base = pathinfo($fileName, PATHINFO_FILENAME);
        $parts = explode('_', $base);

        if (count($parts) < 3) {
            return ['company' => '', 'employeeNumber' => '', 'name' => ''];
        }

        $company = trim(preg_replace('/\s+Utama$/i', '', $parts[0]) ?? $parts[0]);
        $employeeNumber = trim($parts[1]);
        $name = trim(implode('_', array_slice($parts, 2)));

        return compact('company', 'employeeNumber', 'name');
    }

    private static function normalizeEmployeeNumber(string $value, string $fallbackFromFile = ''): string
    {
        $raw = trim($value !== '' ? $value : $fallbackFromFile);
        if ($raw === '') {
            return '';
        }

        return str_starts_with($raw, 'Z') ? $raw : 'Z' . $raw;
    }

    private static function mapGender(string $value): string
    {
        $normalized = strtolower($value);
        if (str_starts_with($normalized, 'pria') || $normalized === 'l') {
            return 'M';
        }
        if (str_starts_with($normalized, 'wanita') || $normalized === 'p') {
            return 'F';
        }

        return $value;
    }

    private static function mapYesNo(string $value): string
    {
        $normalized = strtolower(trim($value));
        if ($normalized === '') {
            return '';
        }
        if ($normalized === 'tidak' || $normalized === 'no') {
            return 'No';
        }
        if ($normalized === 'ya' || $normalized === 'yes') {
            return 'Yes';
        }

        return 'Yes';
    }

    private static function mapSmoking(string $value): string
    {
        $normalized = strtolower(trim($value));
        if ($normalized === '') {
            return '';
        }
        if (str_starts_with($normalized, 'tidak')) {
            return 'No';
        }

        return 'Yes';
    }

    private static function extractPosition(string $departmentValue): string
    {
        if ($departmentValue === '') {
            return '';
        }

        $parts = array_map('trim', explode('/', $departmentValue));
        return count($parts) > 1 ? $parts[count($parts) - 1] : $parts[0];
    }

    private static function firstMatch(string $text, array $patterns): ?array
    {
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text, $matches)) {
                return $matches;
            }
        }

        return null;
    }

    private static function parseIndonesianDate(string $dateStr): ?DateTimeImmutable
    {
        if (!preg_match('/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i', trim($dateStr), $match)) {
            return null;
        }

        $monthKey = strtolower($match[2]);
        if (!isset(self::MONTHS[$monthKey])) {
            return null;
        }

        return DateTimeImmutable::createFromFormat(
            'Y-n-j',
            sprintf('%s-%s-%s', $match[3], self::MONTHS[$monthKey], $match[1])
        ) ?: null;
    }

    private static function formatDateDDMmmYY(?DateTimeImmutable $date): string
    {
        if ($date === null) {
            return '';
        }

        $day = str_pad((string) $date->format('j'), 2, '0', STR_PAD_LEFT);
        $month = self::MONTH_ABBR[(int) $date->format('n')] ?? '';
        $year = $date->format('y');

        return "{$day}-{$month}-{$year}";
    }
}
