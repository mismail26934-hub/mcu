const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
const {
  PDF_DIR,
  BACKUP_DIR,
  EXCEL_FILE,
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
} = require("./paths");

const MONTHS = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

async function extractPdfText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const { text } = await pdfParse(buffer);
  return text;
}

function parseIndonesianDate(dateStr) {
  const match = dateStr
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);

  if (!match) return null;

  const day = Number(match[1]);
  const month = MONTHS[match[2]];
  const year = Number(match[3]);

  if (!month) return null;
  return new Date(year, month - 1, day);
}

function formatDateDDMmmYY(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTH_ABBR[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

function parseFilename(fileName) {
  const base = path.basename(fileName, ".pdf");
  const parts = base.split("_");

  if (parts.length < 3) {
    return { company: "", employeeNumber: "", name: "" };
  }

  const company = parts[0].replace(/\s+Utama$/i, "").trim();
  const employeeNumber = parts[1].trim();
  const name = parts.slice(2).join("_").trim();

  return { company, employeeNumber, name };
}

function normalizeEmployeeNumber(value, fallbackFromFile = "") {
  const raw = (value || fallbackFromFile || "").trim();
  if (!raw) return "";
  return raw.startsWith("Z") ? raw : `Z${raw}`;
}

function mapGender(value) {
  const normalized = (value || "").toLowerCase();
  if (normalized.startsWith("pria") || normalized === "l") return "M";
  if (normalized.startsWith("wanita") || normalized === "p") return "F";
  return value || "";
}

function mapYesNo(value) {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "tidak" || normalized === "no") return "No";
  if (normalized === "ya" || normalized === "yes") return "Yes";
  return "Yes";
}

function mapSmoking(value) {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.startsWith("tidak")) return "No";
  return "Yes";
}

