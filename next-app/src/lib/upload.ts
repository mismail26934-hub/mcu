import fs from "node:fs";
import path from "node:path";
import { PDF_DIR } from "@/lib/mcu-server";

export function saveUploadedPdf(originalName: string, buffer: Buffer): string {
  const safeName = path.basename(originalName);
  const target = path.join(PDF_DIR, safeName);

  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, buffer);
    return safeName;
  }

  const parsed = path.parse(safeName);
  const stamped = `${parsed.name}_${Date.now()}${parsed.ext}`;
  fs.writeFileSync(path.join(PDF_DIR, stamped), buffer);
  return stamped;
}
