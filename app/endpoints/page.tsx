import Link from "next/link";
import endpoints from "@/public/data/endpoints.json";

const statusStyle: Record<string, { dot: string; badge: string; label: string }> = {
  healthy: { dot: "bg-emerald-400", badge: "bg-emerald-900/40 text-emerald-400 border-emerald-800", label: "Healthy" },
  degraded: { dot: "bg-amber-400", badge: "bg-amber-900/40 text-amber-400 border-amber-800", label: "Degraded" },
  down: { dot: "bg-red-400", badge: "bg-red-900/40 text-red-400 border-red-800", label: "Down" },
};

export default function EndpointsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Endpoints</h1>
          <p className="text-gray-400 text-sm mt-1">{endpoints.length} deployed endpoints</p>
        </div>
        <button className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors">
          + New Endpoint
        </button>
      </div>

      <div className="grid gap-3">
        {endpoints.map((ep) => {
          const s = statusStyle[ep.status];
          return (
            <Link key={ep.id} href={`/endpoints/${ep.id}`}>
              <div className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${s.dot} shrink-0`} />
                    <div>
                      <div className="font-medium text-white">{ep.name}</div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">{ep.model}</div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded border ${s.badge}`}>{s.label}</span>
                </div>

                <div className="mt-3 grid grid-cols-6 gap-4 text-xs">
                  <div>
                    <div className="text-gray-500">Region</div>
                    <div className="text-gray-300 mt-0.5">{ep.region}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Replicas</div>
                    <div className="text-gray-300 mt-0.5">{ep.replicas_active}/{ep.replicas_max}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">p50 Latency</div>
                    <div className="text-gray-300 mt-0.5">{ep.p50_ms > 0 ? `${ep.p50_ms}ms` : "—"}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">p99 Latency</div>
                    <div className="text-gray-300 mt-0.5">{ep.p99_ms > 0 ? `${ep.p99_ms}ms` : "—"}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Throughput</div>
                    <div className="text-gray-300 mt-0.5">{ep.throughput_tps > 0 ? `${ep.throughput_tps} tps` : "—"}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">GPU Util</div>
                    <div className={`mt-0.5 font-medium ${ep.gpu_util_pct > 90 ? "text-red-400" : ep.gpu_util_pct > 75 ? "text-amber-400" : "text-emerald-400"}`}>
                      {ep.gpu_util_pct > 0 ? `${ep.gpu_util_pct}%` : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
