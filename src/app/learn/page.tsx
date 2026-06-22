"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { GraduationCap, ArrowRight, Code2, Trophy, Flame, AlertCircle } from "lucide-react";
import { getLeetCodeProfile } from "@/app/actions";

interface Profile {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  contestRating: number;
  streak: number;
}

export default function LearnPage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function loadData() {
      const data = await getLeetCodeProfile();
      if (data) {
        setProfile(data as Profile);
      }
    }
    loadData();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-5">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-400">
          <GraduationCap className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">DSA Tracker</h1>
          <p className="text-sm text-zinc-400 mt-1">Review core algorithmic statistics and problem solving consistency.</p>
        </div>
      </div>

      {/* Main Content */}
      {profile ? (
        <div className="space-y-8">
          {/* Linked Status */}
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between text-sm">
            <span className="text-zinc-400">LeetCode Sync is active for user: <strong className="text-indigo-400">{profile.username}</strong></span>
            <Link href="/settings" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors flex items-center gap-0.5">
              Manage Integration <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Solved Count */}
            <div className="rounded-2xl border border-zinc-800/85 bg-zinc-900/30 p-6 space-y-4 backdrop-blur-sm">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-orange-400" /> Solved Questions
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-zinc-100 tracking-tight">{profile.totalSolved}</span>
                <span className="text-zinc-500 text-xs">problems</span>
              </div>

              {/* Progress bars */}
              <div className="space-y-3 pt-3 border-t border-zinc-800/60">
                {/* Easy */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400 font-medium">Easy</span>
                    <span className="text-zinc-300 font-semibold">{profile.easySolved} solved</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (profile.easySolved / 150) * 100)}%` }} />
                  </div>
                </div>

                {/* Medium */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400 font-medium">Medium</span>
                    <span className="text-zinc-300 font-semibold">{profile.mediumSolved} solved</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-orange-500 h-full rounded-full" style={{ width: `${Math.min(100, (profile.mediumSolved / 150) * 100)}%` }} />
                  </div>
                </div>

                {/* Hard */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400 font-medium">Hard</span>
                    <span className="text-zinc-300 font-semibold">{profile.hardSolved} solved</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, (profile.hardSolved / 50) * 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Contest Rating */}
            <div className="rounded-2xl border border-zinc-800/85 bg-zinc-900/30 p-6 space-y-4 backdrop-blur-sm flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-indigo-400" /> Contest Rating
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-zinc-100 tracking-tight">
                    {profile.contestRating > 0 ? profile.contestRating : "—"}
                  </span>
                  {profile.contestRating > 0 && <span className="text-zinc-500 text-xs">points</span>}
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  {profile.contestRating > 1800 
                    ? "Exceptional contest performance. Ranked in top tier." 
                    : profile.contestRating > 0 
                    ? "Contest ranking active. Maintain regular contest participation." 
                    : "No contest participation recorded. Try joining the weekly contest."}
                </p>
              </div>

              <div className="border-t border-zinc-800/60 pt-3.5 mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-medium">Estimated Rank</span>
                  <span className="text-zinc-300 font-bold">
                    {profile.contestRating >= 2000 ? "Guardian" : profile.contestRating >= 1600 ? "Knight" : "Novice"}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Streak */}
            <div className="rounded-2xl border border-zinc-800/85 bg-zinc-900/30 p-6 space-y-4 backdrop-blur-sm flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500 animate-pulse" /> Active Streak
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-extrabold text-zinc-100 tracking-tight">{profile.streak}</span>
                  <span className="text-zinc-500 text-xs">days active</span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  Consistency is key to mastering technical interviews. Solve at least one problem daily to maintain your momentum.
                </p>
              </div>

              <div className="border-t border-zinc-800/60 pt-3.5 mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-medium">Streak Reward</span>
                  <span className="text-orange-500 font-bold flex items-center gap-0.5">
                    {profile.streak >= 10 ? "🔥 Supercharged" : profile.streak > 0 ? "⚡ Active" : "💤 Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-md font-bold text-zinc-300">LeetCode Profile Not Linked</h3>
            <p className="text-xs text-zinc-500">Link your account to fetch your problem-solving metrics and compute your readiness stats.</p>
          </div>
          <Link
            href="/settings"
            className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-[0_0_10px_rgba(99,102,241,0.2)]"
          >
            Configure in Settings <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
