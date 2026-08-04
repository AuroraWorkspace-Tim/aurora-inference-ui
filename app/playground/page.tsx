"use client";
import { useState, useEffect, useRef } from "react";
import models from "@/public/data/models.json";

const textModels = models.filter((m) => m.modality === "text" || m.modality === "code");

const SAMPLE_RESPONSES: Record<string, string> = {
  default: `Sure! Here's a concise explanation:\n\nLarge Language Models (LLMs) are neural networks trained on vast amounts of text data. They learn statistical patterns in language, enabling them to:\n\n1. **Generate coherent text** — completing sentences, writing essays, or producing code\n2. **Understand context** — maintaining conversation state across many turns\n3. **Follow instructions** — responding appropriately to diverse prompts\n4. **Reason step-by-step** — breaking down complex problems into logical steps\n\nModels like DeepSeek V4 and Llama 3.1 use the Transformer architecture with billions of parameters, enabling remarkable generalization from training data to novel tasks.\n\nIs there a specific aspect you'd like to explore further?`,
};

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
  const [selectedModel, setSelectedModel] = useState(textModels[1].id);
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful AI assistant.");
  const [userMessage, setUserMessage] = useState("Explain how large language models work in simple terms.");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runCompletion = () => {
    if (streaming) return;
    setResponse("");
    setDone(false);
    setStreaming(true);

    const target = SAMPLE_RESPONSES.default;
    let i = 0;
    intervalRef.current = setInterval(() => {
      i += Math.floor(Math.random() * 4) + 1;
      if (i >= target.length) {
        setResponse(target);
        setStreaming(false);
        setDone(true);
        clearInterval(intervalRef.current!);
      } else {
        setResponse(target.slice(0, i));
      }
    }, 18);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

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
          <button
            onClick={runCompletion}
            disabled={streaming}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
          >
            {streaming ? "Generating…" : "Run"}
          </button>

          {(response || streaming) && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 min-h-32">
              <div className="text-xs text-gray-500 mb-2">Response {streaming && <span className="animate-pulse">▍</span>}</div>
              <div className="text-sm text-gray-200 whitespace-pre-wrap">{response}</div>
              {done && (
                <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500 flex gap-4">
                  <span>~{response.split(" ").length} tokens</span>
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
              {textModels.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
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
