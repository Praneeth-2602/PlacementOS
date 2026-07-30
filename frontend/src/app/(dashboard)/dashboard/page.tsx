"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { CommitGraph } from "@/components/dashboard/commit-graph";
import { MotivationCard, TodaysPlan, UpcomingDeadlines } from "@/components/dashboard/empty-states";
import { LeaderboardCard, XpBadgeCard } from "@/components/dashboard/gamification";
import { LeetCodeStatsCard } from "@/components/dashboard/leetcode-stats";
import { ProgressSnapshot } from "@/components/dashboard/progress-snapshot";
import { ReadinessGauge } from "@/components/dashboard/readiness-gauge";
import { Badge } from "@/components/ui/badge";
import { GitHubSyncButton, LeetCodeConnect } from "@/components/dashboard/sync-controls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboard, useDashboardToday, useOpportunityDeadlines, useReadinessBenchmarks, useUser } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { useSyncStatus } from "@/hooks/use-sync";

export default function DashboardPage() {
  const { user } = useUser();
  const { data: dashboard, isLoading } = useDashboard();
  const { data: todayPlan } = useDashboardToday();
  const { data: deadlines } = useOpportunityDeadlines();
  const { data: benchmarks } = useReadinessBenchmarks();
  const { syncGitHub } = useSyncStatus("github");
  const autoSynced = useRef(false);
  const targetCompanies = dashboard?.target_companies?.slice(0, 3) ?? ["Google", "Meta", "Startup"];
  const { data: readinessByCompany } = useQuery({
    queryKey: ["readiness", "company-cards", targetCompanies],
    queryFn: async () => {
      const responses = await Promise.all(targetCompanies.map((company) => api.readinessByCompany(company)));
      return responses.map((response) => response.data).filter(Boolean);
    },
    enabled: targetCompanies.length > 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shouldSync = new URLSearchParams(window.location.search).get("github_sync") === "1";
    if (shouldSync && user?.github?.is_connected && !autoSynced.current) {
      autoSynced.current = true;
      syncGitHub().catch(() => undefined);
    }
  }, [syncGitHub, user?.github?.is_connected]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading dashboard...</p>;
  }

  const readiness = dashboard?.readiness.overall_score ?? 0;
  const progress = dashboard?.progress;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h2>
          <p className="text-muted-foreground">Your placement readiness at a glance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="warning">🔥 {dashboard?.streak_current ?? 0} day streak</Badge>
          <LeetCodeConnect defaultUsername={user?.leetcode?.username} />
          <GitHubSyncButton isConnected={!!user?.github?.is_connected} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Readiness Score</CardTitle>
            <CardDescription>DSA + Projects weighted (Phase 2)</CardDescription>
          </CardHeader>
          <CardContent>
            <ReadinessGauge score={readiness} />
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>DSA: {Math.round(dashboard?.readiness.dsa_score ?? 0)}</span>
              <span>Projects: {Math.round(dashboard?.readiness.projects_score ?? 0)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {progress && (
            <ProgressSnapshot
              leetcodeSolved={progress.leetcode_total_solved}
              githubRepos={progress.github_repo_count}
              githubStars={progress.github_total_stars}
            />
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Goals</CardTitle>
              <CardDescription>DSA and CS completion targets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm">DSA: {dashboard?.weekly_goal?.dsa_completed ?? 0}/{dashboard?.weekly_goal?.dsa_target ?? 0}</p>
                <div className="mt-1 h-2 rounded bg-muted">
                  <div
                    className="h-2 rounded bg-primary"
                    style={{
                      width: `${Math.max(
                        Math.round(
                          (((dashboard?.weekly_goal?.dsa_completed ?? 0) / Math.max(dashboard?.weekly_goal?.dsa_target ?? 1, 1)) * 100),
                        ),
                        4,
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm">CS: {dashboard?.weekly_goal?.cs_completed ?? 0}/{dashboard?.weekly_goal?.cs_target ?? 0}</p>
                <div className="mt-1 h-2 rounded bg-muted">
                  <div
                    className="h-2 rounded bg-primary"
                    style={{
                      width: `${Math.max(
                        Math.round(
                          (((dashboard?.weekly_goal?.cs_completed ?? 0) / Math.max(dashboard?.weekly_goal?.cs_target ?? 1, 1)) * 100),
                        ),
                        4,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Peer Benchmark</CardTitle>
            <CardDescription>
              Cohort {benchmarks?.cohort.year ?? "-"} ({benchmarks?.cohort.size ?? 0} peers)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">You are in top {100 - (benchmarks?.percentile.overall ?? 0)}%</p>
            <div className="h-2 rounded bg-muted">
              <div className="h-2 rounded bg-primary" style={{ width: `${benchmarks?.percentile.overall ?? 0}%` }} />
            </div>
            <p>DSA percentile: {benchmarks?.percentile.dsa ?? 0}</p>
            <p>CS percentile: {benchmarks?.percentile.cs ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Company Readiness</CardTitle>
            <CardDescription>Target-company specific breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {readinessByCompany?.map((companyCard) => (
              <div key={companyCard?.company} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{companyCard?.company}</p>
                <p className="text-muted-foreground">Overall: {Math.round(companyCard?.overall_score ?? 0)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {dashboard?.leetcode_stats && <LeetCodeStatsCard stats={dashboard.leetcode_stats} />}
        {dashboard?.github_activity?.contribution_calendar && (
          <CommitGraph calendar={dashboard.github_activity.contribution_calendar} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <XpBadgeCard />
        <LeaderboardCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <TodaysPlan
          tasks={todayPlan?.tasks}
          csTopics={todayPlan?.cs_topics}
          upcomingCTA={todayPlan?.upcoming_cta}
        />
        <UpcomingDeadlines deadlines={deadlines} />
        <MotivationCard />
      </div>
    </div>
  );
}
