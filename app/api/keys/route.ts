import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import staticKeys from "@/public/data/api_keys.json";

function generateKey(): { full: string; preview: string } {
  const raw = randomBytes(24).toString("base64url");
  return {
    full: `sk-aurora-${raw}`,
    preview: `sk-...${raw.slice(-4)}`,
  };
}

// Session-scoped additions. Persists within one serverless instance lifetime.
// Replace with @vercel/kv or the Aurora platform /api/auth/keys once JWT exchange is available.
const sessionKeys: Array<{
  id: string;
  name: string;
  key_preview: string;
  scope: string;
  created_at: string;
  last_used: string;
  expires_at: string | null;
  revoked: boolean;
}> = [];

const revokedIds = new Set<string>();

export async function GET() {
  const base = staticKeys.map((k) => ({ ...k, revoked: revokedIds.has(k.id) }));
  return NextResponse.json([...base, ...sessionKeys.filter((k) => !k.revoked)]);
}

export async function POST(request: NextRequest) {
  let body: { name?: string; scope?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const scope = body.scope ?? "personal";
  const { full, preview } = generateKey();
  const id = `key-${randomBytes(8).toString("hex")}`;

  const entry = {
    id,
    name,
    key_preview: preview,
    scope,
    created_at: new Date().toISOString(),
    last_used: new Date().toISOString(),
    expires_at: null,
    revoked: false,
  };

  sessionKeys.push(entry);

  // key is returned once only — caller must save it immediately.
  return NextResponse.json({ ...entry, key: full }, { status: 201 });
}
