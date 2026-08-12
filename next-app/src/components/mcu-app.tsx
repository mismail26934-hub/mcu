"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status = {
  pendingPdfCount: number;
  excelFile: string | null;
};

type BackupPdfEntry = {
  name: string;
  size: number;
  modifiedAt: string;
};

type PreviewRow = {
  excelRow: number;
  no: string;
  verifDate: string;
  mcuDate: string;
  company: string;
  employeeNumber: string;
  name: string;
  gender: string;
  position: string;
  dob: string;
  mcuProvider: string;
  visus: string;
  bp: string;
  lipid: string;
  gdp: string;
  bmi: string;
  underweight: string;
  lft: string;
  smoking: string;
};

type Preview = {
  headers: string[];
  rows: PreviewRow[];
};

type ProcessResult = {
  message: string;
  results: Array<{
    status: string;
    file: string;
    employeeNumber?: string;
    name?: string;
    excelRow?: number;
    error?: string;
  }>;
  isFallbackCopy?: boolean;
  moved?: Array<{ file: string; backupName: string }>;
  preview?: Preview;
};

const BACKUP_PAGE_SIZE = 10;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      (data as { error?: string }).error || `Request gagal (${response.status})`
    );
  }

  return data as T;
}

function rowCells(row: PreviewRow): string[] {
  return [
    row.no,
    row.verifDate,
    row.mcuDate,
    row.company,
    row.employeeNumber,
    row.name,
    row.gender,
    row.position,
    row.dob,
    row.mcuProvider,
    row.visus,
    row.bp,
    row.lipid,
    row.gdp,
    row.bmi,
    row.underweight,
    row.lft,
    row.smoking,
  ];
}

