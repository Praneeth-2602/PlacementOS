"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { api, getSyncStatusUrl, type SyncState } from "@/lib/api";
import { useSyncStore } from "@/stores/sync.store";

type SyncType = "leetcode" | "github";

export function useSyncStatus(type: SyncType) {
  const status = useSyncStore((s) => (type === "leetcode" ? s.leetcodeStatus : s.githubStatus));
  const progress = useSyncStore((s) => (type === "leetcode" ? s.leetcodeProgress : s.githubProgress));
  const setStatus = useSyncStore((s) => (type === "leetcode" ? s.setLeetCodeStatus : s.setGitHubStatus));
  const eventSourceRef = useRef<EventSource | null>(null);
  const queryClient = useQueryClient();

  const subscribe = useCallback(() => {
    eventSourceRef.current?.close();
    const es = new EventSource(getSyncStatusUrl(type), { withCredentials: true });
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { status: SyncState; progress: number };
      setStatus(payload.status, payload.progress);
      if (payload.status === "complete") {
        toast.success(`${type === "leetcode" ? "LeetCode" : "GitHub"} sync complete`);
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["readiness"] });
        queryClient.invalidateQueries({ queryKey: [type] });
        es.close();
      }
      if (payload.status === "failed") {
        toast.error(`${type === "leetcode" ? "LeetCode" : "GitHub"} sync failed`);
        es.close();
      }
    };

    es.onerror = () => es.close();
  }, [queryClient, setStatus, type]);

  useEffect(() => () => eventSourceRef.current?.close(), []);

  const syncLeetCode = async (username: string) => {
    setStatus("syncing", 0);
    subscribe();
    await api.leetcodeSync(username);
  };

  const syncGitHub = async () => {
    setStatus("syncing", 0);
    subscribe();
    await api.githubSync();
  };

  return {
    status,
    progress,
    syncLeetCode,
    syncGitHub,
    subscribe,
  };
}
