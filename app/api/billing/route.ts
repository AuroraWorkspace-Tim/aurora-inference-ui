import { NextResponse } from "next/server";

const DO_API = "https://api.digitalocean.com/v2";

interface Invoice {
  id: string;
  date: string;
  amount_usd: number;
  status: "paid" | "pending";
}

interface BillingResponse {
  total_spend_mtd: number;
  account_balance: number;
  invoices: Invoice[];
  source: "do_api" | "mock";
}

export async function GET() {
  const key = process.env.DO_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "DO_API_KEY not configured" }, { status: 500 });
  }

  try {
    const [balanceRes, historyRes] = await Promise.all([
      fetch(`${DO_API}/customers/my/balance`, {
        headers: { Authorization: `Bearer ${key}` },
        next: { revalidate: 300 },
      }),
      fetch(`${DO_API}/customers/my/billing_history`, {
        headers: { Authorization: `Bearer ${key}` },
        next: { revalidate: 300 },
      }),
    ]);

    if (!balanceRes.ok || !historyRes.ok) {
      return NextResponse.json(
        { error: "DO billing API error", balance_status: balanceRes.status, history_status: historyRes.status },
        { status: 502 }
      );
    }

    const balance = await balanceRes.json();
    const history = await historyRes.json();

    const total_spend_mtd = parseFloat(balance.month_to_date_usage ?? "0");
    const account_balance = parseFloat(balance.account_balance ?? "0");

    const invoices: Invoice[] = (history.billing_history ?? [])
      .slice(0, 12)
      .map((entry: { invoice_id?: string; date?: string; amount?: string; type?: string }) => ({
        id: entry.invoice_id ?? entry.date ?? "unknown",
        date: (entry.date ?? "").slice(0, 10),
        amount_usd: parseFloat(entry.amount ?? "0"),
        status: entry.type === "Payment" ? "paid" : "pending",
      }));

    const response: BillingResponse = {
      total_spend_mtd,
      account_balance,
      invoices,
      source: "do_api",
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
