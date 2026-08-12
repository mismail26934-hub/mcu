import { NextResponse } from "next/server";
import { getExcelPreview } from "@/lib/mcu-server";

export async function GET() {
  try {
    return NextResponse.json(getExcelPreview());
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Preview tidak tersedia.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
