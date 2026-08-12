import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { BACKUP_DIR, ensureDirs } = require("./paths") as {
  BACKUP_DIR: string;
  ensureDirs: () => void;
};

export type BackupPdfEntry = {
  name: string;
  size: number;
  modifiedAt: string;
};

export function resolveBackupPdfPath(fileName: string): string {
  const safeName = path.basename(fileName);
  if (!safeName.toLowerCase().endsWith(".pdf")) {
    throw new Error("Hanya file PDF yang diizinkan.");
  }

  const fullPath = path.join(BACKUP_DIR, safeName);
  const resolvedBackup = path.resolve(BACKUP_DIR);
  const resolvedFile = path.resolve(fullPath);

  if (
    !resolvedFile.startsWith(resolvedBackup + path.sep) &&
    resolvedFile !== resolvedBackup
  ) {
    throw new Error("Path file tidak valid.");
  }

  return fullPath;
}

export function listBackupPdfs(): BackupPdfEntry[] {
  ensureDirs();

  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  return fs
    .readdirSync(BACKUP_DIR)
    .filter((file) => file.toLowerCase().endsWith(".pdf"))
    .map((name) => {
      const fullPath = path.join(BACKUP_DIR, name);
      const stat = fs.statSync(fullPath);
      return {
        name,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

export function deleteBackupPdfs(fileNames: string[]) {
  ensureDirs();

  const deleted: string[] = [];
  const errors: Array<{ name: string; error: string }> = [];

  for (const fileName of fileNames) {
    try {
      const fullPath = resolveBackupPdfPath(fileName);
      if (!fs.existsSync(fullPath)) {
        errors.push({ name: fileName, error: "File tidak ditemukan." });
        continue;
      }
      fs.unlinkSync(fullPath);
      deleted.push(path.basename(fileName));
    } catch (error) {
      errors.push({
        name: fileName,
        error: error instanceof Error ? error.message : "Gagal menghapus.",
      });
    }
  }

  if (deleted.length === 0 && errors.length > 0) {
    throw new Error(errors.map((item) => `${item.name}: ${item.error}`).join("; "));
  }

  return { deletedCount: deleted.length, deleted, errors };
}
