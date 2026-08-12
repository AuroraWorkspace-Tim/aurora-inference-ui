import { NextRequest, NextResponse } from "next/server";
import staticKeys from "@/public/data/api_keys.json";

// This revocation set is session-scoped (same serverless instance lifetime as the GET/POST handler).
// Replace with @vercel/kv or Aurora platform API once JWT exchange is available.
const revokedIds = new Set<string>();

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const existsInStatic = staticKeys.some((k) => k.id === id);
  if (!existsInStatic) {
    // Dynamic keys created this session aren't accessible here across the module boundary.
    // Full persistence requires @vercel/kv or the Aurora platform key API.
    return NextResponse.json({ error: "key not found" }, { status: 404 });
  }

  revokedIds.add(id);
  return NextResponse.json({ ok: true });
}
