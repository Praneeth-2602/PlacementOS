"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  GraduationCap, 
  Terminal, 
  Users, 
  FileUser, 
  Gauge, 
  Briefcase, 
  Sliders,
  Sparkles
} from "lucide-react";

interface SidebarProps {
  currentScore?: number;
  currentStatus?: string;
  colorClass?: string;
}

export default function Sidebar({ currentScore = 52, currentStatus = "Developing", colorClass = "text-amber-500 border-amber-500/20 bg-amber-500/10" }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Learn", href: "/learn", icon: GraduationCap },
    { name: "Build", href: "/build", icon: Terminal },
    { name: "Prepare", href: "/prepare", icon: Users },
    { name: "Resume", href: "/resume", icon: FileUser },
    { name: "Track", href: "/track", icon: Gauge },
    { name: "Opportunities", href: "/opportunities", icon: Briefcase },
    { name: "Settings", href: "/settings", icon: Sliders },
  ];

  return (
    <aside className="w-64 border-r border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md text-zinc-100 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-zinc-800/50 gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
        </div>
        <span className="font-semibold text-lg bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400 tracking-tight">
          PlacementOS
        </span>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 w-1 h-5 rounded-r bg-indigo-500" />
              )}
              <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-indigo-400" : "text-zinc-400 group-hover:text-zinc-300"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Mini Profile / Readiness Card */}
      <div className="p-4 border-t border-zinc-800/50 bg-zinc-950/40">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium">Readiness Score</span>
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colorClass.split(" ")[1]} ${colorClass.split(" ")[2]} ${colorClass.split(" ")[0]}`}>
              {currentStatus}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-zinc-100 tracking-tight">{currentScore}</span>
            <span className="text-xs text-zinc-500">/100</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-1.5 rounded-full bg-gradient-to-r ${
                currentScore >= 80 
                  ? "from-emerald-500 to-teal-400" 
                  : currentScore >= 60 
                  ? "from-indigo-500 to-purple-400" 
                  : "from-amber-500 to-orange-400"
              }`}
              style={{ width: `${currentScore}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
