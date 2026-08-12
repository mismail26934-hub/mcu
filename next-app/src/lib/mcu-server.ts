import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const extract = require("./extract");
const paths = require("./paths");

export const {
  processAllPdfs,
  getExcelPreview,
  deleteExcelRows,
  getStatus,
  resolveExcelOutputPath,
} = extract;

export const { PDF_DIR, ensureDirs } = paths;
