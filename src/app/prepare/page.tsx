"use client";

import { Users, Presentation, Shield, FileQuestion } from "lucide-react";

export default function PreparePage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-5">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-400">
          <Users className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Interview Prep</h1>
          <p className="text-sm text-zinc-400 mt-1">Practice mock interviews, analyze behavioral answers, and study questions.</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1 */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 space-y-4 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
              <Presentation className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-zinc-200">Interview Twin (AI Avatar)</h3>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Conduct a mock voice/text interview with an AI trained on recruiter questions for your preferred companies.
          </p>
          <span className="inline-block text-[9px] uppercase tracking-wider font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
            Planned for Phase 2
          </span>
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 space-y-4 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
              <FileQuestion className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-zinc-200">Technical Question Bank</h3>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Study questions covering Operating Systems, Database Management systems, Computer Networks, and OOP logic.
          </p>
          <span className="inline-block text-[9px] uppercase tracking-wider font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
            Planned for Phase 2
          </span>
        </div>

        {/* Card 3 */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 space-y-4 backdrop-blur-sm md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-zinc-200">Interview Confidence (Interview Score: 10%)</h3>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Practice storytelling frameworks (STAR method) to optimize the behavioral and storytelling aspects of interviews.
          </p>
        </div>

      </div>
    </div>
  );
}
