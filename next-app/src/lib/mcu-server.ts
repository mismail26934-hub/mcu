import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Reuse extraction logic from the root Express app.
const extract = require("../../../lib/extract") as typeof import("../../../lib/extract");
const paths = require("../../../lib/paths") as typeof import("../../../lib/paths");

export const {
  processAllPdfs,
  getExcelPreview,
  deleteExcelRows,
  getStatus,
  resolveExcelOutputPath,
} = extract;

export const { PDF_DIR, ensureDirs } = paths;
