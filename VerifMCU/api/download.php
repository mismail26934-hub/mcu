<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/lib/bootstrap.php';

try {
    $excelPath = Paths::resolveExcelOutputPath();
    if (!is_file($excelPath)) {
        jsonError('File Excel belum tersedia.', 404);
    }

    $fileName = basename($excelPath);
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="' . rawurlencode($fileName) . '"');
    header('Content-Length: ' . (string) filesize($excelPath));
    header('Cache-Control: no-cache');

    readfile($excelPath);
    exit;
} catch (Throwable $error) {
    jsonError($error->getMessage(), 500);
}
