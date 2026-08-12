import { NextRequest, NextResponse } from "next/server";
import { ensureDirs, getStatus } from "@/lib/mcu-server";
import { saveUploadedPdf } from "@/lib/upload";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_UPLOAD_FILES,
  MAX_UPLOAD_MB,
} from "@/lib/config";

ensureDirs();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const entries = formData.getAll("pdfs");

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "Pilih minimal 1 file PDF." },
        { status: 400 }
      );
    }

    if (entries.length > MAX_UPLOAD_FILES) {
      return NextResponse.json(
        { error: `Maksimal ${MAX_UPLOAD_FILES} file per upload.` },
        { status: 400 }
      );
    }

    const files: Array<{
      originalName: string;
      savedAs: string;
      size: number;
    }> = [];

    for (const entry of entries) {
      if (!(entry instanceof File)) continue;

      if (!entry.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          { error: "Hanya file PDF yang diizinkan." },
          { status: 400 }
        );
      }

      if (entry.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `Ukuran file melebihi ${MAX_UPLOAD_MB} MB.` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await entry.arrayBuffer());
      const savedAs = saveUploadedPdf(entry.name, buffer);

      files.push({
        originalName: entry.name,
        savedAs,
        size: entry.size,
      });
    }

    return NextResponse.json({
      message: `${files.length} PDF berhasil diupload.`,
      files,
      status: getStatus(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan upload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
