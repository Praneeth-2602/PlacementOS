import Link from "next/link";
import { 
  Gauge, 
  CalendarRange, 
  CheckSquare, 
  Code2, 
  LineChart, 
  Flame, 
  Clock, 
  TrendingUp, 
  PlusCircle, 
  Sliders, 
  ChevronRight,
  Sparkles
} from "lucide-react";
import { getReadinessScores, getLeetCodeProfile, getJobApplications } from "./actions";
import { calculateReadiness } from "@/lib/readiness";

export default async function DashboardPage() {
  // Fetch data from database
  const scores = await getReadinessScores();
  const leetcode = await getLeetCodeProfile();
  const applications = await getJobApplications();

  // 1. Calculate readiness score
  const readiness = calculateReadiness(
    scores.dsaScore,
    scores.csScore,
    scores.resumeScore,
    scores.projectsScore,
    scores.interviewScore
  );

  // 2. Generate Today's Plan dynamically based on scores
  const planItems = [];
  if (scores.dsaScore < 60) {
    planItems.push({ text: "Solve 2 Medium problems on Arrays or Hashing", duration: "45m", category: "DSA" });
  } else {
    planItems.push({ text: "Solve 1 Hard dynamic programming challenge", duration: "1h", category: "DSA" });
  }

  if (scores.csScore < 60) {
    planItems.push({ text: "Study DBMS Transaction Isolation levels & ACID properties", duration: "30m", category: "CS" });
  } else {
    planItems.push({ text: "Review TCP/IP Handshake vs UDP latency differences", duration: "20m", category: "CS" });
  }

  if (scores.resumeScore < 70) {
    planItems.push({ text: "Add quantifiable metrics to your main project description", duration: "15m", category: "Resume" });
  }

  if (applications.length === 0) {
    planItems.push({ text: "Identify and track 2 new job openings", duration: "20m", category: "App" });
  } else {
    const interviewApp = applications.find(a => a.status === "Interview");
    if (interviewApp) {
      planItems.push({ text: `Prepare for upcoming interview with ${interviewApp.company}`, duration: "1h", category: "Interview" });
    } else {
      planItems.push({ text: "Send a follow-up or check status on pending applications", duration: "15m", category: "App" });
    }
  }

  // 3. Upcoming Job Deadlines (Next 3)
  const upcomingDeadlines = applications
    .filter(app => new Date(app.deadline) >= new Date() && app.status !== "Rejected" && app.status !== "Offer")
    .slice(0, 3);

  // 4. Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Interested": return "text-zinc-400 bg-zinc-800/40 border-zinc-700/50";
      case "Applied": return "text-sky-400 bg-sky-500/5 border-sky-500/10";
      case "OA": return "text-amber-400 bg-amber-500/5 border-amber-500/10";
      case "Interview": return "text-purple-400 bg-purple-500/5 border-purple-500/10";
      default: return "text-zinc-400 bg-zinc-800/40 border-zinc-700/50";
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-100 tracking-tight flex items-center gap-2">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-400 mt-1.5">Welcome back. Track your metrics, link integrations, and manage job offers.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-4 py-2 border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/50 text-zinc-300 rounded-xl text-sm font-semibold transition-all"
          >
            <Sliders className="w-4 h-4" />
            Integrations
          </Link>
          <Link
            href="/opportunities"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)]"
          >
            <PlusCircle className="w-4 h-4" />
            New Job
          </Link>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        
        {/* Card 1: Readiness Score (Span 3) */}
        <div className="md:col-span-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 flex flex-col justify-between backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full filter blur-xl group-hover:bg-indigo-500/10 transition-all duration-300" />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-indigo-400" /> Readiness Score
              </span>
              <Link href="/track" className="text-[10px] text-zinc-500 hover:text-indigo-400 font-semibold transition-colors flex items-center gap-0.5">
                Optimize <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold tracking-tight text-zinc-100">{readiness.score}</span>
                  <span className="text-zinc-500 text-sm font-semibold">/100</span>
                </div>
                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 mt-2 rounded-full border text-center ${readiness.colorClass.split(" ")[1]} ${readiness.colorClass.split(" ")[2]} ${readiness.colorClass.split(" ")[0]}`}>
                  {readiness.status}
                </span>
              </div>

              {/* Mini visual weights */}
              <div className="flex-1 space-y-1.5 border-l border-zinc-800/60 pl-6 text-xs text-zinc-400">
                <div className="flex justify-between"><span>DSA (40%)</span><span className="font-semibold text-zinc-200">{scores.dsaScore}/100</span></div>
                <div className="flex justify-between"><span>CS (25%)</span><span className="font-semibold text-zinc-200">{scores.csScore}/100</span></div>
                <div className="flex justify-between"><span>Resume (15%)</span><span className="font-semibold text-zinc-200">{scores.resumeScore}/100</span></div>
                <div className="flex justify-between"><span>Other (20%)</span><span className="font-semibold text-zinc-200">{Math.round((scores.projectsScore + scores.interviewScore) / 2)}/100</span></div>
              </div>
            </div>
          </div>

          <div className="w-full bg-zinc-800/40 rounded-full h-1.5 overflow-hidden mt-6">
            <div 
              className={`h-1.5 rounded-full bg-gradient-to-r ${
                readiness.score >= 80 
                  ? "from-emerald-500 to-teal-400" 
                  : readiness.score >= 60 
                  ? "from-indigo-500 to-purple-400" 
                  : "from-amber-500 to-orange-400"
              }`}
              style={{ width: `${readiness.score}%` }}
            />
          </div>
        </div>

        {/* Card 2: Progress Snapshot (Span 3) */}
        <div className="md:col-span-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 flex flex-col justify-between backdrop-blur-sm group">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-orange-400" /> LeetCode Integration
              </span>
              {leetcode ? (
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                  Linked: <span className="text-orange-400">{leetcode.username}</span>
                </span>
              ) : (
                <Link href="/settings" className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors flex items-center gap-0.5">
                  Link Account <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {leetcode ? (
              <div className="grid grid-cols-3 gap-4 text-center">
                {/* Total Solved */}
                <div className="p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl">
                  <span className="text-2xl font-bold text-zinc-100">{leetcode.totalSolved}</span>
                  <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 mt-1">Solved</p>
                </div>
                {/* Rating */}
                <div className="p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl relative overflow-hidden">
                  <span className="text-2xl font-bold text-zinc-100">
                    {leetcode.contestRating > 0 ? leetcode.contestRating : "—"}
                  </span>
                  <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 mt-1 flex items-center justify-center gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5 text-indigo-400" /> Rating
                  </p>
                </div>
                {/* Streak */}
                <div className="p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl">
                  <span className="text-2xl font-bold text-zinc-100 flex items-center justify-center gap-1">
                    {leetcode.streak} <Flame className={`w-4 h-4 ${leetcode.streak > 0 ? "text-orange-500" : "text-zinc-600"}`} />
                  </span>
                  <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 mt-1">Streak</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <p className="text-xs text-zinc-500">No profile data connected.</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">Enter your username in Settings to view metrics here.</p>
              </div>
            )}
          </div>

          {leetcode && (
            <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-4 border-t border-zinc-800/40 pt-3">
              <span>Easy: <strong className="text-zinc-300">{leetcode.easySolved}</strong></span>
              <span>Medium: <strong className="text-zinc-300">{leetcode.mediumSolved}</strong></span>
              <span>Hard: <strong className="text-zinc-300">{leetcode.hardSolved}</strong></span>
            </div>
          )}
        </div>

        {/* Card 3: Today's Plan (Span 3) */}
        <div className="md:col-span-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 space-y-4 backdrop-blur-sm">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-indigo-400" /> Today's Plan
          </span>

          <div className="space-y-2.5">
            {planItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-zinc-800/60 bg-zinc-950/40 hover:border-zinc-700/60 transition-all duration-200">
                <div className="flex items-start gap-2.5">
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-indigo-500/20 text-indigo-400 bg-indigo-500/5 mt-0.5 shrink-0">
                    {item.category}
                  </span>
                  <span className="text-xs font-semibold text-zinc-300 leading-normal">{item.text}</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-medium shrink-0 ml-3">{item.duration}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 4: Upcoming Deadlines (Span 3) */}
        <div className="md:col-span-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 flex flex-col justify-between backdrop-blur-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarRange className="w-4 h-4 text-emerald-400" /> Job Applications
              </span>
              <Link href="/opportunities" className="text-[10px] text-zinc-500 hover:text-indigo-400 font-semibold transition-colors flex items-center gap-0.5">
                All Jobs <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-xs text-zinc-500">No upcoming deadlines.</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">Add job postings in Opportunities to track schedules.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingDeadlines.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-3 rounded-xl border border-zinc-800/60 bg-zinc-950/40">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-zinc-200">{app.company}</h4>
                      <p className="text-[10px] text-zinc-500">{app.role}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                      <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {new Date(app.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card 5: Weekly Progress (Span 6 - full width at bottom) */}
        <div className="md:col-span-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 space-y-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <LineChart className="w-4 h-4 text-indigo-400" /> Weekly Activity Snapshot
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 animate-pulse" /> Keep consistency to boost ranking
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-2">
            {[
              { day: "Mon", status: "completed", rating: 120 },
              { day: "Tue", status: "completed", rating: 90 },
              { day: "Wed", status: "partial", rating: 40 },
              { day: "Thu", status: "completed", rating: 110 },
              { day: "Fri", status: "none", rating: 0 },
              { day: "Sat", status: "completed", rating: 150 },
              { day: "Sun", status: "none", rating: 0 },
            ].map((d, idx) => (
              <div key={idx} className="flex flex-col items-center p-3 rounded-xl bg-zinc-950/30 border border-zinc-900/80">
                <span className="text-[10px] font-medium text-zinc-500">{d.day}</span>
                <div className="w-full h-8 flex items-end justify-center mt-2.5">
                  <div 
                    className={`w-4 rounded-t-sm transition-all duration-300 ${
                      d.status === "completed" 
                        ? "bg-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.3)]" 
                        : d.status === "partial" 
                        ? "bg-indigo-500/40" 
                        : "bg-zinc-850"
                    }`}
                    style={{ height: d.status !== "none" ? `${(d.rating / 150) * 100}%` : "15%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
