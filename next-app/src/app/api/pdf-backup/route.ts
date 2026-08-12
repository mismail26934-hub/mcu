import { NextResponse } from "next/server";
import { listBackupPdfs } from "@/lib/pdf-backup";

export async function GET() {
  const files = listBackupPdfs();
  return NextResponse.json({
    count: files.length,
    files,
  });
}
