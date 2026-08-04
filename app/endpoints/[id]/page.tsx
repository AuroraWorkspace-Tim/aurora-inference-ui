"use client";
import { notFound } from "next/navigation";
import endpoints from "@/public/data/endpoints.json";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Generate fake per-replica engine metrics
function replicaMetrics(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `replica-${i}`,
    tokens_per_sec: Math.floor(180 + Math.random() * 120),
    queue_depth: Math.floor(Math.random() * 8),
    queue_wait_ms: Math.floor(Math.random() * 40),
    gpu_util_pct: Math.floor(60 + Math.random() * 35),
    p50_token_ms: Math.floor(8 + Math.random() * 10),
    p95_token_ms: Math.floor(18 + Math.random() * 20),
  }));
}

// Fake latency timeseries
function latencyTimeseries() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    p50: Math.floor(100 + Math.random() * 100),
    p90: Math.floor(200 + Math.random() * 200),
    p99: Math.floor(400 + Math.random() * 400),
  }));
}

export default function EndpointDetail({ params }: { params: { id: string } }) {
  const ep = endpoints.find((e) => e.id === params.id);
  if (!ep) notFound();

  const replicas = replicaMetrics(ep.replicas_active || 1);
  const latency = latencyTimeseries();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{ep.name}</h1>
          <div className="text-xs font-mono text-gray-500 mt-0.5">{ep.model} · {ep.region}</div>
        </div>
        <span className={`ml-auto text-xs px-2.5 py-1 rounded-full border ${
          ep.status === "healthy" ? "bg-emerald-900/40 text-emerald-400 border-emerald-800" :
          ep.status === "degraded" ? "bg-amber-900/40 text-amber-400 border-amber-800" :
          "bg-red-900/40 text-red-400 border-red-800"
        }`}>{ep.status}</span>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "p50", value: `${ep.p50_ms}ms` },
          { label: "p90", value: `${ep.p90_ms}ms` },
          { label: "p95", value: `${ep.p95_ms}ms` },
          { label: "p99", value: `${ep.p99_ms}ms` },
          { label: "TTFT", value: `${ep.ttft_ms}ms` },
        ].map((m) => (
          <div key={m.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500 uppercase">{m.label}</div>
            <div className="text-xl font-bold text-white mt-1">{ep.status === "down" ? "—" : m.value}</div>
          </div>
        ))}
      </div>

      {/* Latency chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-sm font-medium text-gray-300 mb-4">Latency (last 24h)</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={latency}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="hour" tick={{ fill: "#6b7280", fontSize: 10 }} interval={3} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v) => `${v}ms`} />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} labelStyle={{ color: "#d1d5db" }} />
            <Line type="monotone" dataKey="p50" stroke="#34d399" strokeWidth={2} dot={false} name="p50" />
            <Line type="monotone" dataKey="p90" stroke="#fbbf24" strokeWidth={2} dot={false} name="p90" />
            <Line type="monotone" dataKey="p99" stroke="#f87171" strokeWidth={2} dot={false} name="p99" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Per-Replica Engine Metrics */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-sm font-medium text-gray-300 mb-3">Per-Replica Engine Metrics</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-2 pr-4">Replica</th>
                <th className="text-right pr-4">Tokens/sec</th>
                <th className="text-right pr-4">Queue Depth</th>
                <th className="text-right pr-4">Queue Wait</th>
                <th className="text-right pr-4">GPU Util</th>
                <th className="text-right pr-4">p50 Token</th>
                <th className="text-right">p95 Token</th>
              </tr>
            </thead>
            <tbody>
              {ep.replicas_active === 0 ? (
                <tr><td colSpan={7} className="py-4 text-center text-gray-600">No active replicas</td></tr>
              ) : replicas.map((r) => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 pr-4 font-mono text-gray-400">{r.id}</td>
                  <td className="text-right pr-4 text-emerald-400">{r.tokens_per_sec}</td>
                  <td className="text-right pr-4 text-gray-300">{r.queue_depth}</td>
                  <td className="text-right pr-4 text-gray-300">{r.queue_wait_ms}ms</td>
                  <td className={`text-right pr-4 font-medium ${r.gpu_util_pct > 90 ? "text-red-400" : r.gpu_util_pct > 75 ? "text-amber-400" : "text-emerald-400"}`}>{r.gpu_util_pct}%</td>
                  <td className="text-right pr-4 text-gray-300">{r.p50_token_ms}ms</td>
                  <td className="text-right text-gray-300">{r.p95_token_ms}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Autoscaling Settings */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-sm font-medium text-gray-300 mb-4">Autoscaling Settings</div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Min Replicas</label>
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200">1</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Max Replicas</label>
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200">{ep.replicas_max}</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Scale-Down Delay</label>
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200">{ep.scale_down_delay_s}s</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className={`w-9 h-5 rounded-full transition-colors ${ep.scale_to_zero ? "bg-violet-600" : "bg-gray-700"} relative cursor-pointer`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${ep.scale_to_zero ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
          <span className="text-sm text-gray-300">Scale to Zero</span>
          <span className={`text-xs ${ep.scale_to_zero ? "text-violet-400" : "text-gray-500"}`}>{ep.scale_to_zero ? "Enabled" : "Disabled"}</span>
        </div>
      </div>
    </div>
  );
}