function extractPosition(departmentValue) {
  if (!departmentValue) return "";
  const parts = departmentValue.split("/").map((part) => part.trim());
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

function extractFields(text, fileName) {
  const fromFile = parseFilename(fileName);

  const mcuDateMatch = firstMatch(text, [
    /Tanggal Kunjungan \/ Lokasi\s*:\s*([^/]+?)\s*\/\s*Site/i,
    /Tanggal Kunjungan\s*:\s*([^/]+?)\s+\s*Tanggal Lahir/i,
  ]);

  const employeeMatch = firstMatch(text, [/Nomor Karyawan\s*:\s*(\S+)/i]);
  const nameMatch = firstMatch(text, [/Nama Pasien\s*:\s*(.+?)\s+Jenis Kelamin/i]);
  const genderDobMatch = firstMatch(text, [
    /Jenis Kelamin \/ Tanggal Lahir\s*:\s*(\w+)\s*\/\s*(\d+\s+\w+\s+\d{4})/i,
  ]);
  const departmentMatch = firstMatch(text, [
    /Departemen \/ Bagian\s*:\s*(.+?)\s+Tanggal Kunjungan/i,
  ]);
  const glassesMatch = firstMatch(text, [/Memakai Kacamata Sehari-hari\s*(\w+)/i]);
  const bpMatch = firstMatch(text, [
    /Sistol\s*(\d+)\s*mmHg\s*Diastol\s*(\d+)\s*mmHg/i,
  ]);
  const cholesterolMatch = firstMatch(text, [/Cholesterol\s*(\d+)\s*mg\/dL/i]);
  const triglycerideMatch = firstMatch(text, [/Trigliserid\s*(\d+)\s*mg\/dL/i]);
  const glucoseMatch = firstMatch(text, [
    /Estimated Average Glucose \(eAG\)\s*(\d+(?:[.,]\d+)?)/i,
  ]);
  const bmiMatch = firstMatch(text, [/BMI\s*(\d+(?:[.,]\d+)?)/i]);
  const sgptMatch = firstMatch(text, [/SGPT\s*(\d+)\s*U\/L/i]);
  const sgotMatch = firstMatch(text, [/SGOT\s*(\d+)\s*U\/L/i]);
  const smokingMatch = firstMatch(text, [/Merokok\s*(.+?)\s*Alkohol/i]);

  const mcuDate = mcuDateMatch ? parseIndonesianDate(mcuDateMatch[1]) : null;
  const dob = genderDobMatch ? parseIndonesianDate(genderDobMatch[2]) : null;
  const bmiValue = bmiMatch ? Number(bmiMatch[1].replace(",", ".")) : null;

  const employeeNumber = normalizeEmployeeNumber(
    employeeMatch?.[1],
    fromFile.employeeNumber
  );

  return {
    mcuDate: formatDateDDMmmYY(mcuDate),
    company: fromFile.company || "Trakindo",
    employeeNumber,
    name: (nameMatch?.[1] || fromFile.name || "").trim(),
    gender: mapGender(genderDobMatch?.[1] || ""),
    position: extractPosition(departmentMatch?.[1] || ""),
    dob: formatDateDDMmmYY(dob),
    mcuProvider: MCU_PROVIDER,
    visus: mapYesNo(glassesMatch?.[1] || ""),
    bp: bpMatch ? `BP: ${bpMatch[1]}/${bpMatch[2]}` : "",
    lipid:
      cholesterolMatch && triglycerideMatch
        ? `TC: ${cholesterolMatch[1]} TG: ${triglycerideMatch[1]}`
        : "",
    gdp: glucoseMatch ? `GF: ${glucoseMatch[1].replace(",", ".")}` : "",
    bmi: bmiValue !== null ? `BMI: ${bmiValue}` : "",
    underweight: bmiValue !== null && bmiValue < 18 ? `BMI: ${bmiValue}` : "",
    lft:
      sgptMatch && sgotMatch
        ? `SGPT: ${sgptMatch[1]} SGOT: ${sgotMatch[1]}`
        : "",
    smoking: mapSmoking(smokingMatch?.[1] || ""),
  };
}

function rowToRecord(row) {
  return {
    no: row[0] ?? "",
    verifDate: row[1] ?? "",
    mcuDate: row[2] ?? "",
    company: row[3] ?? "",
    employeeNumber: row[4] ?? "",
    name: row[5] ?? "",
    gender: row[6] ?? "",
    position: row[7] ?? "",
    dob: row[8] ?? "",
    mcuProvider: row[9] ?? "",
    visus: row[10] ?? "",
    bp: row[11] ?? "",
    lipid: row[12] ?? "",
    gdp: row[13] ?? "",
    bmi: row[14] ?? "",
    underweight: row[15] ?? "",
    lft: row[16] ?? "",
    smoking: row[17] ?? "",
  };
}

function recordToRow(record) {
  return [
    record.no,
    record.verifDate,
    record.mcuDate,
    record.company,
    record.employeeNumber,
    record.name,
    record.gender,
    record.position,
    record.dob,
    record.mcuProvider,
    record.visus,
    record.bp,
    record.lipid,
    record.gdp,
    record.bmi,
    record.underweight,
    record.lft,
    record.smoking,
  ];
}

function isDataRowEmpty(row) {
  const record = rowToRecord(row);
  return !record.employeeNumber && !record.name;
}

function findTargetRowIndex(rows, employeeNumber) {
  for (let i = HEADER_ROW; i < rows.length; i++) {
    const row = rows[i] || [];
    if ((row[4] || "").toString().trim() === employeeNumber) {
      return i;
    }
  }

  for (let i = HEADER_ROW; i < rows.length; i++) {
    const row = rows[i] || [];
    if (isDataRowEmpty(row)) {
      return i;
    }
  }

  return rows.length;
}

function uniqueBackupPath(fileName) {
  let dest = path.join(BACKUP_DIR, fileName);
  if (!fs.existsSync(dest)) return dest;

  const parsed = path.parse(fileName);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(BACKUP_DIR, `${parsed.name}_${stamp}${parsed.ext}`);
}

function moveProcessedPdfs(pdfFiles) {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const moved = [];
  for (const pdfFile of pdfFiles) {
    const src = path.join(PDF_DIR, pdfFile);
    if (!fs.existsSync(src)) continue;

    const dest = uniqueBackupPath(pdfFile);
    fs.renameSync(src, dest);
    moved.push({ file: pdfFile, backupName: path.basename(dest) });
  }
  return moved;
}

function preserveWorksheetMeta(
  worksheet,
  newWorksheet,
  rows,
  skipRowIndexes = null
) {
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");

  for (let row = range.s.r; row <= range.e.r; row++) {
    if (skipRowIndexes?.has(row)) continue;

    for (let col = range.s.c; col <= range.e.c; col++) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      if (worksheet[address] && !newWorksheet[address]) {
        newWorksheet[address] = worksheet[address];
      }
    }
  }

  if (worksheet["!cols"]) newWorksheet["!cols"] = worksheet["!cols"];
  if (worksheet["!rows"]) newWorksheet["!rows"] = worksheet["!rows"];
  if (worksheet["!merges"]) newWorksheet["!merges"] = worksheet["!merges"];

  const lastRow = rows.length;
  const lastCol = Math.max(...rows.map((row) => row.length), 24);
  newWorksheet["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: lastRow - 1, c: lastCol - 1 },
  });
}

