import { NextResponse } from "next/server";

const DO_API_BASE = "https://api.digitalocean.com/v2";

function doHeaders(key: string) {
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

interface DOInvoicePage {
  invoices?: unknown[];
  invoice_preview?: unknown;
  links?: { pages?: { next?: string } };
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
  let firstPageRes: Response;
  try {
    [balanceRes, firstPageRes] = await Promise.all([
      fetch(`${DO_API_BASE}/customers/my/balance`, { headers, next: { revalidate: 300 } }),
      fetch(`${DO_API_BASE}/customers/my/invoices?per_page=200`, { headers, next: { revalidate: 300 } }),
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
  if (!firstPageRes.ok) {
    const text = await firstPageRes.text();
    return NextResponse.json(
      { error: "invoices fetch failed", detail: text },
      { status: firstPageRes.status }
    );
  }

  let balance: unknown;
  let firstPage: DOInvoicePage;
  try {
    [balance, firstPage] = await Promise.all([balanceRes.json(), firstPageRes.json()]);
  } catch (err) {
    return NextResponse.json(
      { error: "failed to parse DigitalOcean response", detail: err instanceof Error ? err.message : "unknown" },
      { status: 502 }
    );
  }

  const invoices: unknown[] = [...(firstPage.invoices ?? [])];
  const invoice_preview = firstPage.invoice_preview ?? null;

  // Follow pagination links until all invoices are collected
  let nextUrl: string | undefined = firstPage.links?.pages?.next;
  while (nextUrl) {
    let pageRes: Response;
    try {
      pageRes = await fetch(nextUrl, { headers, next: { revalidate: 300 } });
    } catch (err) {
      return NextResponse.json(
        { error: "network error fetching invoice page", detail: err instanceof Error ? err.message : "unknown" },
        { status: 502 }
      );
    }
    if (!pageRes.ok) {
      const text = await pageRes.text();
      return NextResponse.json(
        { error: "invoices fetch failed", detail: text },
        { status: pageRes.status }
      );
    }
    let page: DOInvoicePage;
    try {
      page = await pageRes.json();
    } catch (err) {
      return NextResponse.json(
        { error: "failed to parse DigitalOcean response", detail: err instanceof Error ? err.message : "unknown" },
        { status: 502 }
      );
    }
    invoices.push(...(page.invoices ?? []));
    nextUrl = page.links?.pages?.next;
  }

  return NextResponse.json({ balance, invoices, invoice_preview });
}
