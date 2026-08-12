import { NextResponse } from "next/server";
import { ensureDirs, getStatus } from "@/lib/mcu-server";

ensureDirs();

export async function GET() {
  return NextResponse.json(getStatus());
}
