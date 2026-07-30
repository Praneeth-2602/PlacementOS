"use client";

import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronLeft,
  Code2,
  CreditCard,
  FileText,
  GraduationCap,
  Hammer,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  MessagesSquare,
  Settings,
  Target,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn, getApiUrl } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";
import { useUserStore } from "@/stores/user.store";

const navSections: Array<{ label: string; items: Array<{ href: string; label: string; icon: typeof LayoutDashboard }> }> = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Learn & Practice",
    items: [
      { href: "/learn", label: "Learn", icon: BookOpen },
      { href: "/content", label: "Roadmaps", icon: LibraryBig },
      { href: "/practice", label: "Practice", icon: Code2 },
      { href: "/prepare", label: "Prepare", icon: Target },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/community", label: "Community", icon: MessagesSquare },
      { href: "/mentors", label: "Mentors", icon: GraduationCap },
    ],
  },
  {
    label: "Career",
    items: [
      { href: "/opportunities", label: "Opportunities", icon: Briefcase },
      { href: "/drives", label: "Drives", icon: CalendarDays },
      { href: "/resume", label: "Resume", icon: FileText },
      { href: "/build", label: "Build", icon: Hammer },
      { href: "/track", label: "Track", icon: BarChart3 },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/org", label: "Institution", icon: Building2 },
      { href: "/billing", label: "Billing", icon: CreditCard },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const user = useUserStore((s) => s.user);

  return (
    <aside
      className={cn(
        "hidden h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200 md:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        {!collapsed && <span className="text-lg font-bold tracking-tight">PlacementOS</span>}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-sidebar-foreground hover:bg-white/10">
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto p-2">
        {navSections.map((section) => (
          <div key={section.label} className="space-y-1">
            {!collapsed && (
              <p className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">{section.label}</p>
            )}
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name ?? "User"}</p>
              <p className="truncate text-xs text-white/60">{user?.email}</p>
            </div>
          )}
        </div>
        <div className="mt-2">
          <ThemeToggle />
        </div>
        <form action={`${getApiUrl()}/auth/logout`} method="POST" className="mt-3">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Logout</span>}
          </Button>
        </form>
      </div>
    </aside>
  );
}
