import { NextRequest, NextResponse } from "next/server";
import { deleteBackupPdfs } from "@/lib/pdf-backup";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const files = body?.files;

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "Pilih minimal 1 file PDF backup untuk dihapus." },
        { status: 400 }
      );
    }

    const result = deleteBackupPdfs(files);
    return NextResponse.json({
      message: `${result.deletedCount} file dihapus dari PDF-backup.`,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menghapus file backup.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
