import { NextResponse } from "next/server";
import { getFoundationStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    service: "metnisa",
    status: "ok",
    sprint: 0,
    integrations: getFoundationStatus(),
    timestamp: new Date().toISOString(),
  });
}
