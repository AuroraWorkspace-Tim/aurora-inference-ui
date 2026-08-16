import { NextResponse } from "next/server";

const DO_API_BASE = "https://api.digitalocean.com/v2";

function doHeaders(key: string) {
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export async function GET() {
  const key = process.env.DO_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "DO_API_KEY not configured" },
      { status: 500 }
    );
  }

  const headers = doHeaders(key);

  let balanceRes: Response;
  let invoicesRes: Response;
  try {
    [balanceRes, invoicesRes] = await Promise.all([
      fetch(`${DO_API_BASE}/customers/my/balance`, { headers, next: { revalidate: 300 } }),
      fetch(`${DO_API_BASE}/customers/my/invoices`, { headers, next: { revalidate: 300 } }),
    ]);
  } catch (err) {
    return NextResponse.json(
      { error: "network error contacting DigitalOcean", detail: err instanceof Error ? err.message : "unknown" },
      { status: 502 }
    );
  }

  if (!balanceRes.ok) {
    const text = await balanceRes.text();
    return NextResponse.json(
      { error: "balance fetch failed", detail: text },
      { status: balanceRes.status }
    );
  }
  if (!invoicesRes.ok) {
    const text = await invoicesRes.text();
    return NextResponse.json(
      { error: "invoices fetch failed", detail: text },
      { status: invoicesRes.status }
    );
  }

  let balance: unknown;
  let invoicesData: unknown;
  try {
    [balance, invoicesData] = await Promise.all([
      balanceRes.json(),
      invoicesRes.json(),
    ]);
  } catch (err) {
    return NextResponse.json(
      { error: "failed to parse DigitalOcean response", detail: err instanceof Error ? err.message : "unknown" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    balance,
    invoices: (invoicesData as { invoices?: unknown[] }).invoices ?? [],
    invoice_preview: (invoicesData as { invoice_preview?: unknown }).invoice_preview ?? null,
  });
}
