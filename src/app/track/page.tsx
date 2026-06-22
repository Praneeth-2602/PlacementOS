"use client";

import React, { useState, useEffect } from "react";
import { Gauge, Sliders, Info, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
import { getReadinessScores, updateReadinessScores, getLeetCodeProfile } from "@/app/actions";
import { calculateReadiness } from "@/lib/readiness";

export default function TrackPage() {
  const [dsa, setDsa] = useState(52);
  const [cs, setCs] = useState(50);
  const [resume, setResume] = useState(50);
  const [projects, setProjects] = useState(50);
  const [interview, setInterview] = useState(50);
  const [leetcodeSolved, setLeetcodeSolved] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      const scores = await getReadinessScores();
      if (scores) {
        setDsa(Math.round(scores.dsaScore));
        setCs(Math.round(scores.csScore));
        setResume(Math.round(scores.resumeScore));
        setProjects(Math.round(scores.projectsScore));
        setInterview(Math.round(scores.interviewScore));
      }

      const leetcode = await getLeetCodeProfile();
      if (leetcode && leetcode.totalSolved) {
        setLeetcodeSolved(leetcode.totalSolved);
      }
    }
    loadData();
  }, []);

  const readiness = calculateReadiness(dsa, cs, resume, projects, interview);

  const handleSliderChange = async (category: string, value: number) => {
    let newDsa = dsa;
    let newCs = cs;
    let newResume = resume;
    let newProjects = projects;
    let newInterview = interview;

    if (category === "dsa") { setDsa(value); newDsa = value; }
    else if (category === "cs") { setCs(value); newCs = value; }
    else if (category === "resume") { setResume(value); newResume = value; }
    else if (category === "projects") { setProjects(value); newProjects = value; }
    else if (category === "interview") { setInterview(value); newInterview = value; }

    setIsSaving(true);
    await updateReadinessScores({
      dsaScore: newDsa,
      csScore: newCs,
      resumeScore: newResume,
      projectsScore: newProjects,
      interviewScore: newInterview,
    });
    setIsSaving(false);
  };

  const syncDsaWithLeetCode = () => {
    if (leetcodeSolved !== null) {
      // Calculate a score: e.g. solving 300 problems gives 100% DSA score.
      const calculatedDsa = Math.min(100, Math.round((leetcodeSolved / 300) * 100));
      handleSliderChange("dsa", calculatedDsa);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center">
            <Gauge className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Readiness Engine</h1>
            <p className="text-sm text-zinc-400 mt-1">Configure weights, adjust core metrics, and recalculate score.</p>
          </div>
        </div>

        {isSaving && (
          <span className="text-xs text-zinc-500 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving changes...
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Sliders panel */}
        <div className="md:col-span-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 space-y-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-zinc-200">Adjust Preparedness Metrics</h2>
          
          <div className="space-y-6">
            {/* DSA Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-300">Data Structures & Algorithms (40% weight)</span>
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">{dsa}/100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={dsa}
                onChange={(e) => handleSliderChange("dsa", parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
              />
              {leetcodeSolved !== null && (
                <button
                  onClick={syncDsaWithLeetCode}
                  className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-indigo-400 font-medium transition-colors pt-0.5"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Auto-sync with LeetCode solved count ({leetcodeSolved} solved)
                </button>
              )}
            </div>

            {/* CS Fundamentals Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-300">Computer Science Fundamentals (25% weight)</span>
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">{cs}/100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={cs}
                onChange={(e) => handleSliderChange("cs", parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
              />
            </div>

            {/* Resume Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-300">Resume / Profile Quality (15% weight)</span>
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">{resume}/100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={resume}
                onChange={(e) => handleSliderChange("resume", parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
              />
            </div>

            {/* Projects Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-300">Projects Portfolio (10% weight)</span>
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">{projects}/100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={projects}
                onChange={(e) => handleSliderChange("projects", parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
              />
            </div>

            {/* Interview Prep Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-300">Interview & Behavioral (10% weight)</span>
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">{interview}/100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={interview}
                onChange={(e) => handleSliderChange("interview", parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Calculated Score panel */}
        <div className="space-y-8">
          {/* Circular Score Gauge */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 flex flex-col items-center justify-center text-center space-y-4 backdrop-blur-sm">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Aggregated Placement Readiness</h3>
            
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Radial background */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  className="stroke-zinc-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  className={`transition-all duration-300 ${
                    readiness.score >= 80 
                      ? "stroke-emerald-500" 
                      : readiness.score >= 60 
                      ? "stroke-indigo-500" 
                      : "stroke-amber-500"
                  }`}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 62}
                  strokeDashoffset={2 * Math.PI * 62 * (1 - readiness.score / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-zinc-100 tracking-tight">{readiness.score}</span>
                <span className="text-[10px] text-zinc-500 font-medium">/ 100</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className={`inline-block text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full border ${readiness.colorClass.split(" ")[1]} ${readiness.colorClass.split(" ")[2]} ${readiness.colorClass.split(" ")[0]}`}>
                {readiness.status}
              </span>
              <p className="text-[10px] text-zinc-500 mt-2">
                {readiness.score < 60 
                  ? "Requires reinforcement across core modules." 
                  : readiness.score < 80 
                  ? "Competitive score. Polish resume & mocks to secure offers." 
                  : "Excellent setup. Highly qualified for recruitment pipelines."}
              </p>
            </div>
          </div>

          {/* Guidelines */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5 space-y-3">
            <h3 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-zinc-500" /> Scoring Guide
            </h3>
            <ul className="space-y-2 text-[11px] text-zinc-500 list-disc list-inside">
              <li><strong className="text-zinc-400">DSA:</strong> Linked to technical challenges and Leetcode proficiency.</li>
              <li><strong className="text-zinc-400">CS:</strong> DBMS, OS, networking, and OOP logic checks.</li>
              <li><strong className="text-zinc-400">Resume:</strong> Parser friendliness, keyword matching, formatting.</li>
              <li><strong className="text-zinc-400">Projects:</strong> Fully deployed, Github repository stars, system specs.</li>
              <li><strong className="text-zinc-400">Interview:</strong> Confidence, behavioral answers, storytelling framework.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
