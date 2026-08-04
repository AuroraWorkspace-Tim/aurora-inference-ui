"use client";
import { useState } from "react";
import apiKeys from "@/public/data/api_keys.json";
import { Copy, Eye, EyeOff, Trash2 } from "lucide-react";

const scopeStyle: Record<string, string> = {
  personal: "bg-blue-900/40 text-blue-400 border-blue-800",
  team: "bg-violet-900/40 text-violet-400 border-violet-800",
  environment: "bg-emerald-900/40 text-emerald-400 border-emerald-800",
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState(apiKeys);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScope, setNewScope] = useState("personal");
  const [copied, setCopied] = useState<string | null>(null);

  const handleRevoke = (id: string) => {
    setKeys((k) => k.map((key) => key.id === id ? { ...key, revoked: true } : key));
  };

  const handleCopy = (preview: string, id: string) => {
    navigator.clipboard.writeText(`sk-aurora-${preview}`).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const newKey = {
      id: `key-${Date.now()}`,
      name: newName,
      key_preview: `sk-...${Math.random().toString(36).slice(2, 6)}`,
      scope: newScope,
      created_at: new Date().toISOString(),
      last_used: new Date().toISOString(),
      expires_at: null,
      revoked: false,
    };
    setKeys((k) => [newKey, ...k]);
    setNewName("");
    setShowNew(false);
  };

  const active = keys.filter((k) => !k.revoked);
  const revoked = keys.filter((k) => k.revoked);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">API Keys</h1>
          <p className="text-gray-400 text-sm mt-1">{active.length} active keys</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors"
        >
          + Create Key
        </button>
      </div>

      {showNew && (
        <div className="bg-gray-900 border border-violet-700 rounded-xl p-4 space-y-3">
          <div className="text-sm font-medium text-gray-200">New API Key</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Production Key"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-600"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Scope</label>
              <select
                value={newScope}
                onChange={(e) => setNewScope(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-600"
              >
                <option value="personal">Personal</option>
                <option value="team">Team</option>
                <option value="environment">Environment</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg">Create</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800">
            <tr className="text-xs text-gray-500">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Key</th>
              <th className="text-left px-4 py-3">Scope</th>
              <th className="text-left px-4 py-3">Last Used</th>
              <th className="text-left px-4 py-3">Expires</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {active.map((k) => (
              <tr key={k.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                <td className="px-4 py-3 font-medium text-gray-200">{k.name}</td>
                <td className="px-4 py-3 font-mono text-gray-400 text-xs">
                  <div className="flex items-center gap-2">
                    {k.key_preview}
                    <button onClick={() => handleCopy(k.key_preview, k.id)} className="text-gray-600 hover:text-gray-400">
                      {copied === k.id ? <span className="text-emerald-400 text-xs">✓</span> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded border capitalize ${scopeStyle[k.scope]}`}>{k.scope}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(k.last_used).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{k.expires_at ? new Date(k.expires_at).toLocaleDateString() : "Never"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleRevoke(k.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {revoked.length > 0 && (
        <div className="text-xs text-gray-500 mt-2">{revoked.length} revoked key(s) hidden</div>
      )}
    </div>
  );
}
