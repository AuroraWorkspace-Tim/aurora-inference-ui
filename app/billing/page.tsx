"use client";
import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import billingFallback from "@/public/data/billing.json";

interface Invoice {
  id: string;
  date: string;
  amount_usd: number;
  status: "paid" | "pending";
}

interface BillingData {
  total_spend_mtd: number;
  account_balance: number;
  invoices: Invoice[];
  source: "do_api" | "mock";
}

const invoiceStatusStyle: Record<string, string> = {
  paid: "bg-emerald-900/40 text-emerald-400 border-emerald-800",
  pending: "bg-amber-900/40 text-amber-400 border-amber-800",
};

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Static daily spend from billing.json (DO billing API returns monthly invoices, not daily granularity)
  const fb = billingFallback as { daily_spend: { date: string; amount_usd: number }[]; budget_limit: number; total_spend_mtd: number; invoices: Invoice[] };
  const last14 = fb.daily_spend?.slice(-14) ?? [];
  const budgetLimit = fb.budget_limit ?? 3000;

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const mtd = data?.total_spend_mtd ?? (fb.total_spend_mtd as number);
  const balance = data?.account_balance ?? 0;
  const invoices = data?.invoices ?? (fb.invoices as Invoice[]);
  const mtdPct = Math.min(100, Math.round((mtd / budgetLimit) * 100));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing</h1>
          <p className="text-gray-400 text-sm mt-1">DigitalOcean COGS — Aurora infrastructure cost</p>
        </div>
        {loading && <span className="text-xs text-gray-500 animate-pulse">Fetching live data…</span>}
        {data?.source === "do_api" && <span className="text-xs text-emerald-500">● live</span>}
        {error && <span className="text-xs text-amber-400" title={error}>⚠ DO API unavailable · showing cached data</span>}
      </div>

      {/* MTD summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase mb-1">Month-to-Date Spend (COGS)</div>
          <div className="text-3xl font-bold text-white">${mtd.toFixed(2)}</div>
          <div className="text-xs text-gray-400 mt-1">of ${budgetLimit.toLocaleString()} budget</div>
          <div className="mt-3 bg-gray-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${mtdPct > 85 ? "bg-red-500" : mtdPct > 60 ? "bg-amber-500" : "bg-violet-500"}`}
              style={{ width: `${mtdPct}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">{mtdPct}% of budget used</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs text-gray-500 uppercase mb-1">Account Balance</div>
          <div className="text-2xl font-bold text-white">${balance.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-2">
            This is what Aurora pays DO — not customer billing. Customer revenue is tracked in Stripe.
          </div>
        </div>
      </div>

      {/* Daily spend chart — from static billing.json (DO API is monthly) */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium text-gray-300">Daily Spend (last 14 days)</div>
          <div className="text-xs text-gray-600">projected · DO invoices are monthly</div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={last14}>
            <defs>
              <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
              labelStyle={{ color: "#d1d5db" }}
              itemStyle={{ color: "#a78bfa" }}
              formatter={(v: number) => [`$${v}`, "Spend"]}
            />
            <Area type="monotone" dataKey="amount_usd" stroke="#7c3aed" fill="url(#spend)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Invoices */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 text-sm font-medium text-gray-300">
          DO Invoices
        </div>
        {invoices.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500 text-center">No invoices found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr className="text-xs text-gray-500">
                <th className="text-left px-4 py-2">Invoice ID</th>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-right px-4 py-2">Amount</th>
                <th className="text-left px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{inv.id}</td>
                  <td className="px-4 py-3 text-gray-300">{inv.date}</td>
                  <td className="px-4 py-3 text-right font-medium text-white">${inv.amount_usd.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border capitalize ${invoiceStatusStyle[inv.status] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
