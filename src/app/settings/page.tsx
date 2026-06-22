"use client";

import React, { useState, useEffect } from "react";
import { Sliders, RefreshCw, CheckCircle, AlertTriangle, Database } from "lucide-react";
import { saveLeetCodeUsername, getLeetCodeProfile, syncLeetCodeData } from "@/app/actions";

interface Profile {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  contestRating: number;
  streak: number;
}

export default function SettingsPage() {
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const data = await getLeetCodeProfile();
      if (data) {
        setProfile(data);
        setUsername(data.username);
      }
    }
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const result = await saveLeetCodeUsername(username);
    setIsLoading(false);

    if (result.success && result.profile) {
      setProfile(result.profile as Profile);
      setSuccess("LeetCode profile linked successfully!");
      // Reload layout score
      window.location.reload();
    } else {
      setError(result.error || "An error occurred");
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    setSuccess(null);

    const result = await syncLeetCodeData();
    setIsSyncing(false);

    if (result.success && result.profile) {
      setProfile(result.profile as Profile);
      setSuccess("LeetCode data synced successfully!");
      // Reload layout score
      window.location.reload();
    } else {
      setError(result.error || "Sync failed");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-5">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-400">
          <Sliders className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Settings</h1>
          <p className="text-sm text-zinc-400 mt-1">Configure your profile, connect third-party platforms, and check DB status.</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* LeetCode Integration Panel */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 space-y-6 backdrop-blur-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-zinc-200">LeetCode Integration</h2>
            <p className="text-xs text-zinc-500">Sync solved stats, contest ratings, and daily streaks automatically.</p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400">LeetCode Username</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. tourist"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] focus:ring-2 focus:ring-indigo-500/20"
                >
                  {isLoading ? "Fetching..." : "Link Profile"}
                </button>
              </div>
            </div>
          </form>

          {/* Sync Button */}
          {profile && (
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40">
              <div>
                <p className="text-xs font-semibold text-zinc-300">Linked as: <span className="text-indigo-400">{profile.username}</span></p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Last updated: {new Date().toLocaleTimeString()}</p>
              </div>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Sync"}
              </button>
            </div>
          )}

          {/* Feedback messages */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Database Status Panel */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 space-y-6 backdrop-blur-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-zinc-200">System Connection</h2>
            <p className="text-xs text-zinc-500">View database connectivity and infrastructure logs.</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Database className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-zinc-300">SQLite Local Engine</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Status: Connected (dev.db)</p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
            </div>

            <div className="p-4 rounded-xl border border-zinc-850 bg-zinc-950/20 space-y-2">
              <h3 className="text-xs font-semibold text-zinc-400">Technical Details</h3>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-500">
                <div>Framework: <span className="text-zinc-400">Next.js 16</span></div>
                <div>Runtime: <span className="text-zinc-400">Node v26.3.0</span></div>
                <div>ORM: <span className="text-zinc-400">Prisma Client v5</span></div>
                <div>Database: <span className="text-zinc-400">SQLite (In-Process)</span></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
