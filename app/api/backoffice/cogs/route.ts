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

  const [balanceRes, invoicesRes] = await Promise.all([
    fetch(`${DO_API_BASE}/customers/my/balance`, { headers, next: { revalidate: 300 } }),
    fetch(`${DO_API_BASE}/customers/my/invoices`, { headers, next: { revalidate: 300 } }),
  ]);

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

  const [balance, invoicesData] = await Promise.all([
    balanceRes.json(),
    invoicesRes.json(),
  ]);

  return NextResponse.json({
    balance,
    invoices: invoicesData.invoices ?? [],
    invoice_preview: invoicesData.invoice_preview ?? null,
  });
}
