/**
 * Ekstrak field dari PDF MCU (Trakindo/Tirta) ke Excel
 * Usage: node extract-mcu-to-excel.js
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.mjs");

const HELP_DIR = __dirname;
const PDF_DIR = path.join(HELP_DIR, "PDF FIle");
const BACKUP_DIR = path.join(HELP_DIR, "PDF-backup");
const EXCEL_DIR = path.join(HELP_DIR, "Excel File");
const EXCEL_FILE = path.join(EXCEL_DIR, "NEW List Pengajuan Verifikasi MCU KPC.xlsx");
const TARGET_SHEET = "CONTOH";
const HEADER_ROW = 7; // baris header kolom data (1-based)
const MCU_PROVIDER = "TIRTA MEDICAL CENTRE";
const VERIF_DATE_PLACEHOLDER = "diisi KPC";

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

  console.log(`\nMemindahkan ${pdfFiles.length} PDF ke PDF-backup...`);
  for (const pdfFile of pdfFiles) {
    const src = path.join(PDF_DIR, pdfFile);
    if (!fs.existsSync(src)) continue;

    const dest = uniqueBackupPath(pdfFile);
    fs.renameSync(src, dest);
    console.log(`  [MOVED] ${pdfFile} -> ${path.basename(dest)}`);
  }
}

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

async function extractPdfText(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  let text = "";

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(" ") + "\n";
  }

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

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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
  const glassesMatch = firstMatch(text, [/Memakai Kacamata Sehari-hari\s+(\w+)/i]);
  const bpMatch = firstMatch(text, [/Sistol\s+(\d+)\s*mmHg\s+Diastol\s+(\d+)\s*mmHg/i]);
  const cholesterolMatch = firstMatch(text, [/Cholesterol\s+(\d+)\s*mg\/dL/i]);
  const triglycerideMatch = firstMatch(text, [/Trigliserid\s+(\d+)\s*mg\/dL/i]);
  const glucoseMatch = firstMatch(text, [/Estimated Average Glucose \(eAG\)\s+(\d+(?:[.,]\d+)?)/i]);
  const bmiMatch = firstMatch(text, [/BMI\s+(\d+(?:[.,]\d+)?)/i]);
  const sgptMatch = firstMatch(text, [/SGPT\s+(\d+)\s*U\/L/i]);
  const sgotMatch = firstMatch(text, [/SGOT\s+(\d+)\s*U\/L/i]);
  const smokingMatch = firstMatch(text, [/Merokok\s+(.+?)\s+Alkohol/i]);

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

async function main() {
  if (!fs.existsSync(EXCEL_FILE)) {
    console.error(`File Excel tidak ditemukan: ${EXCEL_FILE}`);
    process.exit(1);
  }

  if (!fs.existsSync(PDF_DIR)) {
    console.error(`Folder PDF tidak ditemukan: ${PDF_DIR}`);
    process.exit(1);
  }

  const pdfFiles = fs
    .readdirSync(PDF_DIR)
    .filter((file) => file.toLowerCase().endsWith(".pdf"))
    .sort();

  if (pdfFiles.length === 0) {
    console.error(`Tidak ada file PDF di folder: ${PDF_DIR}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(EXCEL_FILE);
  if (!workbook.Sheets[TARGET_SHEET]) {
    console.error(`Sheet "${TARGET_SHEET}" tidak ditemukan di Excel.`);
    process.exit(1);
  }

  const worksheet = workbook.Sheets[TARGET_SHEET];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  console.log(`Memproses ${pdfFiles.length} file PDF...\n`);

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

      console.log(`[OK] ${pdfFile}`);
      console.log(`     E/N: ${updatedRecord.employeeNumber}`);
      console.log(`     Nama: ${updatedRecord.name}`);
      console.log(`     Baris Excel: ${targetRowIndex + 1}`);
      console.log(
        `     BP: ${updatedRecord.bp} | Lipid: ${updatedRecord.lipid} | GDP: ${updatedRecord.gdp}`
      );
      console.log("");
    } catch (error) {
      console.error(`[SKIP] ${pdfFile}: ${error.message}\n`);
    }
  }

  if (processedPdfs.length === 0) {
    console.error("Tidak ada PDF yang berhasil diproses.");
    process.exit(1);
  }

  const newWorksheet = XLSX.utils.aoa_to_sheet(rows);
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");

  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const oldAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const newAddress = oldAddress;
      if (worksheet[oldAddress] && !newWorksheet[newAddress]) {
        newWorksheet[newAddress] = worksheet[oldAddress];
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

  workbook.Sheets[TARGET_SHEET] = newWorksheet;

  let outputFile = EXCEL_FILE;
  try {
    XLSX.writeFile(workbook, EXCEL_FILE);
  } catch (error) {
    if (error.code !== "EBUSY" && error.code !== "EPERM") {
      throw error;
    }

    const parsed = path.parse(EXCEL_FILE);
    outputFile = path.join(
      parsed.dir,
      `${parsed.name} - updated${parsed.ext}`
    );
    XLSX.writeFile(workbook, outputFile);
    console.log(
      "File Excel sedang dibuka. Hasil disimpan ke salinan baru:\n"
    );
  }

  console.log(`Selesai. Data ditulis ke sheet "${TARGET_SHEET}" pada:`);
  console.log(outputFile);
  if (outputFile !== EXCEL_FILE) {
    console.log(
      "\nCatatan: Tutup file Excel asli, lalu ganti/rename file salinan di atas."
    );
  }

  moveProcessedPdfs(processedPdfs);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
