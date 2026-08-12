import { NextResponse } from "next/server";

const DO_BASE = "https://inference.do-ai.run/v1";

export async function GET() {
  const key = process.env.DO_MODEL_KEY;
  if (!key) {
    return NextResponse.json({ error: "DO_MODEL_KEY not configured" }, { status: 500 });
  }

  const upstream = await fetch(`${DO_BASE}/models`, {
    headers: { Authorization: `Bearer ${key}` },
    next: { revalidate: 300 },
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return NextResponse.json(
      { error: "upstream error", detail: text },
      { status: upstream.status }
    );
  }

  const data = await upstream.json();
  return NextResponse.json(data);
}