export default function McuApp() {
  const [status, setStatus] = useState<Status | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<Preview>({ headers: [], rows: [] });
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [uploadLog, setUploadLog] = useState("");
  const [processLog, setProcessLog] = useState<React.ReactNode>("");
  const [deleteLog, setDeleteLog] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [backupFiles, setBackupFiles] = useState<BackupPdfEntry[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<Set<string>>(new Set());
  const [backupLog, setBackupLog] = useState("");
  const [backupPage, setBackupPage] = useState(1);
  const [busy, setBusy] = useState({
    upload: false,
    process: false,
    preview: false,
    delete: false,
    backup: false,
    backupDelete: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStatus = useCallback(async () => {
    const data = await fetchJson<Status>("/api/status");
    setStatus(data);
    return data;
  }, []);

  const loadBackupFiles = useCallback(async () => {
    const data = await fetchJson<{ files: BackupPdfEntry[] }>("/api/pdf-backup");
    setBackupFiles(data.files);
    setSelectedBackup(new Set());
    setBackupPage(1);
    return data.files;
  }, []);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(backupFiles.length / BACKUP_PAGE_SIZE)
    );
    if (backupPage > totalPages) {
      setBackupPage(totalPages);
    }
  }, [backupFiles.length, backupPage]);

  useEffect(() => {
    loadStatus().catch((error: Error) => {
      setStatus({ pendingPdfCount: 0, excelFile: null });
      setUploadLog(error.message);
    });
    loadBackupFiles().catch(() => setBackupFiles([]));
  }, [loadStatus, loadBackupFiles]);

  function handleFiles(files: FileList | null) {
    if (!files?.length) {
      setSelectedFiles([]);
      return;
    }
    setSelectedFiles(Array.from(files));
  }

  function toggleRow(excelRow: number, checked: boolean) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (checked) next.add(excelRow);
      else next.delete(excelRow);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelectedRows(new Set());
      return;
    }
    setSelectedRows(new Set(preview.rows.map((row) => row.excelRow)));
  }

  async function handleUpload() {
    if (!selectedFiles.length) {
      setUploadLog("Pilih minimal 1 file PDF.");
      return;
    }

    setBusy((b) => ({ ...b, upload: true }));
    setUploadLog("Mengupload PDF...");

    try {
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append("pdfs", file);
      }

      const result = await fetchJson<{
        message: string;
        files: Array<{ savedAs: string }>;
      }>("/api/upload", { method: "POST", body: formData });

      setUploadLog(
        `${result.message}\n${result.files.map((f) => `- ${f.savedAs}`).join("\n")}`
      );
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadStatus();
    } catch (error) {
      setUploadLog(error instanceof Error ? error.message : "Upload gagal.");
    } finally {
      setBusy((b) => ({ ...b, upload: false }));
    }
  }

  async function handleProcess() {
    setBusy((b) => ({ ...b, process: true }));
    setProcessLog("Memproses PDF...");

    try {
      const result = await fetchJson<ProcessResult>("/api/process", {
        method: "POST",
      });

      const lines = result.results.map((item) => {
        if (item.status === "ok") {
          return `[OK] ${item.file}\n  E/N: ${item.employeeNumber} | Nama: ${item.name} | Baris: ${item.excelRow}`;
        }
        return `[SKIP] ${item.file}\n  ${item.error}`;
      });

      if (result.isFallbackCopy) {
        lines.push(
          "",
          "Excel sedang dibuka. Hasil disimpan ke salinan - updated.xlsx"
        );
      }

      if (result.moved?.length) {
        lines.push("", "PDF dipindah ke PDF-backup:");
        for (const item of result.moved) {
          lines.push(`  ${item.file} -> ${item.backupName}`);
        }
      }

      setProcessLog(
        lines.map((line, index) => {
          if (line.startsWith("[OK]")) {
            return (
              <span key={index} className="ok">
                {line}
                {"\n"}
              </span>
            );
          }
          if (line.startsWith("[SKIP]")) {
            return (
              <span key={index} className="skip">
                {line}
                {"\n"}
              </span>
            );
          }
          return (
            <span key={index}>
              {line}
              {"\n"}
            </span>
          );
        })
      );

      if (result.preview) {
        setPreview(result.preview);
        setSelectedRows(new Set());
      }
      await loadStatus();
      await loadBackupFiles();
    } catch (error) {
      setProcessLog(
        error instanceof Error ? error.message : "Proses gagal."
      );
    } finally {
      setBusy((b) => ({ ...b, process: false }));
    }
  }

  async function handlePreview() {
    setBusy((b) => ({ ...b, preview: true }));

    try {
      const data = await fetchJson<Preview>("/api/excel/preview");
      setPreview(data);
      setSelectedRows(new Set());
      setDeleteLog("");
    } catch (error) {
      setPreview({ headers: [], rows: [] });
      setProcessLog(
        error instanceof Error ? error.message : "Preview gagal."
      );
    } finally {
      setBusy((b) => ({ ...b, preview: false }));
    }
  }

  async function handleDelete() {
    const excelRows = Array.from(selectedRows);
    if (!excelRows.length) {
      setDeleteLog("Pilih minimal 1 baris untuk dihapus.");
      return;
    }

    const confirmed = window.confirm(
      `Hapus ${excelRows.length} baris terpilih dari Excel?\n\nTindakan ini tidak bisa dibatalkan.`
    );
    if (!confirmed) return;

    setBusy((b) => ({ ...b, delete: true }));
    setDeleteLog("Menghapus baris terpilih...");

    try {
      const result = await fetchJson<{
        message: string;
        deleted: Array<{
          excelRow: number;
          employeeNumber: string;
          name: string;
        }>;
        isFallbackCopy?: boolean;
        outputFileName?: string;
      }>("/api/excel/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excelRows }),
      });

      const lines = [
        result.message,
        ...result.deleted.map(
          (item) =>
            `- Baris ${item.excelRow}: ${item.employeeNumber} | ${item.name}`
        ),
      ];

      if (result.isFallbackCopy) {
        lines.push(
          "",
          "PENTING: Tutup file Excel yang sedang dibuka.",
          "Perubahan disimpan ke: NEW List Pengajuan Verifikasi MCU KPC - updated.xlsx"
        );
      } else if (result.outputFileName) {
        lines.push("", `File diperbarui: ${result.outputFileName}`);
      }

      setDeleteLog(lines.join("\n"));

      const data = await fetchJson<Preview>("/api/excel/preview");
      setPreview(data);
      setSelectedRows(new Set());
      await loadStatus();
    } catch (error) {
      setDeleteLog(error instanceof Error ? error.message : "Hapus gagal.");
    } finally {
      setBusy((b) => ({ ...b, delete: false }));
    }
  }

  function toggleBackupFile(name: string, checked: boolean) {
    setSelectedBackup((prev) => {
      const next = new Set(prev);
      if (checked) next.add(name);
      else next.delete(name);
      return next;
    });
  }

  function toggleAllBackupOnPage(checked: boolean) {
    setSelectedBackup((prev) => {
      const next = new Set(prev);
      for (const file of paginatedBackupFiles) {
        if (checked) next.add(file.name);
        else next.delete(file.name);
      }
      return next;
    });
  }

  async function handleDeleteBackup() {
    const files = Array.from(selectedBackup);
    if (!files.length) {
      setBackupLog("Pilih minimal 1 file backup untuk dihapus.");
      return;
    }

    const confirmed = window.confirm(
      `Hapus ${files.length} file dari PDF-backup?\n\nTindakan ini tidak bisa dibatalkan.`
    );
    if (!confirmed) return;

    setBusy((b) => ({ ...b, backupDelete: true }));
    setBackupLog("Menghapus file backup...");

    try {
      const result = await fetchJson<{
        message: string;
        deleted: string[];
        errors?: Array<{ name: string; error: string }>;
      }>("/api/pdf-backup/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });

      const lines = [result.message, ...result.deleted.map((name) => `- ${name}`)];
      if (result.errors?.length) {
        lines.push("", "Beberapa file gagal:");
        for (const item of result.errors) {
          lines.push(`- ${item.name}: ${item.error}`);
        }
      }
      setBackupLog(lines.join("\n"));
      await loadBackupFiles();
    } catch (error) {
      setBackupLog(error instanceof Error ? error.message : "Hapus gagal.");
    } finally {
      setBusy((b) => ({ ...b, backupDelete: false }));
    }
  }

  async function handleRefreshBackup() {
    setBusy((b) => ({ ...b, backup: true }));
    try {
      await loadBackupFiles();
      setBackupLog("Daftar PDF-backup diperbarui.");
    } catch (error) {
      setBackupLog(error instanceof Error ? error.message : "Refresh gagal.");
    } finally {
      setBusy((b) => ({ ...b, backup: false }));
    }
  }

  const backupTotalPages = Math.max(
    1,
    Math.ceil(backupFiles.length / BACKUP_PAGE_SIZE)
  );
  const backupPageSafe = Math.min(backupPage, backupTotalPages);
  const paginatedBackupFiles = backupFiles.slice(
    (backupPageSafe - 1) * BACKUP_PAGE_SIZE,
    backupPageSafe * BACKUP_PAGE_SIZE
  );

  const allBackupSelectedOnPage =
    paginatedBackupFiles.length > 0 &&
    paginatedBackupFiles.every((file) => selectedBackup.has(file.name));
  const someBackupSelectedOnPage =
    paginatedBackupFiles.some((file) => selectedBackup.has(file.name)) &&
    !allBackupSelectedOnPage;

  const allSelected =
    preview.rows.length > 0 && selectedRows.size === preview.rows.length;
  const someSelected =
    selectedRows.size > 0 && selectedRows.size < preview.rows.length;

  return (
    <div className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Trakindo / Tirta Medical Centre</p>
          <h1>MCU PDF to Excel</h1>
          <p className="subtitle">
            Upload massal PDF MCU, proses ke Excel, lihat preview, dan download
            file hasil. Powered by Next.js 16.
          </p>
        </div>
        <div className="status-card">
          <div>
            <span className="label">PDF menunggu</span>
            <strong>{status ? status.pendingPdfCount : "-"}</strong>
          </div>
          <div>
            <span className="label">File Excel</span>
            <strong>{status?.excelFile || "Belum ada"}</strong>
          </div>
        </div>
      </header>

      <main className="grid">
        <section className="panel">
          <h2>1. Upload PDF</h2>
          <p>
            Pilih banyak file PDF sekaligus. File disimpan ke folder{" "}
            <code>PDF FIle</code>.
          </p>

          <label
            className={`dropzone${dragOver ? " dragover" : ""}`}
            htmlFor="pdfInput"
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              handleFiles(event.dataTransfer.files);
            }}
          >
            <input
              ref={fileInputRef}
              id="pdfInput"
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={(event) => handleFiles(event.target.files)}
            />
            <span className="dropzone-title">Klik atau tarik PDF ke sini</span>
            <span className="dropzone-hint">Maks. 50 file, 15 MB per file</span>
          </label>

          {selectedFiles.length > 0 && (
            <div className="file-list">
              {selectedFiles.length} file dipilih:{" "}
              {selectedFiles.map((file) => file.name).join(", ")}
            </div>
          )}

          <div className="actions">
            <button
              className="btn primary"
              type="button"
              disabled={busy.upload}
              onClick={handleUpload}
            >
              Upload PDF
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={() =>
                loadStatus()
                  .then(() => setUploadLog("Status diperbarui."))
                  .catch((error: Error) => setUploadLog(error.message))
              }
            >
              Refresh Status
            </button>
          </div>

          {uploadLog && <div className="log">{uploadLog}</div>}
        </section>

        <section className="panel">
          <h2>2. Proses ke Excel</h2>
          <p>
            Ekstrak data dari semua PDF di folder, tulis ke sheet{" "}
            <strong>CONTOH</strong>, lalu pindahkan PDF sukses ke{" "}
            <code>PDF-backup</code>.
          </p>

          <div className="actions">
            <button
              className="btn primary"
              type="button"
              disabled={busy.process}
              onClick={handleProcess}
            >
              Proses MCU
            </button>
          </div>

          {processLog && <div className="log">{processLog}</div>}
        </section>

        <section className="panel panel-wide">
          <div className="panel-head">
            <div>
              <h2>3. Preview & Download Excel</h2>
              <p>
                Tampilan data sheet CONTOH. Formatting Excel asli mungkin
                berbeda.
              </p>
            </div>
            <div className="actions">
              <button
                className="btn secondary"
                type="button"
                disabled={busy.preview}
                onClick={handlePreview}
              >
                Muat Preview
              </button>
              <button
                className="btn danger"
                type="button"
                disabled={busy.delete || selectedRows.size === 0}
                onClick={handleDelete}
              >
                Hapus Terpilih ({selectedRows.size})
              </button>
              <a className="btn primary" href="/api/excel/download">
                Download Excel
              </a>
            </div>
          </div>

          {deleteLog && <div className="log">{deleteLog}</div>}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="select-col">
                    <input
                      type="checkbox"
                      title="Pilih semua"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected;
                      }}
                      onChange={(event) => toggleAll(event.target.checked)}
                    />
                  </th>
                  <th>Baris</th>
                  {(preview.headers.length
                    ? preview.headers
                    : ["No", "Verifc. date", "MCU Date"]
                  ).map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!preview.rows.length ? (
                  <tr>
                    <td colSpan={(preview.headers.length || 3) + 2}>
                      Belum ada data.
                    </td>
                  </tr>
                ) : (
                  preview.rows.map((row) => (
                    <tr
                      key={row.excelRow}
                      className={
                        selectedRows.has(row.excelRow) ? "selected" : undefined
                      }
                    >
                      <td className="select-col">
                        <input
                          type="checkbox"
                          aria-label={`Pilih baris ${row.excelRow}`}
                          checked={selectedRows.has(row.excelRow)}
                          onChange={(event) =>
                            toggleRow(row.excelRow, event.target.checked)
                          }
                        />
                      </td>
                      <td>{row.excelRow}</td>
                      {rowCells(row).map((value, index) => (
                        <td key={index}>{value}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel panel-wide">
          <div className="panel-head">
            <div>
              <h2>4. PDF-backup ({backupFiles.length})</h2>
              <p>
                Arsip PDF yang sudah berhasil diproses. Download atau hapus file
                dari folder <code>PDF-backup</code>.
              </p>
            </div>
            <div className="actions">
              <button
                className="btn secondary"
                type="button"
                disabled={busy.backup}
                onClick={handleRefreshBackup}
              >
                Refresh
              </button>
              <button
                className="btn danger"
                type="button"
                disabled={busy.backupDelete || selectedBackup.size === 0}
                onClick={handleDeleteBackup}
              >
                Hapus Terpilih ({selectedBackup.size})
              </button>
            </div>
          </div>

          {backupLog && <div className="log">{backupLog}</div>}

          <div className="table-wrap backup-table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="select-col">
                    <input
                      type="checkbox"
                      title="Pilih semua di halaman ini"
                      checked={allBackupSelectedOnPage}
                      ref={(input) => {
                        if (input) input.indeterminate = someBackupSelectedOnPage;
                      }}
                      onChange={(event) =>
                        toggleAllBackupOnPage(event.target.checked)
                      }
                      disabled={!paginatedBackupFiles.length}
                    />
                  </th>
                  <th>Nama file</th>
                  <th>Ukuran</th>
                  <th>Di-backup</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {!backupFiles.length ? (
                  <tr>
                    <td colSpan={5}>Belum ada file di PDF-backup.</td>
                  </tr>
                ) : (
                  paginatedBackupFiles.map((file) => (
                    <tr
                      key={file.name}
                      className={
                        selectedBackup.has(file.name) ? "selected" : undefined
                      }
                    >
                      <td className="select-col">
                        <input
                          type="checkbox"
                          aria-label={`Pilih ${file.name}`}
                          checked={selectedBackup.has(file.name)}
                          onChange={(event) =>
                            toggleBackupFile(file.name, event.target.checked)
                          }
                        />
                      </td>
                      <td className="file-name-cell">{file.name}</td>
                      <td>{formatBytes(file.size)}</td>
                      <td>{formatDateTime(file.modifiedAt)}</td>
                      <td className="actions-cell">
                        <a
                          className="btn secondary btn-small"
                          href={`/api/pdf-backup/download?file=${encodeURIComponent(file.name)}`}
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {backupFiles.length > 0 && (
            <div className="pagination">
              <span className="pagination-info">
                Menampilkan{" "}
                {(backupPageSafe - 1) * BACKUP_PAGE_SIZE + 1}–
                {Math.min(backupPageSafe * BACKUP_PAGE_SIZE, backupFiles.length)}{" "}
                dari {backupFiles.length} file
              </span>
              <div className="pagination-actions">
                <button
                  className="btn secondary btn-small"
                  type="button"
                  disabled={backupPageSafe <= 1}
                  onClick={() => setBackupPage((page) => Math.max(1, page - 1))}
                >
                  Sebelumnya
                </button>
                <span className="pagination-page">
                  Halaman {backupPageSafe} / {backupTotalPages}
                </span>
                <button
                  className="btn secondary btn-small"
                  type="button"
                  disabled={backupPageSafe >= backupTotalPages}
                  onClick={() =>
                    setBackupPage((page) =>
                      Math.min(backupTotalPages, page + 1)
                    )
                  }
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
