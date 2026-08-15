#!/usr/bin/env node
/**
 * Generates public/data/models.json from public/data/do-model-catalog.json.
 *
 * Run via:  npm run catalog:generate
 *
 * Transformations applied:
 *   - 4 router pseudo-models are excluded (ROUTER_IDS)
 *   - per-token pricing → per-1k-token pricing (× 1000)
 *   - do_owned_by + model-id prefix → human-readable provider name
 *   - output_modalities[0] → modality (embedding/score → "text")
 *   - supported_features → tags (vision, caching, tools, reasoning, …)
 *   - context_length zeroed for image/video/embedding models
 *   - Descriptions are preserved from the existing models.json for known
 *     models; new models receive a generated placeholder description.
 *   - context_length is preserved from the existing models.json when the
 *     catalog entry carries null (e.g. kimi-k3).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../public/data');

// ── Router pseudo-models excluded from the UI catalog ──────────────────────
const ROUTER_IDS = new Set([
  'router:general',
  'router:knowledge-base-document',
  'router:software-engineering',
  'router:writing',
]);

// ── Provider name resolution ────────────────────────────────────────────────
// For models where do_owned_by === 'digitalocean', derive the actual provider
// from the model ID prefix. Order matters: more-specific prefixes first.
const PROVIDER_PREFIXES = [
  ['openai-gpt-oss-', 'DigitalOcean'], // DO-hosted OSS GPT variants
  ['alibaba-',        'Alibaba/Qwen'],
  ['arcee-',          'Arcee'],
  ['all-mini',        'sentence-transformers'],
  ['bge-',            'BAAI'],
  ['deepseek-',       'DeepSeek'],
  ['e5-',             'intfloat'],
  ['gemma-',          'Google'],
  ['glm-',            'Z.ai'],
  ['gte-',            'Alibaba/Qwen'],
  ['kimi-',           'Moonshot AI'],
  ['llama',           'Meta'],
  ['mimo-',           'Xiaomi'],
  ['minimax-',        'MiniMax'],
  ['mistral-',        'Mistral AI'],
  ['multi-qa-',       'sentence-transformers'],
  ['nemotron-',       'NVIDIA'],
  ['nvidia-',         'NVIDIA'],
  ['qwen',            'Alibaba/Qwen'],
  ['stable-diffusion-', 'Stability AI'],
  ['wan2-',           'Alibaba'],
];

function resolveProvider(id, doOwnedBy) {
  if (doOwnedBy === 'anthropic') return 'Anthropic';
  // openai do_owned_by covers real OpenAI models; openai-gpt-oss-* are DO-hosted
  if (doOwnedBy === 'openai' && !id.startsWith('openai-gpt-oss-')) return 'OpenAI';
  for (const [prefix, name] of PROVIDER_PREFIXES) {
    if (id.startsWith(prefix)) return name;
  }
  return doOwnedBy; // fallback: raw value from catalog
}

// ── Modality resolution ─────────────────────────────────────────────────────
// The catalog uses 'embedding' and 'score' as output modalities; the UI treats
// these as 'text' for display purposes.
const MODALITY_MAP = { embedding: 'text', score: 'text' };

function resolveModality(outputModalities) {
  const raw = (outputModalities ?? ['text'])[0] ?? 'text';
  return MODALITY_MAP[raw] ?? raw;
}

// ── Context length resolution ───────────────────────────────────────────────
// Image and video models report prompt chars/frames, not token counts — zero
// them out so the UI does not display a misleading "Xk ctx" badge.
// Embedding/score models have no meaningful context window for the user.
// If the catalog carries null for a text model we fall back to the preserved
// value from the existing models.json (passed in as existingCtx).
function resolveContextLength(m, existingCtx) {
  const out = (m.output_modalities ?? [])[0];
  if (out === 'image' || out === 'video' || out === 'embedding' || out === 'score') {
    return 0;
  }
  if (m.context_length == null) {
    return existingCtx ?? 0;
  }
  return m.context_length;
}

// ── Tag derivation ──────────────────────────────────────────────────────────
function resolveTags(m) {
  const features = m.supported_features ?? [];
  const id = m.id.toLowerCase();
  const out = (m.output_modalities ?? [])[0];

  if (out === 'image')              return ['image-generation'];
  if (out === 'video')              return ['video-generation'];
  if (out === 'embedding' || out === 'score') return ['embedding'];

  const tags = [];

  if (features.includes('vision'))          tags.push('vision');
  if (features.includes('prompt_caching'))  tags.push('caching');
  if (features.includes('function_calling')) tags.push('tools');

  // Reasoning / thinking models
  if (
    id.includes('thinking') ||
    id.includes('-r1')       ||
    /openai-o\d/.test(id)   ||
    (id.startsWith('openai-o') && /openai-o\d/.test(id))
  ) {
    tags.push('reasoning');
  }

  // Code-specialised models
  if (id.includes('coder') || id.includes('codex')) tags.push('code');

  // Long-context: ≥ 1 M tokens
  if ((m.context_length ?? 0) >= 1_000_000) tags.push('long-context');

  // Fast / lightweight variants
  const isFast =
    id.includes('flash')   ||
    id.includes('nano')    ||
    id.includes('mini')    || // covers: mini, minimax-m2.5, all-mini-lm (but those exit early above)
    id.includes('haiku')   ||
    id.includes('-small');
  if (isFast) tags.push('fast');

  return tags;
}

// ── Description generation for brand-new models ────────────────────────────
function generateDescription(m, provider, modality, tags) {
  if (modality === 'image') return `${provider}'s image generation model.`;
  if (modality === 'video') return `${provider}'s text-to-video generation model.`;
  if (modality === 'audio') return `${provider}'s text-to-speech synthesis model.`;
  if (tags.includes('embedding')) {
    return `${provider}'s text embedding model for semantic search and similarity tasks.`;
  }

  const capabilities = [];
  if (tags.includes('vision'))    capabilities.push('vision');
  if (tags.includes('tools'))     capabilities.push('tool use');
  if (tags.includes('reasoning')) capabilities.push('advanced reasoning');
  if (tags.includes('code'))      capabilities.push('code generation');
  if (tags.includes('caching'))   capabilities.push('prompt caching');

  const ctx = m.context_length ?? 0;
  const ctxLabel = ctx >= 1000 ? `${Math.round(ctx / 1000)}k context` : '';

  const parts = [`${provider}'s ${m.name}`];
  if (capabilities.length) parts.push(`with ${capabilities.join(', ')}`);
  if (ctxLabel)            parts.push(ctxLabel);

  return parts.join(' ') + '.';
}

// ── Main ────────────────────────────────────────────────────────────────────
const catalog = JSON.parse(readFileSync(join(DATA_DIR, 'do-model-catalog.json'), 'utf8'));

// Preserve hand-crafted descriptions, manually-corrected context lengths, and
// manually-set pricing (for models where the catalog carries null) from the
// current models.json so a re-run does not discard prior work.
let existingDescriptions    = new Map();
let existingContextLengths  = new Map();
let existingInputPrices     = new Map();
let existingOutputPrices    = new Map();
let existingCacheReadPrices = new Map();
let existingMaxOutputTokens = new Map();
try {
  const existing = JSON.parse(readFileSync(join(DATA_DIR, 'models.json'), 'utf8'));
  for (const m of existing) {
    if (m.description)                 existingDescriptions.set(m.id, m.description);
    existingContextLengths.set(m.id,   m.context_length);
    existingInputPrices.set(m.id,      m.price_per_1k_input);
    existingOutputPrices.set(m.id,     m.price_per_1k_output);
    existingCacheReadPrices.set(m.id,  m.price_per_1k_cache_read);
    existingMaxOutputTokens.set(m.id,  m.max_output_tokens);
  }
} catch {
  // First run — no existing file; that's fine.
}

const models = catalog.models
  .filter((m) => !ROUTER_IDS.has(m.id))
  .map((m) => {
    const provider = resolveProvider(m.id, m.do_owned_by);
    const modality  = resolveModality(m.output_modalities);
    const tags      = resolveTags(m);
    const contextLength = resolveContextLength(m, existingContextLengths.get(m.id));

    const description =
      existingDescriptions.get(m.id) ??
      generateDescription(m, provider, modality, tags);

    // Use catalog pricing where available; fall back to preserved value when
    // the catalog carries null (e.g. image models with unknown completion cost).
    const priceInput =
      m.pricing?.prompt     != null
        ? parseFloat(m.pricing.prompt)     * 1000
        : (existingInputPrices.get(m.id)   ?? 0);
    const priceOutput =
      m.pricing?.completion != null
        ? parseFloat(m.pricing.completion) * 1000
        : (existingOutputPrices.get(m.id)  ?? 0);
    const priceCacheRead =
      m.pricing?.input_cache_read != null
        ? parseFloat(m.pricing.input_cache_read) * 1000
        : (existingCacheReadPrices.get(m.id) ?? 0);
    const maxOutputTokens =
      m.max_output_tokens != null
        ? m.max_output_tokens
        : (existingMaxOutputTokens.get(m.id) ?? 0);

    return {
      id:                    m.id,
      name:                  m.name,
      provider,
      modality,
      context_length:        contextLength,
      max_output_tokens:     maxOutputTokens,
      price_per_1k_input:    priceInput,
      price_per_1k_output:   priceOutput,
      price_per_1k_cache_read: priceCacheRead,
      description,
      tags,
    };
  });

writeFileSync(
  join(DATA_DIR, 'models.json'),
  JSON.stringify(models, null, 2) + '\n',
);

console.log(
  `Generated ${models.length} models ` +
  `(${catalog.models.length} catalog entries, ${ROUTER_IDS.size} routers excluded).`,
);
