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

// ---------------------------------------------------------------------------
// Phase 6 — Onboarding
// ---------------------------------------------------------------------------

export function useOnboardingStatus(enabled = true) {
  return useQuery({
    queryKey: ["onboarding", "status"],
    queryFn: async () => (await api.onboardingStatus()).data,
    enabled,
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// Phase 7 — Content
// ---------------------------------------------------------------------------

export function useCourses() {
  return useQuery({
    queryKey: ["content", "courses"],
    queryFn: async () => (await api.courses()).data ?? [],
  });
}

export function useCourse(id: string, enabled = true) {
  return useQuery({
    queryKey: ["content", "course", id],
    queryFn: async () => (await api.course(id)).data,
    enabled: enabled && !!id,
  });
}

// ---------------------------------------------------------------------------
// Phase 7 — Practice
// ---------------------------------------------------------------------------

export function useProblems(params?: Record<string, string>) {
  return useQuery({
    queryKey: ["practice", "problems", params],
    queryFn: async () => (await api.problems(params)).data ?? [],
  });
}

export function useProblem(id: string, enabled = true) {
  return useQuery({
    queryKey: ["practice", "problem", id],
    queryFn: async () => (await api.problem(id)).data,
    enabled: enabled && !!id,
  });
}

export function useProblemRecommendations(enabled = true) {
  return useQuery({
    queryKey: ["practice", "recommendations"],
    queryFn: async () => (await api.problemRecommendations()).data ?? [],
    enabled,
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// Phase 7 — Community
// ---------------------------------------------------------------------------

export function useThreads(sort: "hot" | "new" | "top" = "hot") {
  return useQuery({
    queryKey: ["community", "threads", sort],
    queryFn: async () => (await api.threads(sort)).data ?? [],
  });
}

export function useThread(id: string, enabled = true) {
  return useQuery({
    queryKey: ["community", "thread", id],
    queryFn: async () => (await api.thread(id)).data,
    enabled: enabled && !!id,
  });
}

// ---------------------------------------------------------------------------
// Phase 7 — Mentors
// ---------------------------------------------------------------------------

export function useMentors(params?: Record<string, string>) {
  return useQuery({
    queryKey: ["mentors", params],
    queryFn: async () => (await api.mentors(params)).data ?? [],
  });
}

export function useMentorRequests() {
  return useQuery({
    queryKey: ["mentors", "requests"],
    queryFn: async () => (await api.mentorRequests()).data ?? [],
  });
}

// ---------------------------------------------------------------------------
// Phase 7 — Gamification
// ---------------------------------------------------------------------------

export function useGamification() {
  return useQuery({
    queryKey: ["gamification", "summary"],
    queryFn: async () => (await api.gamification()).data,
    retry: false,
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["gamification", "leaderboard"],
    queryFn: async () => (await api.leaderboard()).data,
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// Phase 8 — Organizations
// ---------------------------------------------------------------------------

export function useMyOrgs() {
  return useQuery({
    queryKey: ["org", "mine"],
    queryFn: async () => (await api.myOrgs()).data ?? [],
    retry: false,
  });
}

export function useOrg(id: string, enabled = true) {
  return useQuery({
    queryKey: ["org", id],
    queryFn: async () => (await api.org(id)).data,
    enabled: enabled && !!id,
  });
}

export function useOrgMembers(id: string, params?: Record<string, string>, enabled = true) {
  return useQuery({
    queryKey: ["org", id, "members", params],
    queryFn: async () => (await api.orgMembers(id, params)).data ?? [],
    enabled: enabled && !!id,
  });
}

export function useOrgReadiness(id: string, enabled = true) {
  return useQuery({
    queryKey: ["org", id, "analytics", "readiness"],
    queryFn: async () => (await api.orgReadiness(id)).data,
    enabled: enabled && !!id,
  });
}

export function useOrgAtRisk(id: string, enabled = true) {
  return useQuery({
    queryKey: ["org", id, "analytics", "at-risk"],
    queryFn: async () => (await api.orgAtRisk(id)).data ?? [],
    enabled: enabled && !!id,
  });
}

export function useOrgFunnel(id: string, enabled = true) {
  return useQuery({
    queryKey: ["org", id, "analytics", "funnel"],
    queryFn: async () => (await api.orgFunnel(id)).data,
    enabled: enabled && !!id,
  });
}

export function useOrgDrives(id: string, enabled = true) {
  return useQuery({
    queryKey: ["org", id, "drives"],
    queryFn: async () => (await api.orgDrives(id)).data ?? [],
    enabled: enabled && !!id,
  });
}

export function useOrgPlacementReport(id: string, params?: Record<string, string>, enabled = true) {
  return useQuery({
    queryKey: ["org", id, "reports", "placement", params],
    queryFn: async () => (await api.orgPlacementReport(id, params)).data,
    enabled: enabled && !!id,
  });
}

export function useDrives() {
  return useQuery({
    queryKey: ["drives"],
    queryFn: async () => (await api.drives()).data ?? [],
  });
}

// ---------------------------------------------------------------------------
// Phase 9 — Billing
// ---------------------------------------------------------------------------

export function usePlans() {
  return useQuery({
    queryKey: ["billing", "plans"],
    queryFn: async () => (await api.plans()).data ?? [],
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: async () => (await api.subscription()).data,
    retry: false,
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ["billing", "invoices"],
    queryFn: async () => (await api.invoices()).data ?? [],
    retry: false,
  });
}
