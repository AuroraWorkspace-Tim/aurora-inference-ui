"use client";
import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const PIE_COLORS = ["#7c3aed", "#0ea5e9", "#10b981", "#f59e0b"];

const invoiceStatusStyle: Record<string, string> = {
  paid: "bg-emerald-900/40 text-emerald-400 border-emerald-800",
  pending: "bg-amber-900/40 text-amber-400 border-amber-800",
  overdue: "bg-red-900/40 text-red-400 border-red-800",
};

export default function BillingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-gray-400 text-sm mt-1">Usage and spend overview</p>
        <div className="mt-8 text-gray-500 text-sm">Loading usage data…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-gray-500 text-sm mt-4">Failed to load usage data.</p>
      </div>
    );
  }

  const last14 = data.daily_spend.slice(-14);
  const mtdPct = Math.min(100, Math.round((data.total_spend_mtd / data.budget_limit) * 100));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing</h1>
          <p className="text-gray-400 text-sm mt-1">Usage and spend overview</p>
        </div>
        {data.source === "mock" && (
          <span className="text-xs px-2 py-0.5 rounded border bg-gray-800/60 text-gray-500 border-gray-700">
            mock data
          </span>
        )}
      </div>

      {/* MTD summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase mb-1">Month-to-Date Spend</div>
          <div className="text-3xl font-bold text-white">${data.total_spend_mtd.toFixed(2)}</div>
          <div className="text-xs text-gray-400 mt-1">of ${data.budget_limit.toLocaleString()} budget</div>
          <div className="mt-3 bg-gray-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full ${mtdPct > 85 ? "bg-red-500" : mtdPct > 60 ? "bg-amber-500" : "bg-violet-500"}`}
              style={{ width: `${mtdPct}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">{mtdPct}% of budget used</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase mb-2">Model Breakdown</div>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={data.model_breakdown} dataKey="spend_usd" nameKey="model" cx="50%" cy="50%" outerRadius={50} innerRadius={25}>
                {data.model_breakdown.map((_: any, i: number) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 11 }}
                formatter={(v: any) => [`$${v.toFixed(2)}`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily spend chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-sm font-medium text-gray-300 mb-4">Daily Spend (last 14 days)</div>
        <ResponsiveContainer width="100%" height={200}>
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
              formatter={(v: any) => [`$${v}`, "Spend"]}
            />
            <Area type="monotone" dataKey="amount_usd" stroke="#7c3aed" fill="url(#spend)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Invoices */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 text-sm font-medium text-gray-300">Invoices</div>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800">
            <tr className="text-xs text-gray-500">
              <th className="text-left px-4 py-2">Invoice</th>
              <th className="text-left px-4 py-2">Date</th>
              <th className="text-right px-4 py-2">Amount</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {data.invoices.map((inv: any) => (
              <tr key={inv.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{inv.id}</td>
                <td className="px-4 py-3 text-gray-300">{inv.date}</td>
                <td className="px-4 py-3 text-right font-medium text-white">${inv.amount_usd.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded border capitalize ${invoiceStatusStyle[inv.status] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-xs text-gray-500 hover:text-gray-300">Download</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
