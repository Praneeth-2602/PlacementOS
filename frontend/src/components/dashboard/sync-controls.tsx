"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSyncStatus } from "@/hooks/use-sync";
import { getOAuthUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

export function LeetCodeConnect({ defaultUsername }: { defaultUsername?: string | null }) {
  const [username, setUsername] = useState(defaultUsername ?? "");
  const { status, progress, syncLeetCode } = useSyncStatus("leetcode");
  const syncing = status === "syncing";

  const handleSync = async () => {
    if (!username.trim()) {
      toast.error("Enter your LeetCode username");
      return;
    }
    try {
      await syncLeetCode(username.trim());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        placeholder="LeetCode username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={syncing}
      />
      <Button onClick={handleSync} disabled={syncing}>
        {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {syncing ? `Syncing ${progress}%` : "Sync LeetCode"}
      </Button>
    </div>
  );
}

export function GitHubSyncButton({ isConnected }: { isConnected: boolean }) {
  const { status, progress, syncGitHub } = useSyncStatus("github");
  const syncing = status === "syncing";

  if (!isConnected) {
    return (
      <Button asChild variant="outline">
        <a href={getOAuthUrl("github")}>Connect GitHub</a>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      disabled={syncing}
      onClick={async () => {
        try {
          await syncGitHub();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Sync failed");
        }
      }}
    >
      {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      {syncing ? `Syncing ${progress}%` : "Sync GitHub"}
    </Button>
  );
}

export function SyncStatusBadge({
  leetcodeStatus,
  githubStatus,
}: {
  leetcodeStatus: string;
  githubStatus: string;
}) {
  const busy = leetcodeStatus === "syncing" || githubStatus === "syncing";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs",
        busy ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {busy && <Loader2 className="h-3 w-3 animate-spin" />}
      {busy ? "Syncing..." : "Sync idle"}
    </span>
  );
}
