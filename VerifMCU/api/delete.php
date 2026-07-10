<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/lib/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed.', 405);
}

$body = readJsonBody();
$excelRows = $body['excelRows'] ?? null;

if (!is_array($excelRows) || $excelRows === []) {
    jsonError('Pilih minimal 1 baris untuk dihapus.');
}

try {
    $result = Extract::deleteExcelRows($excelRows);
    $result['message'] = $result['deletedCount'] . ' baris dihapus dari Excel.';
    jsonResponse($result);
} catch (Throwable $error) {
    jsonError($error->getMessage());
}
