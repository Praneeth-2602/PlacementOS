"use client";

import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/sidebar";
import { SyncStatusBadge } from "@/components/dashboard/sync-controls";
import { MobileNav } from "@/components/mobile-nav";
import { NotificationsBell } from "@/components/notifications-bell";
import { PushNotificationPrompt } from "@/components/push-notification-prompt";
import { UserHydrator } from "@/components/user-hydrator";
import { useUser } from "@/hooks/use-api";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/learn": "Learn",
  "/prepare": "Prepare",
  "/opportunities": "Opportunities",
  "/resume": "Resume",
  "/build": "Build",
  "/track": "Track",
  "/settings": "Settings",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const title = TITLES[pathname] ?? "PlacementOS";

  return (
    <div className="flex min-h-screen">
      <UserHydrator />
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="flex items-center gap-2">
            <SyncStatusBadge
              leetcodeStatus={user?.leetcode?.sync_status ?? "idle"}
              githubStatus={user?.github?.sync_status ?? "idle"}
            />
            <NotificationsBell />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 pb-24 md:p-6">
          <PushNotificationPrompt />
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
