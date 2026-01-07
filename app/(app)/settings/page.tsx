"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [linearConnected, setLinearConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  useEffect(() => {
    checkLinearConnection();
  }, []);

  async function checkLinearConnection() {
    try {
      const res = await fetch("/api/settings/linear");
      if (!res.ok) throw new Error("Failed to check connection");
      const data = await res.json();
      setLinearConnected(data.connected);
    } catch {
      toast.error("Failed to check Linear connection");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnectLinear(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error("Please enter your Linear API key");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/linear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to connect Linear");
      }

      toast.success("Linear connected successfully!");
      setLinearConnected(true);
      setApiKey("");
      setShowApiKeyInput(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect Linear");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnectLinear() {
    if (!confirm("Are you sure you want to disconnect Linear?")) return;

    try {
      const res = await fetch("/api/settings/linear", {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to disconnect");

      toast.success("Linear disconnected");
      setLinearConnected(false);
    } catch {
      toast.error("Failed to disconnect Linear");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-gray-300 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your integrations and preferences</p>
      </div>

      {/* Integrations Section */}
      <div className="card">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-gray-100">Integrations</h2>
          <p className="text-sm text-gray-400 mt-1">
            Connect external services to import data
          </p>
        </div>

        <div className="p-6">
          {/* Linear Integration */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Linear Logo */}
              <div className="w-12 h-12 rounded-lg bg-[#5E6AD2] flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-white"
                  viewBox="0 0 100 100"
                  fill="currentColor"
                >
                  <path d="M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5765C20.0515 94.4522 5.54779 79.9485 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.25003025.5006.5356468.4359C8.95236 45.3858 16.6514 40.0263 22.1846 32.8185c6.0451-7.8716 9.6963-17.6573 10.2664-28.3872.0322-.6048-.5206-1.06878-1.086-.90177C11.5092 8.91622.0406298 27.0213.00189135 46.8891ZM22.5753 32.1174c-5.4106 7.0406-12.91 12.2727-20.8879 14.2383.5096 21.8506 12.8685 40.8856 29.6797 51.2349L85.6128 43.3713c-10.3493-16.8112-29.3843-29.17-51.2349-29.6797-1.9656 7.978-7.1977 15.4773-14.2383 20.8879l2.4357-2.4357ZM95.6576 60.6663c-.9487-.2225-1.546.9075-.8571 1.5965l36.5765 36.576c.6889.689 1.8189.0916 1.5765-.857-4.3023-18.4257-18.806-32.9294-37.296-37.3155ZM45.8908 3.52577c-.6049.56623-1.0688 1.08603-.9018 1.08603 10.73.57008 20.5155 4.22127 28.387 10.2664 7.2078 5.5332 12.5673 13.2323 14.5068 21.6479.1933-.0001.5165-.0001.7356-.0001 19.8677-.0387 37.9728 11.4707 42.655 31.3064.0648.2856.1527.5181.4359.5356-.0647-19.8677-11.4707-37.9728-31.3064-42.6549-7.8716-6.0451-17.6573-9.69632-28.3872-10.26641-.5429-.02897-1.0688.90178-.9018 1.086.3252.36063.6543.71813.9872 1.07242l2.7894-2.7895L45.8908 3.52577Z" />
                </svg>
              </div>

              <div>
                <h3 className="font-medium text-gray-100">Linear</h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  Import projects from Linear as pitches
                </p>
                {linearConnected && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm text-emerald-400">Connected</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              {linearConnected ? (
                <button
                  onClick={handleDisconnectLinear}
                  className="btn-secondary text-red-400 hover:text-red-300 hover:border-red-500/50"
                >
                  Disconnect
                </button>
              ) : showApiKeyInput ? (
                <form onSubmit={handleConnectLinear} className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="lin_api_..."
                    className="input w-64"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? "Connecting..." : "Connect"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowApiKeyInput(false);
                      setApiKey("");
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowApiKeyInput(true)}
                  className="btn-primary"
                >
                  Connect
                </button>
              )}
            </div>
          </div>

          {/* Help text for getting API key */}
          {showApiKeyInput && !linearConnected && (
            <div className="mt-4 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
              <h4 className="text-sm font-medium text-gray-200 mb-2">
                How to get your Linear API key:
              </h4>
              <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                <li>Go to Linear Settings → API</li>
                <li>Click "Create new API key"</li>
                <li>Give it a name (e.g., "Cycles App")</li>
                <li>Copy the key and paste it above</li>
              </ol>
              <a
                href="https://linear.app/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 mt-3"
              >
                Open Linear API Settings
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

