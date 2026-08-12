import { NextRequest, NextResponse } from "next/server";

const DO_BASE = "https://inference.do-ai.run/v1";

export async function POST(req: NextRequest) {
  const key = process.env.DO_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "DO_API_KEY not configured" }, { status: 500 });
  }

  const body = await req.json();

  const upstream = await fetch(`${DO_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return NextResponse.json(
      { error: "upstream error", detail: text },
      { status: upstream.status }
    );
  }

  // Pass the SSE stream straight through to the client
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
