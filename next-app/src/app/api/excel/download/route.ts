import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { resolveExcelOutputPath } from "@/lib/mcu-server";

export async function GET() {
  try {
    const excelPath = resolveExcelOutputPath();
    if (!fs.existsSync(excelPath)) {
      return NextResponse.json(
        { error: "File Excel belum tersedia." },
        { status: 404 }
      );
    }

    const buffer = fs.readFileSync(excelPath);
    const fileName = path.basename(excelPath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Download gagal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
