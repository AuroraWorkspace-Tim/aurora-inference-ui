"use client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import metrics from "@/public/data/metrics_timeseries.json";
import endpoints from "@/public/data/endpoints.json";
import activity from "@/public/data/activity.json";
import billing from "@/public/data/billing.json";

const statusColor: Record<string, string> = {
  healthy: "bg-emerald-500",
  degraded: "bg-amber-500",
  down: "bg-red-500",
};

const activityIcon: Record<string, string> = {
  api_call: "📡",
  alert: "⚠️",
  endpoint_scaled: "⬆️",
  key_created: "🔑",
  deployment: "🚀",
};

export default function Dashboard() {
  const last7 = metrics.slice(-7);
  const totalRequests = metrics.slice(-1)[0].requests;
  const totalTokens = metrics.slice(-1)[0].tokens_in + metrics.slice(-1)[0].tokens_out;
  const todaySpend = metrics.slice(-1)[0].spend_usd;
  const healthyCount = endpoints.filter((e) => e.status === "healthy").length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Aurora Inference Control Plane</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Requests Today", value: totalRequests.toLocaleString(), sub: "↑ 12% vs yesterday" },
          { label: "Tokens Today", value: `${(totalTokens / 1_000_000).toFixed(1)}M`, sub: "in + out" },
          { label: "Spend Today", value: `$${todaySpend.toFixed(2)}`, sub: `of $${(billing as { budget_limit: number }).budget_limit}/mo` },
          { label: "Healthy Endpoints", value: `${healthyCount}/${endpoints.length}`, sub: "endpoints online" },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</div>
            <div className="text-2xl font-bold text-white mt-1">{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="text-sm font-medium text-gray-300 mb-4">Requests / Day (last 7 days)</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={last7}>
              <defs>
                <linearGradient id="rq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} labelStyle={{ color: "#d1d5db" }} itemStyle={{ color: "#a78bfa" }} />
              <Area type="monotone" dataKey="requests" stroke="#7c3aed" fill="url(#rq)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="text-sm font-medium text-gray-300 mb-4">Daily Spend USD (last 7 days)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} labelStyle={{ color: "#d1d5db" }} itemStyle={{ color: "#34d399" }} />
              <Bar dataKey="spend_usd" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Endpoints health + Activity */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="text-sm font-medium text-gray-300 mb-3">Endpoint Health</div>
          <div className="space-y-2">
            {endpoints.map((ep) => (
              <div key={ep.id} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${statusColor[ep.status]}`} />
                  <span className="text-sm text-gray-200">{ep.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{ep.replicas_active}/{ep.replicas_max} replicas</span>
                  <span>{ep.p50_ms}ms p50</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="text-sm font-medium text-gray-300 mb-3">Recent Activity</div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {activity.slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-start gap-2 py-1.5 border-b border-gray-800 last:border-0">
                <span className="text-base shrink-0">{activityIcon[a.type] ?? "•"}</span>
                <div>
                  <p className="text-xs text-gray-300">{a.message}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{new Date(a.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
