"use client";

import { BarChart3, BookOpen, Briefcase, FileText, Hammer, LayoutDashboard, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const mobileItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/learn", icon: BookOpen, label: "Learn" },
  { href: "/prepare", icon: Target, label: "Prepare" },
  { href: "/opportunities", icon: Briefcase, label: "Opportunities" },
  { href: "/resume", icon: FileText, label: "Resume" },
  { href: "/build", icon: Hammer, label: "Build" },
  { href: "/track", icon: BarChart3, label: "Track" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background md:hidden">
      <div className="grid grid-cols-7">
        {mobileItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn("flex flex-col items-center gap-1 py-2 text-[10px]", active ? "text-primary" : "text-muted-foreground")}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
