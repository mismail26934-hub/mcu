import { NextRequest, NextResponse } from "next/server";
import { deleteExcelRows } from "@/lib/mcu-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const excelRows = body?.excelRows;

    if (!Array.isArray(excelRows) || excelRows.length === 0) {
      return NextResponse.json(
        { error: "Pilih minimal 1 baris untuk dihapus." },
        { status: 400 }
      );
    }

    const result = deleteExcelRows(excelRows);
    return NextResponse.json({
      message: `${result.deletedCount} baris dihapus dari Excel.`,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menghapus baris.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
