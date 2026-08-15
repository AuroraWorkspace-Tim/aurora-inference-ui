"use client";

import { useEffect, useState } from "react";
import { DollarSign, FileText, AlertTriangle, RefreshCw } from "lucide-react";

interface Balance {
  month_to_date_usage: string;
  account_balance: string;
  month_to_date_balance: string;
  generated_at: string;
}

interface Invoice {
  invoice_uuid: string;
  amount: string;
  invoice_period: string;
  updated_at: string;
}

interface CogsData {
  balance: Balance;
  invoices: Invoice[];
  invoice_preview: Invoice | null;
}

function fmt(dollarStr: string): string {
  const n = parseFloat(dollarStr ?? "0");
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Math.abs(n));
}

function periodLabel(period: string): string {
  if (!period) return "—";
  const [year, month] = period.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function CogsPage() {
  const [data, setData] = useState<CogsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backoffice/cogs");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Infrastructure Cost (COGS)</h1>
          <p className="text-gray-400 text-sm mt-1">
            Aurora&apos;s cost from DigitalOcean — not customer billing
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Notice: this is COGS, not customer billing */}
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-900/20 border border-amber-800/50 rounded-xl text-sm">
        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <span className="text-amber-200">
          This surface shows what Aurora pays DigitalOcean for GPU infrastructure.
          Customer invoices and Stripe revenue are tracked separately.
        </span>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-900/20 border border-red-800/50 rounded-xl text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="text-gray-500 text-sm py-8 text-center">Loading…</div>
      )}

      {data && (
        <>
          {/* Balance cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <DollarSign className="w-3.5 h-3.5" />
                Month-to-Date Usage
              </div>
              <div className="text-2xl font-semibold text-white">
                {fmt(data.balance.month_to_date_usage)}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <DollarSign className="w-3.5 h-3.5" />
                Account Balance
              </div>
              <div className="text-2xl font-semibold text-white">
                {fmt(data.balance.account_balance)}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <DollarSign className="w-3.5 h-3.5" />
                Month-to-Date Balance
              </div>
              <div className="text-2xl font-semibold text-white">
                {fmt(data.balance.month_to_date_balance)}
              </div>
            </div>
          </div>

          {/* Current period preview */}
          {data.invoice_preview && (
            <div className="bg-violet-900/10 border border-violet-800/30 rounded-xl p-5">
              <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Current Period (preview)
              </div>
              <div className="text-lg font-semibold text-white">
                {periodLabel(data.invoice_preview.invoice_period)}
                <span className="ml-3 text-violet-300">
                  {fmt(data.invoice_preview.amount)}
                </span>
              </div>
            </div>
          )}

          {/* Invoice history */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2 text-sm font-medium text-gray-300">
              <FileText className="w-4 h-4" />
              Invoice History
            </div>
            {data.invoices.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500 text-center">
                No invoices yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800">
                  <tr className="text-xs text-gray-500">
                    <th className="text-left px-4 py-3">Period</th>
                    <th className="text-left px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((inv) => (
                    <tr
                      key={inv.invoice_uuid}
                      className="border-b border-gray-800/50 hover:bg-gray-800/20"
                    >
                      <td className="px-4 py-3 text-gray-200">
                        {periodLabel(inv.invoice_period)}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-300">
                        {fmt(inv.amount)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(inv.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="text-xs text-gray-600">
            Last fetched {new Date(data.balance.generated_at).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}
