import { NextResponse } from "next/server";

const DO_BASE = "https://inference.do-ai.run/v1";

type DoModel = {
  id: string;
  owned_by?: string;
  // DO extended pricing fields — either nested or flat, converted to per-1k on output
  pricing?: { input?: number; output?: number };
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  context_length?: number;
  modality?: string;
  description?: string;
  tags?: string[];
};

type NormalizedModel = {
  id: string;
  name: string;
  provider: string;
  modality: string;
  context_length: number;
  price_per_1k_input: number;
  price_per_1k_output: number;
  description: string;
  tags: string[];
};

function perTokenToPerK(v: number | undefined): number {
  return v ? v * 1000 : 0;
}

function normalize(m: DoModel): NormalizedModel {
  const price_per_1k_input =
    perTokenToPerK(m.pricing?.input) || perTokenToPerK(m.input_cost_per_token);
  const price_per_1k_output =
    perTokenToPerK(m.pricing?.output) || perTokenToPerK(m.output_cost_per_token);

  const [org, ...rest] = m.id.split("/");
  return {
    id: m.id,
    name: rest.length ? rest.join("/") : m.id,
    provider: m.owned_by ?? org,
    modality: m.modality ?? "text",
    context_length: m.context_length ?? 0,
    price_per_1k_input,
    price_per_1k_output,
    description: m.description ?? "",
    tags: m.tags ?? [],
  };
}

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

  const raw = await upstream.json();
  const doModels: DoModel[] = raw.data ?? [];
  const models = doModels.map(normalize);

  // stream_options.include_usage probe — gates Phase 2 billing integration
  probeStreamUsage(key).catch(() => {});

  return NextResponse.json({ object: "list", data: models });
}

async function probeStreamUsage(key: string) {
  const res = await fetch(`${DO_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/Llama-3.1-8B-Instruct",
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 1,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });

  if (!res.ok) return;
  const text = await res.text();
  const hasUsage = text.includes('"usage"');
  if (!hasUsage) {
    console.warn("[aurora] missing_usage_compat: DO ignored stream_options.include_usage");
  }
}
