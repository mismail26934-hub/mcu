const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const {
  PDF_DIR,
  EXCEL_DIR,
  ensureDirs,
  resolveExcelOutputPath,
} = require("./lib/paths");
const {
  processAllPdfs,
  getExcelPreview,
  deleteExcelRows,
  getStatus,
} = require("./lib/extract");

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_FILES = Number(process.env.MAX_UPLOAD_FILES || 50);
const MAX_FILE_SIZE_MB = Number(process.env.MAX_UPLOAD_MB || 15);

ensureDirs();

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, PDF_DIR);
  },
  filename(_req, file, cb) {
    const safeName = path.basename(file.originalname);
    const target = path.join(PDF_DIR, safeName);

    if (!fs.existsSync(target)) {
      cb(null, safeName);
      return;
    }

    const parsed = path.parse(safeName);
    const stamp = Date.now();
    cb(null, `${parsed.name}_${stamp}${parsed.ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    files: MAX_FILES,
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter(_req, file, cb) {
    if (!file.originalname.toLowerCase().endsWith(".pdf")) {
      cb(new Error("Hanya file PDF yang diizinkan."));
      return;
    }
    cb(null, true);
  },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (_req, res) => {
  res.json(getStatus());
});

app.get("/api/excel/preview", (_req, res) => {
  try {
    res.json(getExcelPreview());
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.get("/api/excel/download", (_req, res) => {
  try {
    const excelPath = resolveExcelOutputPath();
    if (!fs.existsSync(excelPath)) {
      res.status(404).json({ error: "File Excel belum tersedia." });
      return;
    }

    res.download(excelPath, path.basename(excelPath));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/upload", upload.array("pdfs", MAX_FILES), (req, res) => {
  const files = (req.files || []).map((file) => ({
    originalName: file.originalname,
    savedAs: file.filename,
    size: file.size,
  }));

  res.json({
    message: `${files.length} PDF berhasil diupload.`,
    files,
    status: getStatus(),
  });
});

app.post("/api/process", async (_req, res) => {
  try {
    const result = await processAllPdfs({ moveToBackup: true });
    res.json({
      message: `Selesai. ${result.processedCount} PDF diproses.`,
      ...result,
      preview: getExcelPreview(result.outputFile),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/excel/delete", (req, res) => {
  try {
    const excelRows = req.body?.excelRows;
    if (!Array.isArray(excelRows) || excelRows.length === 0) {
      res.status(400).json({ error: "Pilih minimal 1 baris untuk dihapus." });
      return;
    }

    const result = deleteExcelRows(excelRows);
    res.json({
      message: `${result.deletedCount} baris dihapus dari Excel.`,
      ...result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? `Ukuran file melebihi ${MAX_FILE_SIZE_MB} MB.`
        : error.code === "LIMIT_FILE_COUNT"
          ? `Maksimal ${MAX_FILES} file per upload.`
          : error.message;
    res.status(400).json({ error: message });
    return;
  }

  res.status(400).json({ error: error.message || "Terjadi kesalahan." });
});

app.listen(PORT, () => {
  console.log(`MCU Web App berjalan di http://localhost:${PORT}`);
  console.log(`Folder PDF : ${PDF_DIR}`);
  console.log(`Folder Excel: ${EXCEL_DIR}`);
  console.log("Restart server setelah update kode (Ctrl+C lalu npm start).");
});
