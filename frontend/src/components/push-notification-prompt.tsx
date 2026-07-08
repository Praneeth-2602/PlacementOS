"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function PushNotificationPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    const dismissed = localStorage.getItem("push_prompt_dismissed") === "1";
    if (!dismissed && Notification.permission === "default") setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <Card className="mb-4 border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
        <p className="text-sm">Enable push notifications for sync completion, deadlines and streak reminders.</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={async () => {
              await Notification.requestPermission();
              setVisible(false);
            }}
          >
            Allow
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              localStorage.setItem("push_prompt_dismissed", "1");
              setVisible(false);
            }}
          >
            Later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
