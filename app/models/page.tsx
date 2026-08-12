"use client";
import { useState, useEffect } from "react";

type Model = {
  id: string;
  name: string;
  provider: string;
  modality: string;
  context_length: number;
  price_per_1k_input: number;
  price_per_1k_output: number;
  description: string;
  tags: string[];
};

const MODALITIES = ["all", "text", "code", "image", "audio", "video"];

const modalityColor: Record<string, string> = {
  text: "bg-blue-900/40 text-blue-400 border-blue-800",
  code: "bg-violet-900/40 text-violet-400 border-violet-800",
  image: "bg-pink-900/40 text-pink-400 border-pink-800",
  audio: "bg-amber-900/40 text-amber-400 border-amber-800",
  video: "bg-emerald-900/40 text-emerald-400 border-emerald-800",
};

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Model | null>(null);

  useEffect(() => {
    fetch("/api/v1/models")
<<<<<<< HEAD
      .then((r) => r.json())
      .then((json) => {
        const data: Model[] = json.data ?? [];
        if (data.length === 0) return; // keep static fallback
        setModels(data);
=======
      .then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json();
>>>>>>> b22cc90 (AUR-228: Remove static model catalog, fetch prices directly from DO endpoint)
      })
      .then((json) => {
        const models: Model[] = json.data ?? [];
        setModels(models);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? models : models.filter((m) => m.modality === filter);

  const snippet = (m: Model) => `import openai

client = openai.OpenAI(
    base_url="https://ai.aur.lu/v1",
    api_key="YOUR_AURORA_KEY",
)

response = client.chat.completions.create(
    model="${m.id}",
    messages=[{"role": "user", "content": "Hello!"}],
)
print(response.choices[0].message.content)`;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Model Catalog</h1>
        <p className="text-gray-400 text-sm mt-1">
          {loading ? "Loading…" : error ? `Error: ${error}` : `${models.length} models available`}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {MODALITIES.map((m) => (
          <button
            key={m}
            onClick={() => setFilter(m)}
            className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
              filter === m
                ? "bg-violet-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-gray-200"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400 text-sm">
          Failed to load models from DO endpoint: {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {filtered.map((m) => (
          <div
            key={m.id}
            onClick={() => setSelected(selected?.id === m.id ? null : m)}
            className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-colors ${
              selected?.id === m.id ? "border-violet-600" : "border-gray-800 hover:border-gray-700"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-medium text-white text-sm">{m.name || m.id}</div>
                <div className="text-xs text-gray-500 mt-0.5">{m.provider}</div>
              </div>
              {m.modality && (
                <span className={`text-xs px-2 py-0.5 rounded border capitalize ${modalityColor[m.modality] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
                  {m.modality}
                </span>
              )}
            </div>
            {m.description && (
              <p className="text-xs text-gray-400 line-clamp-2">{m.description}</p>
            )}
            <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
              {m.context_length > 0 && <span>{(m.context_length / 1000).toFixed(0)}k ctx</span>}
              {m.price_per_1k_input > 0 && (
                <span>${m.price_per_1k_input.toFixed(5)}/1k in</span>
              )}
              {m.price_per_1k_output > 0 && (
                <span>${m.price_per_1k_output.toFixed(5)}/1k out</span>
              )}
            </div>
            {m.tags?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {m.tags.map((t) => (
                  <span key={t} className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{t}</span>
                ))}
              </div>
            )}

            {selected?.id === m.id && (
              <div className="mt-3 pt-3 border-t border-gray-800">
                <div className="text-xs text-gray-500 mb-1.5">Python</div>
                <pre className="bg-gray-950 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap font-mono">
                  {snippet(m)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
