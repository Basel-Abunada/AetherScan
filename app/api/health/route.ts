import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "AetherScan demo backend",
    timestamp: new Date().toISOString(),
  })
}
