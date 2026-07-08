import { create } from "zustand";

export type SyncStatus = "idle" | "syncing" | "complete" | "failed";

interface SyncState {
  leetcodeStatus: SyncStatus;
  githubStatus: SyncStatus;
  leetcodeProgress: number;
  githubProgress: number;
  setLeetCodeStatus: (status: SyncStatus, progress?: number) => void;
  setGitHubStatus: (status: SyncStatus, progress?: number) => void;
  reset: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  leetcodeStatus: "idle",
  githubStatus: "idle",
  leetcodeProgress: 0,
  githubProgress: 0,
  setLeetCodeStatus: (leetcodeStatus, progress) =>
    set((s) => ({
      leetcodeStatus,
      leetcodeProgress: progress ?? s.leetcodeProgress,
    })),
  setGitHubStatus: (githubStatus, progress) =>
    set((s) => ({
      githubStatus,
      githubProgress: progress ?? s.githubProgress,
    })),
  reset: () =>
    set({
      leetcodeStatus: "idle",
      githubStatus: "idle",
      leetcodeProgress: 0,
      githubProgress: 0,
    }),
}));
