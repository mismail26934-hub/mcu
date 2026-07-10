<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/lib/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed.', 405);
}

try {
    $result = Extract::processAllPdfs(true);
    $result['message'] = 'Selesai. ' . $result['processedCount'] . ' PDF diproses.';
    $result['preview'] = Extract::getExcelPreview($result['outputFile']);
    jsonResponse($result);
} catch (Throwable $error) {
    jsonError($error->getMessage());
}
