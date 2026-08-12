import { NextResponse } from "next/server";
import { getExcelPreview, processAllPdfs } from "@/lib/mcu-server";

export async function POST() {
  try {
    const result = await processAllPdfs({ moveToBackup: true });
    return NextResponse.json({
      message: `Selesai. ${result.processedCount} PDF diproses.`,
      ...result,
      preview: getExcelPreview(result.outputFile),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memproses PDF.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
