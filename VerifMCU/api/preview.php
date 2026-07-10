<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/lib/bootstrap.php';

try {
    jsonResponse(Extract::getExcelPreview());
} catch (Throwable $error) {
    jsonError($error->getMessage(), 404);
}
