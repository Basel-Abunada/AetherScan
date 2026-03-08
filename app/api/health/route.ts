import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "AetherScan backend",
    timestamp: new Date().toISOString(),
  })
}
