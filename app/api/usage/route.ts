import { NextResponse } from "next/server";
import billingMock from "@/public/data/billing.json";

// DigitalOcean GenAI inference usage API base
const DO_USAGE_BASE = "https://api.digitalocean.com/v2";

interface DailySpend {
  date: string;
  amount_usd: number;
}

interface ModelBreakdown {
  model: string;
  spend_usd: number;
  pct: number;
}

interface UsageResponse {
  daily_spend: DailySpend[];
  invoices: { id: string; date: string; amount_usd: number; status: string }[];
  total_spend_mtd: number;
  budget_limit: number;
  model_breakdown: ModelBreakdown[];
  source: "do_api" | "mock";
}

async function fetchDoUsage(apiKey: string): Promise<UsageResponse | null> {
  // Fetch balance and billing history from DigitalOcean API
  const [balanceRes, historyRes] = await Promise.all([
    fetch(`${DO_USAGE_BASE}/customers/my/balance`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    }),
    fetch(`${DO_USAGE_BASE}/customers/my/billing_history`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    }),
  ]);

  if (!balanceRes.ok || !historyRes.ok) return null;

  const balance = await balanceRes.json();
  const history = await historyRes.json();

  const mtd = parseFloat(balance.month_to_date_usage ?? "0");
  const budgetLimit = parseFloat(balance.account_balance ?? "3000");

  // Map billing history entries to daily spend (DO returns monthly invoices)
  const invoices = (history.billing_history ?? [])
    .slice(0, 10)
    .map((entry: { invoice_id: string; date: string; amount: string; type: string }) => ({
      id: entry.invoice_id ?? entry.date,
      date: entry.date?.slice(0, 10) ?? "",
      amount_usd: parseFloat(entry.amount ?? "0"),
      status: entry.type === "Payment" ? "paid" : "pending",
    }));

  // DO doesn't expose per-day granular inference spend yet — keep mock daily shape
  // TODO: replace with DO GenAI inference usage endpoint when available
  const daily_spend: DailySpend[] = (billingMock as any).daily_spend;
  const model_breakdown: ModelBreakdown[] = (billingMock as any).model_breakdown;

  return {
    daily_spend,
    invoices: invoices.length ? invoices : (billingMock as any).invoices,
    total_spend_mtd: mtd || (billingMock as any).total_spend_mtd,
    budget_limit: budgetLimit > 0 ? budgetLimit : (billingMock as any).budget_limit,
    model_breakdown,
    source: "do_api",
  };
}

export async function GET() {
  const apiKey = process.env.DO_API_KEY;

  if (apiKey) {
    const doData = await fetchDoUsage(apiKey).catch(() => null);
    if (doData) {
      return NextResponse.json(doData);
    }
  }

  // Fallback: return static mock enriched with source tag
  return NextResponse.json({ ...(billingMock as any), source: "mock" });
}
