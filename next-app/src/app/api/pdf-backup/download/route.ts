import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { resolveBackupPdfPath } from "@/lib/pdf-backup";

export async function GET(request: NextRequest) {
  try {
    const fileName = request.nextUrl.searchParams.get("file");
    if (!fileName) {
      return NextResponse.json(
        { error: "Parameter file wajib diisi." },
        { status: 400 }
      );
    }

    const fullPath = resolveBackupPdfPath(fileName);
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: "File PDF tidak ditemukan." },
        { status: 404 }
      );
    }

    const buffer = fs.readFileSync(fullPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${path.basename(fullPath)}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Download gagal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