function clearWorksheetRow(worksheet, rowIndex, colCount = 24) {
  for (let col = 0; col < colCount; col++) {
    const address = XLSX.utils.encode_cell({ r: rowIndex, c: col });
    worksheet[address] = { t: "s", v: "" };
  }
}

function writeWorkbook(workbook, sourcePath = resolveExcelOutputPath()) {
  try {
    XLSX.writeFile(workbook, sourcePath);
    if (sourcePath === EXCEL_FILE) {
      removeStaleFallbackCopy();
    }
    return { outputFile: sourcePath, isFallbackCopy: false };
  } catch (error) {
    if (error.code !== "EBUSY" && error.code !== "EPERM") {
      throw error;
    }

    const outputFile = getFallbackExcelPath();
    XLSX.writeFile(workbook, outputFile);
    return { outputFile, isFallbackCopy: true };
  }
}

function readWorksheetRows(excelPath = resolveExcelOutputPath()) {
  if (!fs.existsSync(excelPath)) {
    throw new Error(`File Excel tidak ditemukan: ${excelPath}`);
  }

  const workbook = XLSX.readFile(excelPath);
  if (!workbook.Sheets[TARGET_SHEET]) {
    throw new Error(`Sheet "${TARGET_SHEET}" tidak ditemukan di Excel.`);
  }

  const worksheet = workbook.Sheets[TARGET_SHEET];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  return { workbook, worksheet, rows, excelPath };
}

async function processAllPdfs({ moveToBackup = true } = {}) {
  ensureDirs();

  if (!fs.existsSync(EXCEL_FILE)) {
    throw new Error(`File Excel tidak ditemukan: ${EXCEL_FILE}`);
  }

  const pdfFiles = listPdfFiles();
  if (pdfFiles.length === 0) {
    throw new Error("Tidak ada file PDF di folder PDF FIle.");
  }

  const excelPath = resolveExcelOutputPath();
  const { workbook, worksheet, rows } = readWorksheetRows(excelPath);
  const results = [];
  const processedPdfs = [];

  for (const pdfFile of pdfFiles) {
    const pdfPath = path.join(PDF_DIR, pdfFile);
    try {
      const text = await extractPdfText(pdfPath);
      const extracted = extractFields(text, pdfFile);
      const targetRowIndex = findTargetRowIndex(rows, extracted.employeeNumber);
      const existingRow = rows[targetRowIndex] || [];
      const existingRecord = rowToRecord(existingRow);

      const updatedRecord = {
        ...existingRecord,
        ...extracted,
        no: existingRecord.no || targetRowIndex - HEADER_ROW + 1,
        verifDate: existingRecord.verifDate || VERIF_DATE_PLACEHOLDER,
      };

      rows[targetRowIndex] = recordToRow(updatedRecord);
      processedPdfs.push(pdfFile);

      results.push({
        file: pdfFile,
        status: "ok",
        employeeNumber: updatedRecord.employeeNumber,
        name: updatedRecord.name,
        excelRow: targetRowIndex + 1,
        bp: updatedRecord.bp,
        lipid: updatedRecord.lipid,
        gdp: updatedRecord.gdp,
      });
    } catch (error) {
      results.push({
        file: pdfFile,
        status: "skip",
        error: error.message,
      });
    }
  }

  if (processedPdfs.length === 0) {
    const details = results
      .filter((item) => item.status === "skip")
      .map((item) => `${item.file}: ${item.error}`)
      .join("; ");
    throw new Error(
      details
        ? `Tidak ada PDF yang berhasil diproses. ${details}`
        : "Tidak ada PDF yang berhasil diproses."
    );
  }

  const newWorksheet = XLSX.utils.aoa_to_sheet(rows);
  preserveWorksheetMeta(worksheet, newWorksheet, rows);
  workbook.Sheets[TARGET_SHEET] = newWorksheet;

  const { outputFile, isFallbackCopy } = writeWorkbook(workbook, excelPath);
  const moved = moveToBackup ? moveProcessedPdfs(processedPdfs) : [];

  return {
    results,
    processedCount: processedPdfs.length,
    skippedCount: results.filter((item) => item.status === "skip").length,
    outputFile,
    outputFileName: path.basename(outputFile),
    isFallbackCopy,
    moved,
  };
}

