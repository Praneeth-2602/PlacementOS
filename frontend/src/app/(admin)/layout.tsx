"use client";

import { usePathname } from "next/navigation";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { NotificationsBell } from "@/components/notifications-bell";
import { UserHydrator } from "@/components/user-hydrator";

const TITLES: Record<string, string> = {
  "/org": "Organization Overview",
  "/org/students": "Students",
  "/org/drives": "Campus Drives",
  "/org/reports": "Reports",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Institution";

  return (
    <div className="flex min-h-screen">
      <UserHydrator />
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <h1 className="text-lg font-semibold">{title}</h1>
          <NotificationsBell />
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
