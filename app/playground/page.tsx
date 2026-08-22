"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Message = { role: "user" | "assistant"; content: string };
type Model = { id: string; name?: string };

function CodeSnippet({ model, systemPrompt, messages }: { model: string; systemPrompt: string; messages: Message[] }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://aurora-inference-ui.vercel.app";
  const lastUser = messages.findLast((m) => m.role === "user")?.content ?? "Hello!";

  const py = `import openai

# Demo endpoint — works today via the Aurora proxy
client = openai.OpenAI(
    base_url="${origin}/api/v1",
    api_key="demo",
)

response = client.chat.completions.create(
    model="${model}",
    messages=[
        {"role": "system", "content": """${systemPrompt}"""},
        {"role": "user", "content": """${lastUser}"""},
    ],
    stream=True,
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="")`;

  const curl = `curl ${origin}/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [
      {"role": "system", "content": "${systemPrompt}"},
      {"role": "user", "content": "${lastUser}"}
    ],
    "stream": true
  }'`;

  const [tab, setTab] = useState("python");
  return (
    <div className="mt-4 bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-800 px-1">
        <div className="flex">
          {["python", "curl"].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-xs font-mono transition-colors ${tab === t ? "bg-gray-800 text-gray-200" : "text-gray-500 hover:text-gray-300"}`}>{t}</button>
          ))}
        </div>
        <span className="text-xs text-gray-600 pr-3">demo endpoint · no auth required</span>
      </div>
      <pre className="p-4 text-xs text-gray-300 overflow-x-auto font-mono whitespace-pre-wrap">
        {tab === "python" ? py : curl}
      </pre>
    </div>
  );
}

function PlaygroundInner() {
  const searchParams = useSearchParams();
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState(searchParams.get("model") ?? "");
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful AI assistant.");
  const [input, setInput] = useState("Explain how large language models work in simple terms.");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<Record<string, number> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const initialModel = searchParams.get("model") ?? "";
  useEffect(() => {
    fetch("/api/v1/models")
      .then((r) => r.json())
      .then((json) => {
        const raw: { id: string }[] = json.data ?? [];
        const list = raw.map((m) => ({ id: m.id, name: m.id }));
        setModels(list);
        if (!initialModel && list.length > 0) setSelectedModel(list[0].id);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const runCompletion = async () => {
    if (streaming || !selectedModel || !input.trim()) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setError(null);
    setLastUsage(null);
    setStreamingContent("");
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
            ...updatedMessages,
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
        setMessages((prev) => prev.slice(0, -1)); // remove user message on error
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistantContent = "";

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
            if (delta) {
              assistantContent += delta;
              setStreamingContent(assistantContent);
            }
            if (chunk.usage) setLastUsage(chunk.usage);
          } catch {
            // ignore malformed chunks
          }
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: assistantContent }]);
      setStreamingContent("");
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setStreaming(false);
    }
  };

  const stopCompletion = () => {
    abortRef.current?.abort();
    if (streamingContent) {
      setMessages((prev) => [...prev, { role: "assistant", content: streamingContent }]);
    }
    setStreamingContent("");
    setStreaming(false);
  };

  const clearConversation = () => {
    setMessages([]);
    setStreamingContent("");
    setLastUsage(null);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      runCompletion();
    }
  };

  return (
    <div className="flex h-full flex-col p-6 gap-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Playground</h1>
          <p className="text-gray-400 text-sm mt-1">Test models interactively · streaming · multi-turn</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearConversation} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 border border-gray-700 rounded-lg transition-colors">
            Clear conversation
          </button>
        )}
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Main chat area */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {/* System prompt */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={2}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-600 resize-none"
            />
          </div>

          {/* Thread */}
          {(messages.length > 0 || streamingContent) && (
            <div ref={threadRef} className="flex-1 overflow-y-auto bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4 min-h-32 max-h-96">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`text-xs font-mono px-1 pt-0.5 shrink-0 ${m.role === "user" ? "text-violet-400" : "text-gray-500"}`}>
                    {m.role === "user" ? "you" : "ai"}
                  </div>
                  <div className={`text-sm whitespace-pre-wrap rounded-xl px-3 py-2 max-w-[85%] ${
                    m.role === "user"
                      ? "bg-violet-600/20 text-gray-100 border border-violet-800/40"
                      : "bg-gray-800 text-gray-200"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {streamingContent && (
                <div className="flex gap-3">
                  <div className="text-xs font-mono px-1 pt-0.5 shrink-0 text-gray-500">ai</div>
                  <div className="text-sm whitespace-pre-wrap bg-gray-800 text-gray-200 rounded-xl px-3 py-2 max-w-[85%]">
                    {streamingContent}
                    <span className="animate-pulse ml-0.5">▍</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 text-sm text-red-400">{error}</div>
          )}

          {/* Input */}
          <div className="space-y-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="Message… (⌘↵ to send)"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-600 resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={runCompletion}
                disabled={streaming || !selectedModel || !input.trim()}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
              >
                {streaming ? "Generating…" : messages.length === 0 ? "Run" : "Send"}
              </button>
              {streaming && (
                <button onClick={stopCompletion} className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors">
                  Stop
                </button>
              )}
              {lastUsage && !streaming && (
                <span className="text-xs text-gray-500 ml-2">
                  {lastUsage.prompt_tokens} in · {lastUsage.completion_tokens} out
                  {lastUsage.cache_read_input_tokens > 0 && ` · ${lastUsage.cache_read_input_tokens} cached`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-52 shrink-0 space-y-4">
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
              {models.length === 0 && <option value="" disabled>Loading…</option>}
            </select>
            {selectedModel && (
              <Link href={`/models`} className="text-xs text-gray-600 hover:text-gray-400 mt-1 block transition-colors">
                ← model catalog
              </Link>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Temperature: {temperature}</label>
            <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full accent-violet-600" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Max Tokens: {maxTokens}</label>
            <input type="range" min="64" max="4096" step="64" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value))} className="w-full accent-violet-600" />
          </div>
          <div className="pt-2 border-t border-gray-800">
            <div className="text-xs text-gray-500 mb-1">Turns</div>
            <div className="text-lg font-bold text-white">{Math.floor(messages.length / 2)}</div>
            <div className="text-xs text-gray-600 mt-0.5">{messages.length} messages</div>
          </div>
        </div>
      </div>

      <CodeSnippet model={selectedModel} systemPrompt={systemPrompt} messages={messages} />
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400 text-sm">Loading…</div>}>
      <PlaygroundInner />
    </Suspense>
  );
}
