const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "../..");
const PDF_DIR = path.join(ROOT_DIR, "PDF FIle");
const BACKUP_DIR = path.join(ROOT_DIR, "PDF-backup");
const EXCEL_DIR = path.join(ROOT_DIR, "Excel File");
const EXCEL_FILE = path.join(
  EXCEL_DIR,
  "NEW List Pengajuan Verifikasi MCU KPC.xlsx"
);
const EXCEL_FALLBACK_NAME = "NEW List Pengajuan Verifikasi MCU KPC - updated.xlsx";

const TARGET_SHEET = "CONTOH";
const HEADER_ROW = 7;
const MCU_PROVIDER = "TIRTA MEDICAL CENTRE";
const VERIF_DATE_PLACEHOLDER = "diisi KPC";

const COLUMN_HEADERS = [
  "No",
  "Verifc. date",
  "MCU Date",
  "Company",
  "E/N",
  "Name",
  "Gender",
  "Positions",
  "DOB",
  "MCU Provider",
  "Visus",
  "BP",
  "Lipid",
  "GDP",
  "BMI > 30",
  "Underweight",
  "LFT",
  "Smoking",
];

function ensureDirs() {
  for (const dir of [PDF_DIR, BACKUP_DIR, EXCEL_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function listPdfFiles(dir = PDF_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.toLowerCase().endsWith(".pdf"))
    .sort();
}

function resolveExcelOutputPath() {
  if (fs.existsSync(EXCEL_FILE)) return EXCEL_FILE;

  const fallback = path.join(EXCEL_DIR, EXCEL_FALLBACK_NAME);
  if (fs.existsSync(fallback)) return fallback;

  return EXCEL_FILE;
}

function getFallbackExcelPath() {
  return path.join(EXCEL_DIR, EXCEL_FALLBACK_NAME);
}

function removeStaleFallbackCopy() {
  const fallback = getFallbackExcelPath();
  if (fs.existsSync(fallback)) {
    fs.unlinkSync(fallback);
  }
}

module.exports = {
  ROOT_DIR,
  PDF_DIR,
  BACKUP_DIR,
  EXCEL_DIR,
  EXCEL_FILE,
  EXCEL_FALLBACK_NAME,
  TARGET_SHEET,
  HEADER_ROW,
  MCU_PROVIDER,
  VERIF_DATE_PLACEHOLDER,
  COLUMN_HEADERS,
  ensureDirs,
  listPdfFiles,
  resolveExcelOutputPath,
  getFallbackExcelPath,
  removeStaleFallbackCopy,
};
