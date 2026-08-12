import { NextResponse } from 'next/server';
import staticModels from '@/public/data/models.json';

type AuroraModel = {
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

type DoModel = {
  id: string;
  context_length?: number;
  [key: string]: unknown;
};

function slugFromId(doId: string): string {
  return (doId.split('/').pop() ?? doId).toLowerCase();
}

function nameFromId(doId: string): string {
  return slugFromId(doId)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function providerFromId(doId: string): string {
  const p = doId.split('/')[0];
  return p.charAt(0).toUpperCase() + p.slice(1);
}

// Static data indexed by slug for field backfill (pricing, description, tags, modality)
const staticBySlug = new Map(
  staticModels.map((m) => [m.name.toLowerCase().replace(/\s+/g, '-'), m])
);

// Also index by provider/slug pattern (e.g. "deepseek-v4-flash")
staticModels.forEach((m) => {
  staticBySlug.set(m.name.toLowerCase().replace(/[\s/]+/g, '-'), m);
});

function merge(doModel: DoModel): AuroraModel {
  const slug = slugFromId(doModel.id);
  const s = staticBySlug.get(slug);
  return {
    id: doModel.id,
    name: s?.name ?? nameFromId(doModel.id),
    provider: s?.provider ?? providerFromId(doModel.id),
    modality: s?.modality ?? 'text',
    context_length: doModel.context_length ?? s?.context_length ?? 0,
    price_per_1k_input: s?.price_per_1k_input ?? 0,
    price_per_1k_output: s?.price_per_1k_output ?? 0,
    description: s?.description ?? '',
    tags: s?.tags ?? [],
  };
}

export async function GET() {
  const doKey = process.env.DO_MODEL_KEY;

  if (!doKey) {
    return NextResponse.json(staticModels, {
      headers: { 'X-Data-Source': 'static', 'X-Fallback-Reason': 'no-key' },
    });
  }

  try {
    const res = await fetch('https://inference.do-ai.run/v1/models', {
      headers: { Authorization: `Bearer ${doKey}` },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      throw new Error(`DO /v1/models returned ${res.status}`);
    }

    const body = await res.json();
    const doModels: DoModel[] | null = Array.isArray(body.data) ? body.data : null;

    if (!doModels || doModels.length === 0) {
      console.warn('[api/models] DO returned no models; serving static fallback');
      return NextResponse.json(staticModels, {
        headers: { 'X-Data-Source': 'static', 'X-Fallback-Reason': 'empty-response' },
      });
    }

    const models = doModels.map(merge);

    return NextResponse.json(models, {
      headers: {
        'X-Data-Source': 'do-live',
        'X-Model-Count': String(models.length),
      },
    });
  } catch (err) {
    console.error('[api/models] DO fetch failed, serving static fallback:', err);
    return NextResponse.json(staticModels, {
      headers: { 'X-Data-Source': 'static', 'X-Fallback-Reason': 'do-error' },
    });
  }
}
