"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useUserStore } from "@/stores/user.store";

export function useUser() {
  const user = useUserStore((s) => s.user);
  const isLoading = useUserStore((s) => s.isLoading);
  return { user, isLoading };
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await api.dashboard();
      return res.data!;
    },
  });
}

export function useReadiness() {
  return useQuery({
    queryKey: ["readiness"],
    queryFn: async () => {
      const res = await api.readiness();
      return res.data!;
    },
  });
}

export function useLeetCodeStats(enabled = true) {
  return useQuery({
    queryKey: ["leetcode", "stats"],
    queryFn: async () => {
      const res = await api.leetcodeStats();
      return res.data!;
    },
    enabled,
    retry: false,
  });
}

export function useLeetCodeTopics(enabled = true) {
  return useQuery({
    queryKey: ["leetcode", "topics"],
    queryFn: async () => {
      const res = await api.leetcodeTopics();
      return res.data ?? [];
    },
    enabled,
  });
}

export function useGitHubRepos(enabled = true) {
  return useQuery({
    queryKey: ["github", "repos"],
    queryFn: async () => {
      const res = await api.githubRepos();
      return res.data ?? [];
    },
    enabled,
    retry: false,
  });
}

export function useGitHubActivity(enabled = true) {
  return useQuery({
    queryKey: ["github", "activity"],
    queryFn: async () => {
      const res = await api.githubActivity();
      return res.data!;
    },
    enabled,
    retry: false,
  });
}

export function useDashboardToday() {
  return useQuery({
    queryKey: ["dashboard", "today"],
    queryFn: async () => {
      const res = await api.dashboardToday();
      return res.data;
    },
  });
}

export function useCSSubject(subject: string, enabled = true) {
  return useQuery({
    queryKey: ["learn", "cs", subject],
    queryFn: async () => (await api.learnCS(subject)).data ?? [],
    enabled,
  });
}

export function useCSSummary() {
  return useQuery({
    queryKey: ["learn", "cs", "summary"],
    queryFn: async () => (await api.learnCSSummary()).data ?? [],
  });
}

export function useAptitudeSection(section: string, enabled = true) {
  return useQuery({
    queryKey: ["learn", "aptitude", section],
    queryFn: async () => (await api.learnAptitude(section)).data ?? [],
    enabled,
  });
}

export function useNotes(subject?: string) {
  return useQuery({
    queryKey: ["notes", subject ?? "all"],
    queryFn: async () => (await api.notes(subject)).data ?? [],
  });
}

export function usePrepareQuestions(params?: Record<string, string>) {
  return useQuery({
    queryKey: ["prepare", "questions", params],
    queryFn: async () => (await api.prepareQuestions(params)).data ?? [],
  });
}

export function useStarTemplates() {
  return useQuery({
    queryKey: ["prepare", "star-templates"],
    queryFn: async () => (await api.starTemplates()).data ?? [],
  });
}

export function useMockSessions() {
  return useQuery({
    queryKey: ["prepare", "sessions"],
    queryFn: async () => (await api.mockSessions()).data ?? [],
  });
}

export function useMockSessionStats() {
  return useQuery({
    queryKey: ["prepare", "sessions", "stats"],
    queryFn: async () => (await api.mockSessionStats()).data,
  });
}

export function useOpportunities(params?: Record<string, string>) {
  return useQuery({
    queryKey: ["opportunities", params],
    queryFn: async () => (await api.opportunities(params)).data ?? [],
  });
}

export function useOpportunityDeadlines() {
  return useQuery({
    queryKey: ["opportunities", "deadlines"],
    queryFn: async () => (await api.opportunityDeadlines()).data ?? [],
  });
}

export function useResumes() {
  return useQuery({
    queryKey: ["resume", "list"],
    queryFn: async () => (await api.resumes()).data ?? [],
  });
}

export function useBuildProjects() {
  return useQuery({
    queryKey: ["build", "projects"],
    queryFn: async () => (await api.buildProjects()).data ?? [],
  });
}

export function usePortfolio() {
  return useQuery({
    queryKey: ["build", "portfolio"],
    queryFn: async () => (await api.buildPortfolio()).data,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.notifications()).data ?? [],
  });
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => (await api.unreadNotificationsCount()).data?.unread ?? 0,
    refetchInterval: 15_000,
  });
}

export function useReadinessBenchmarks() {
  return useQuery({
    queryKey: ["readiness", "benchmarks"],
    queryFn: async () => (await api.readinessBenchmarks()).data,
  });
}

export function useCompanyReadiness(companyName: string, enabled = true) {
  return useQuery({
    queryKey: ["readiness", "company", companyName],
    queryFn: async () => (await api.readinessByCompany(companyName)).data,
    enabled: enabled && !!companyName,
  });
}

export function useDsaHeatmap() {
  return useQuery({
    queryKey: ["track", "heatmap"],
    queryFn: async () => (await api.dsaHeatmap()).data ?? [],
  });
}

export function useScoreHistory() {
  return useQuery({
    queryKey: ["track", "score-history"],
    queryFn: async () => (await api.scoreHistory()).data ?? [],
  });
}

export function useTopicBreakdown() {
  return useQuery({
    queryKey: ["track", "topic-breakdown"],
    queryFn: async () => (await api.topicBreakdown()).data ?? [],
  });
}

export function useWeeklyReport() {
  return useQuery({
    queryKey: ["track", "weekly-report"],
    queryFn: async () => (await api.weeklyReport()).data ?? [],
  });
}
