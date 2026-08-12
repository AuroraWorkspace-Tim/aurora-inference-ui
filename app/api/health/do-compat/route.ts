import { NextResponse } from 'next/server';

/**
 * Probes DO inference endpoint for stream_options.include_usage support.
 *
 * A single-token request is sent with stream_options.include_usage=true.
 * If the SSE stream contains a [DONE] chunk preceded by a usage chunk, DO
 * honours the flag and token-based billing will work. If usage is absent,
 * streaming requests are served but never billed.
 *
 * GET /api/health/do-compat
 */
export async function GET() {
  const doKey = process.env.DO_MODEL_KEY;

  if (!doKey) {
    return NextResponse.json({ error: 'DO_MODEL_KEY not set' }, { status: 500 });
  }

  try {
    const res = await fetch('https://inference.do-ai.run/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-v4-flash',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
        stream: true,
        stream_options: { include_usage: true },
      }),
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ compatible: false, error: `DO returned ${res.status}` }, { status: 200 });
    }

    const text = await res.text();
    const hasUsage = text.includes('"usage"') && text.includes('"prompt_tokens"');

    if (!hasUsage) {
      console.warn('[do-compat] stream_options.include_usage ignored by DO — missing_usage_compat');
    }

    return NextResponse.json({
      compatible: hasUsage,
      warning: hasUsage ? null : 'DO ignored stream_options.include_usage; streaming requests will not report token usage',
    });
  } catch (err) {
    return NextResponse.json({ compatible: false, error: String(err) }, { status: 200 });
  }
}
