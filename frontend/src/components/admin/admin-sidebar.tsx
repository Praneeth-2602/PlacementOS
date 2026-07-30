"use client";

import { ArrowLeft, Building2, CalendarDays, LayoutDashboard, LogOut, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useActiveOrg } from "@/hooks/use-active-org";
import { cn, getApiUrl } from "@/lib/utils";
import { useUserStore } from "@/stores/user.store";

const navItems = [
  { href: "/org", label: "Overview", icon: LayoutDashboard },
  { href: "/org/students", label: "Students", icon: Users },
  { href: "/org/drives", label: "Drives", icon: CalendarDays },
  { href: "/org/reports", label: "Reports", icon: Building2 },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const user = useUserStore((s) => s.user);
  const { orgs, activeOrg, setActiveOrgId } = useActiveOrg();

  return (
    <aside className="hidden h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
        <Building2 className="h-5 w-5" />
        <span className="text-lg font-bold tracking-tight">Institution</span>
      </div>

      {orgs.length > 0 && (
        <div className="border-b border-white/10 p-3">
          <label className="text-xs text-white/60">Active organization</label>
          <select
            value={activeOrg?.id ?? ""}
            onChange={(e) => setActiveOrgId(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/20 bg-transparent px-2 py-1.5 text-sm"
          >
            {orgs.map((org) => (
              <option key={org.id} value={org.id} className="text-foreground">
                {org.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/org" && pathname.startsWith(`${href}/`));
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
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to student app
        </Link>
        <div className="mt-2 flex items-center gap-3 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name ?? "User"}</p>
            <p className="truncate text-xs text-white/60">{user?.email}</p>
          </div>
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
            <span>Logout</span>
          </Button>
        </form>
      </div>
    </aside>
  );
}