function deleteExcelRows(excelRows) {
  ensureDirs();
  const excelPath = resolveExcelOutputPath();
  const uniqueRows = [...new Set(excelRows.map(Number))].filter(
    (row) => row > HEADER_ROW
  );

  if (uniqueRows.length === 0) {
    throw new Error("Tidak ada baris valid untuk dihapus.");
  }

  const { workbook, worksheet, rows } = readWorksheetRows(excelPath);
  const deleted = [];
  const clearedRowIndexes = new Set();

  for (const excelRow of uniqueRows) {
    const index = excelRow - 1;
    if (index < HEADER_ROW || index >= rows.length) continue;

    const record = rowToRecord(rows[index]);
    if (!record.employeeNumber && !record.name) continue;

    rows[index] = recordToRow({});
    clearedRowIndexes.add(index);
    deleted.push({
      excelRow,
      employeeNumber: record.employeeNumber,
      name: record.name,
    });
  }

  if (deleted.length === 0) {
    throw new Error("Baris yang dipilih tidak berisi data.");
  }

  const newWorksheet = XLSX.utils.aoa_to_sheet(rows);
  for (const rowIndex of clearedRowIndexes) {
    clearWorksheetRow(newWorksheet, rowIndex);
  }
  preserveWorksheetMeta(worksheet, newWorksheet, rows, clearedRowIndexes);
  workbook.Sheets[TARGET_SHEET] = newWorksheet;

  const { outputFile, isFallbackCopy } = writeWorkbook(workbook, excelPath);

  return {
    deletedCount: deleted.length,
    deleted,
    outputFile,
    outputFileName: path.basename(outputFile),
    isFallbackCopy,
    preview: getExcelPreview(outputFile),
  };
}

function getExcelPreview(excelPath = resolveExcelOutputPath()) {
  const { rows, excelPath: resolvedPath } = readWorksheetRows(excelPath);
  const dataRows = rows
    .slice(HEADER_ROW)
    .map((row, index) => {
      const record = rowToRecord(row);
      if (!record.employeeNumber && !record.name) return null;
      return {
        excelRow: HEADER_ROW + index + 1,
        ...record,
      };
    })
    .filter(Boolean);

  return {
    sheet: TARGET_SHEET,
    headers: COLUMN_HEADERS,
    rows: dataRows,
    excelFile: path.basename(resolvedPath),
    excelPath: resolvedPath,
    totalRows: dataRows.length,
  };
}

function getStatus() {
  ensureDirs();
  const pdfs = listPdfFiles();
  const excelPath = resolveExcelOutputPath();
  const excelExists = fs.existsSync(excelPath);

  return {
    pendingPdfCount: pdfs.length,
    pendingPdfs: pdfs,
    excelExists,
    excelFile: excelExists ? path.basename(excelPath) : null,
    excelPath: excelExists ? excelPath : null,
    backupDir: BACKUP_DIR,
    pdfDir: PDF_DIR,
  };
}

module.exports = {
  extractPdfText,
  extractFields,
  processAllPdfs,
  getExcelPreview,
  deleteExcelRows,
  getStatus,
  listPdfFiles,
  resolveExcelOutputPath,
};
