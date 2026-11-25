import { NextResponse } from "next/server";

/**
 * Site-assessment requests from the marketing page.
 * TODO: forward to the backend `/leads` endpoint (or email ops) once the API exists.
 */
export async function POST(req: Request) {
  const data = await req.json().catch(() => null);
  if (!data?.organisation || !data?.phone) {
    return NextResponse.json({ error: "Organisation and phone are required." }, { status: 400 });
  }
  console.log("[lead]", { ...data, receivedAt: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
