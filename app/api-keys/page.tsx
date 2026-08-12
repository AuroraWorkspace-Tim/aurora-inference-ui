"use client";
import { useState, useEffect } from "react";
import { Copy, Trash2 } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key_preview: string;
  scope: string;
  created_at: string;
  last_used: string;
  expires_at: string | null;
  revoked: boolean;
}

const scopeStyle: Record<string, string> = {
  personal: "bg-blue-900/40 text-blue-400 border-blue-800",
  team: "bg-violet-900/40 text-violet-400 border-violet-800",
  environment: "bg-emerald-900/40 text-emerald-400 border-emerald-800",
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScope, setNewScope] = useState("personal");
  const [copied, setCopied] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      const r = await fetch("/api/keys");
      const data = await r.json();
      setKeys(data);
    } finally {
      setLoading(false);
    }
  }

  const handleRevoke = async (id: string) => {
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    setKeys((ks) =>
      ks.map((k) => (k.id === id ? { ...k, revoked: true } : k))
    );
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const r = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, scope: newScope }),
    });
    if (!r.ok) return;
    const data = await r.json();
    setCreatedKey(data.key);
    setKeys((ks) => [{ ...data, revoked: false }, ...ks]);
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
          <p className="text-gray-400 text-sm mt-1">
            {loading ? "Loading…" : `${active.length} active keys`}
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors"
        >
          + Create Key
        </button>
      </div>

      {createdKey && (
        <div className="bg-emerald-950 border border-emerald-700 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-emerald-400">
            Key created — copy it now. It will not be shown again.
          </p>
          <div className="flex items-center gap-3 bg-gray-950 rounded-lg px-4 py-2 font-mono text-sm text-gray-200">
            <span className="flex-1 break-all">{createdKey}</span>
            <button
              onClick={() => handleCopy(createdKey, "new")}
              className="shrink-0 text-gray-400 hover:text-gray-200"
            >
              {copied === "new" ? (
                <span className="text-emerald-400 text-xs">✓ Copied</span>
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <button
            onClick={() => setCreatedKey(null)}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            I have saved my key
          </button>
        </div>
      )}

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
            <button
              onClick={handleCreate}
              className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg"
            >
              Create
            </button>
            <button
              onClick={() => setShowNew(false)}
              className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg"
            >
              Cancel
            </button>
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
              <tr
                key={k.id}
                className="border-b border-gray-800/50 hover:bg-gray-800/20"
              >
                <td className="px-4 py-3 font-medium text-gray-200">
                  {k.name}
                </td>
                <td className="px-4 py-3 font-mono text-gray-400 text-xs">
                  <div className="flex items-center gap-2">
                    {k.key_preview}
                    <button
                      onClick={() => handleCopy(k.key_preview, k.id)}
                      className="text-gray-600 hover:text-gray-400"
                    >
                      {copied === k.id ? (
                        <span className="text-emerald-400 text-xs">✓</span>
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded border capitalize ${
                      scopeStyle[k.scope] ??
                      "bg-gray-800 text-gray-400 border-gray-700"
                    }`}
                  >
                    {k.scope}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(k.last_used).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {k.expires_at
                    ? new Date(k.expires_at).toLocaleDateString()
                    : "Never"}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleRevoke(k.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {revoked.length > 0 && (
        <div className="text-xs text-gray-500 mt-2">
          {revoked.length} revoked key(s) hidden
        </div>
      )}
    </div>
  );
}
