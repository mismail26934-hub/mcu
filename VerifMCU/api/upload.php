<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/lib/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed.', 405);
}

Paths::ensureDirs();

if (empty($_FILES['pdfs'])) {
    jsonError('Pilih minimal 1 file PDF.');
}

$files = $_FILES['pdfs'];
$names = is_array($files['name']) ? $files['name'] : [$files['name']];
$tmpNames = is_array($files['tmp_name']) ? $files['tmp_name'] : [$files['tmp_name']];
$sizes = is_array($files['size']) ? $files['size'] : [$files['size']];
$errors = is_array($files['error']) ? $files['error'] : [$files['error']];

if (count($names) > MAX_UPLOAD_FILES) {
    jsonError('Maksimal ' . MAX_UPLOAD_FILES . ' file per upload.');
}

$maxBytes = MAX_UPLOAD_MB * 1024 * 1024;
$saved = [];

for ($i = 0, $count = count($names); $i < $count; $i++) {
    if (($errors[$i] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        jsonError('Upload gagal untuk file: ' . ($names[$i] ?? 'unknown'));
    }

    if (($sizes[$i] ?? 0) > $maxBytes) {
        jsonError('Ukuran file melebihi ' . MAX_UPLOAD_MB . ' MB.');
    }

    $originalName = Paths::safeBasename($names[$i] ?? '');
    if (!str_ends_with(strtolower($originalName), '.pdf')) {
        jsonError('Hanya file PDF yang diizinkan.');
    }

    $target = PDF_DIR . '/' . $originalName;
    if (is_file($target)) {
        $info = pathinfo($originalName);
        $base = $info['filename'] ?? 'file';
        $ext = isset($info['extension']) ? '.' . $info['extension'] : '';
        $target = PDF_DIR . '/' . $base . '_' . time() . $ext;
    }

    if (!move_uploaded_file($tmpNames[$i], $target)) {
        jsonError('Gagal menyimpan file: ' . $originalName);
    }

    $saved[] = [
        'originalName' => $originalName,
        'savedAs' => basename($target),
        'size' => (int) ($sizes[$i] ?? 0),
    ];
}

jsonResponse([
    'message' => count($saved) . ' PDF berhasil diupload.',
    'files' => $saved,
    'status' => Extract::getStatus(),
]);
