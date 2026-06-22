"use client";

import { FileUser, Sparkles, FileText, CheckCircle } from "lucide-react";

export default function ResumePage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-5">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-400">
          <FileUser className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Resume Builder</h1>
          <p className="text-sm text-zinc-400 mt-1">Review resumes against ATS filters, match keywords, and manage versions.</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1 */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 space-y-4 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-zinc-200">ATS Keyword Matcher</h3>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Extract target keywords from job descriptions and automatically calculate resume alignment scores.
          </p>
          <span className="inline-block text-[9px] uppercase tracking-wider font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
            Planned for Phase 2
          </span>
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 space-y-4 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-zinc-200">Version Management</h3>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Store and toggle between tailored resume versions for frontend, backend, or fullstack configurations.
          </p>
          <span className="inline-block text-[9px] uppercase tracking-wider font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
            Planned for Phase 2
          </span>
        </div>

        {/* Card 3 */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 space-y-4 backdrop-blur-sm md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
              <CheckCircle className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-zinc-200">Resume Quality (Resume Score: 15%)</h3>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            A stellar resume acts as the gateway to tech interviews. Upload your PDF to scan formatting, detect action verbs, and verify page limits.
          </p>
        </div>

      </div>
    </div>
  );
}
