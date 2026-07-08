"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications, useUnreadNotificationsCount } from "@/hooks/use-api";
import { api } from "@/lib/api";

export function NotificationsBell() {
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: refresh,
  });

  const markAllRead = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: refresh,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()} className="h-7 text-xs">
            Mark all read
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.slice(0, 8).map((notification) => (
          <DropdownMenuItem key={notification.id} onClick={() => markRead.mutate(notification.id)} className="block space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{notification.title}</p>
              {!notification.is_read && <Badge variant="warning">New</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{notification.body}</p>
          </DropdownMenuItem>
        ))}
        {!notifications.length && <p className="px-2 py-3 text-sm text-muted-foreground">No notifications yet.</p>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
