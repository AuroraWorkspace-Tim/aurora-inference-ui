import billingFallback from "@/public/data/billing.json";
import BillingUI, { Invoice, LiveBillingData } from "./BillingUI";

const DO_API = "https://api.digitalocean.com/v2";

async function fetchBilling(): Promise<LiveBillingData> {
  const key = process.env.DO_API_KEY;
  if (!key) throw new Error("DO_API_KEY not configured");

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

  if (!balanceRes.ok || !historyRes.ok)
    throw new Error(`DO API error: balance=${balanceRes.status} history=${historyRes.status}`);

  const balance = await balanceRes.json();
  const history = await historyRes.json();

  const invoices: Invoice[] = (history.billing_history ?? [])
    .slice(0, 12)
    .map((entry: { invoice_id?: string; date?: string; amount?: string; type?: string }) => ({
      id: entry.invoice_id ?? entry.date ?? "unknown",
      date: (entry.date ?? "").slice(0, 10),
      amount_usd: parseFloat(entry.amount ?? "0"),
      status: entry.type === "Payment" ? "paid" : "pending",
    }));

  return {
    total_spend_mtd: parseFloat(balance.month_to_date_usage ?? "0"),
    account_balance: parseFloat(balance.account_balance ?? "0"),
    invoices,
    source: "do_api",
  };
}

const fb = billingFallback as {
  daily_spend: { date: string; amount_usd: number }[];
  budget_limit: number;
  total_spend_mtd: number;
  invoices: Invoice[];
};

export default async function BillingPage() {
  let data: LiveBillingData | null = null;
  let error: string | null = null;

  try {
    data = await fetchBilling();
  } catch (e) {
    error = e instanceof Error ? e.message : "DO API unavailable";
  }

  return (
    <BillingUI
      data={data}
      error={error}
      dailySpend={fb.daily_spend}
      budgetLimit={fb.budget_limit}
      fallbackMtd={fb.total_spend_mtd}
      fallbackInvoices={fb.invoices}
    />
  );
}
