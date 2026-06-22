"use client";

import { Terminal, GitBranch, ShieldCheck, Cpu } from "lucide-react";

export default function BuildPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-5">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-400">
          <Terminal className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Build Portfolios</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage project portfolios, track GitHub commits, and showcase systems.</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1 */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 space-y-4 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
              <GitBranch className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-zinc-200">GitHub Commit Integration</h3>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Verify code quality, track daily commit activity, and showcase real-world development patterns to recruiters.
          </p>
          <span className="inline-block text-[9px] uppercase tracking-wider font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
            Planned for Phase 2
          </span>
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 space-y-4 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-zinc-200">Portfolio Hosting</h3>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Host live projects directly from PlacementOS. Generate shareable, recruiter-friendly profile links.
          </p>
          <span className="inline-block text-[9px] uppercase tracking-wider font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
            Planned for Phase 2
          </span>
        </div>

        {/* Card 3: Project Quality verification */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 space-y-4 backdrop-blur-sm md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-zinc-200">Architecture Evaluation (Project Score: 10%)</h3>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Your readiness score allocates 10% weight to project depth (APIs, Database schema, testing, and CI/CD setup). Integrate your repositories to compute structural ratings.
          </p>
        </div>

      </div>
    </div>
  );
}
