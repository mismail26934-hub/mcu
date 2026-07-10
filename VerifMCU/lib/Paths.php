<?php

declare(strict_types=1);

final class Paths
{
    public static function ensureDirs(): void
    {
        foreach ([PDF_DIR, BACKUP_DIR, EXCEL_DIR] as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
    }

    public static function listPdfFiles(string $dir = PDF_DIR): array
    {
        if (!is_dir($dir)) {
            return [];
        }

        $files = array_values(array_filter(
            scandir($dir) ?: [],
            static fn(string $file): bool => str_ends_with(strtolower($file), '.pdf')
        ));

        sort($files);
        return $files;
    }

    public static function resolveExcelOutputPath(): string
    {
        if (is_file(EXCEL_FILE)) {
            return EXCEL_FILE;
        }

        $fallback = self::getFallbackExcelPath();
        if (is_file($fallback)) {
            return $fallback;
        }

        return EXCEL_FILE;
    }

    public static function getFallbackExcelPath(): string
    {
        return EXCEL_DIR . '/' . EXCEL_FALLBACK_NAME;
    }

    public static function removeStaleFallbackCopy(): void
    {
        $fallback = self::getFallbackExcelPath();
        if (is_file($fallback)) {
            unlink($fallback);
        }
    }

    public static function uniqueBackupPath(string $fileName): string
    {
        $dest = BACKUP_DIR . '/' . $fileName;
        if (!is_file($dest)) {
            return $dest;
        }

        $info = pathinfo($fileName);
        $stamp = date('Y-m-d_His');
        $base = $info['filename'] ?? 'file';
        $ext = isset($info['extension']) ? '.' . $info['extension'] : '';

        return BACKUP_DIR . '/' . $base . '_' . $stamp . $ext;
    }

    public static function safeBasename(string $name): string
    {
        return basename(str_replace(['\\', '/'], '', $name));
    }
}
