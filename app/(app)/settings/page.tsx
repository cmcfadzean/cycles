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
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <path d="M3.5 21.5L21.5 3.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M21.5 21.5C21.5 21.5 21.5 12 21.5 8.5C21.5 5 18.5 3.5 18.5 3.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M3.5 3.5C3.5 3.5 3.5 12 3.5 15.5C3.5 19 6.5 21.5 6.5 21.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
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

