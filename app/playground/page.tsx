"use client";
import { useState, useEffect, useRef } from "react";

type Model = { id: string; name?: string };

function CodeSnippet({ model, systemPrompt, userMessage }: { model: string; systemPrompt: string; userMessage: string }) {
  const py = `import openai

client = openai.OpenAI(
    base_url="https://ai.aur.lu/v1",
    api_key="YOUR_AURORA_KEY",
)

response = client.chat.completions.create(
    model="${model}",
    messages=[
        {"role": "system", "content": """${systemPrompt}"""},
        {"role": "user", "content": """${userMessage}"""},
    ],
    stream=True,
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="")`;

  const curl = `curl https://ai.aur.lu/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_AURORA_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [
      {"role": "system", "content": "${systemPrompt}"},
      {"role": "user", "content": "${userMessage}"}
    ],
    "stream": true
  }'`;

  const [tab, setTab] = useState("python");
  return (
    <div className="mt-4 bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex border-b border-gray-800">
        {["python", "curl"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-xs font-mono transition-colors ${tab === t ? "bg-gray-800 text-gray-200" : "text-gray-500 hover:text-gray-300"}`}>{t}</button>
        ))}
      </div>
      <pre className="p-4 text-xs text-gray-300 overflow-x-auto font-mono whitespace-pre-wrap">
        {tab === "python" ? py : curl}
      </pre>
    </div>
  );
}

export default function PlaygroundPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful AI assistant.");
  const [userMessage, setUserMessage] = useState("Explain how large language models work in simple terms.");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ prompt_tokens?: number; completion_tokens?: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/v1/models")
      .then((r) => r.json())
      .then((json) => {
        const raw: { id: string; owned_by?: string }[] = json.data ?? [];
        const textModels = raw.length > 0
          ? raw.map((m) => ({ id: m.id, name: m.id }))
          : [];
        setModels(textModels);
        if (textModels.length > 0) setSelectedModel(textModels[0].id);
      })
      .catch(() => {});
  }, []);

  const runCompletion = async () => {
    if (streaming || !selectedModel) return;
    setResponse("");
    setError(null);
    setUsage(null);
    setStreaming(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature,
          max_tokens: maxTokens,
          stream: true,
          stream_options: { include_usage: true },
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        setError(`Error ${res.status}: ${text}`);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const chunk = JSON.parse(payload);
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) setResponse((prev) => prev + delta);
            if (chunk.usage) setUsage(chunk.usage);
          } catch {
            // ignore malformed chunks
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setStreaming(false);
    }
  };

  const stopCompletion = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Playground</h1>
        <p className="text-gray-400 text-sm mt-1">Test models interactively</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left panel */}
        <div className="col-span-2 space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={2}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-600 resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">User Message</label>
            <textarea
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-600 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={runCompletion}
              disabled={streaming || !selectedModel}
              className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
            >
              {streaming ? "Generating…" : "Run"}
            </button>
            {streaming && (
              <button
                onClick={stopCompletion}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors"
              >
                Stop
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {(response || streaming) && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 min-h-32">
              <div className="text-xs text-gray-500 mb-2">
                Response {streaming && <span className="animate-pulse">▍</span>}
              </div>
              <div className="text-sm text-gray-200 whitespace-pre-wrap">{response}</div>
              {!streaming && response && (
                <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500 flex gap-4">
                  {usage ? (
                    <>
                      <span>{usage.prompt_tokens} prompt tokens</span>
                      <span>{usage.completion_tokens} completion tokens</span>
                    </>
                  ) : (
                    <span>~{response.split(" ").length} words</span>
                  )}
                  <span>temp: {temperature}</span>
                  <span>model: {selectedModel}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel - parameters */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-600"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name ?? m.id}</option>
              ))}
              {models.length === 0 && (
                <option value="" disabled>Loading models…</option>
              )}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Temperature: {temperature}</label>
            <input
              type="range" min="0" max="2" step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-violet-600"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Max Tokens: {maxTokens}</label>
            <input
              type="range" min="64" max="4096" step="64"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full accent-violet-600"
            />
          </div>
        </div>
      </div>

      <CodeSnippet model={selectedModel} systemPrompt={systemPrompt} userMessage={userMessage} />
    </div>
  );
}
