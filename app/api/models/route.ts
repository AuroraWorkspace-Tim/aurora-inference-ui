import { NextResponse } from "next/server";
import staticModels from "@/public/data/models.json";

interface AuroraModel {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  input_modalities?: string[];
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  supported_features?: string[];
}

interface AuroraModelsResponse {
  object: string;
  data: AuroraModel[];
}

function deriveModality(model: AuroraModel): string {
  const modalities = model.input_modalities ?? [];
  if (modalities.includes("image") && modalities.includes("text")) return "image";
  if (modalities.includes("audio")) return "audio";
  if (modalities.includes("video")) return "video";
  const features = model.supported_features ?? [];
  if (features.includes("image_generation")) return "image";
  const id = model.id.toLowerCase();
  if (id.includes("flux") || id.includes("stable-diffusion") || id.includes("sdxl")) return "image";
  if (id.includes("whisper") || id.includes("moshi")) return "audio";
  if (id.includes("cog") || id.includes("video")) return "video";
  if (id.includes("code") || id.includes("qwen2.5-coder")) return "code";
  return "text";
}

function perTokenToPerThousand(perToken: string | undefined): number {
  if (!perToken) return 0;
  return parseFloat(perToken) * 1000;
}

function deriveTags(model: AuroraModel): string[] {
  const tags: string[] = [];
  const features = model.supported_features ?? [];
  if (features.includes("reasoning")) tags.push("reasoning");
  if (features.includes("tools")) tags.push("tools");
  if (features.includes("json_mode")) tags.push("json_mode");
  if (features.includes("structured_outputs")) tags.push("structured_outputs");
  if (features.includes("logprobs")) tags.push("logprobs");
  const id = model.id.toLowerCase();
  if (id.includes("fast") || id.includes("flash")) tags.push("fast");
  if (id.includes("long") || (model.context_length ?? 0) >= 100000) tags.push("long-context");
  if (id.includes("open") || id.includes("llama") || id.includes("mistral") || id.includes("gemma")) tags.push("open-source");
  return tags.slice(0, 4);
}

function deriveProvider(model: AuroraModel): string {
  const id = model.id;
  const parts = id.split("/");
  if (parts.length >= 2) {
    const org = parts[0];
    const orgMap: Record<string, string> = {
      deepseek: "DeepSeek",
      meta: "Meta",
      "meta-llama": "Meta",
      mistralai: "Mistral AI",
      qwen: "Alibaba Cloud",
      google: "Google",
      microsoft: "Microsoft",
      "black-forest-labs": "Black Forest Labs",
      "stability-ai": "Stability AI",
      openai: "OpenAI",
      "01-ai": "01.AI",
      anthropic: "Anthropic",
      kyutai: "Kyutai",
      "zhipu-ai": "Zhipu AI",
    };
    return orgMap[org.toLowerCase()] ?? org;
  }
  return id;
}

export async function GET() {
  const key = process.env.AURORA_API_KEY;
  if (!key) {
    return NextResponse.json(staticModels);
  }

  try {
    const res = await fetch("https://ai.aur.lu/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(staticModels);
    }

    const body: AuroraModelsResponse = await res.json();
    const liveModels = body.data ?? [];

    const transformed = liveModels.map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      provider: deriveProvider(m),
      modality: deriveModality(m),
      context_length: m.context_length ?? 0,
      price_per_1k_input: perTokenToPerThousand(m.pricing?.prompt),
      price_per_1k_output: perTokenToPerThousand(m.pricing?.completion),
      description: m.description ?? "",
      tags: deriveTags(m),
    }));

    return NextResponse.json(transformed.length > 0 ? transformed : staticModels);
  } catch {
    return NextResponse.json(staticModels);
  }
}
