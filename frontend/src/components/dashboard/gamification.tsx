"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGamification, useLeaderboard } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function XpBadgeCard() {
  const { data, isLoading } = useGamification();
  if (isLoading || !data) return null;

  const progress =
    data.xp_to_next_level > 0
      ? Math.min(100, Math.round(((data.xp % data.xp_to_next_level) / data.xp_to_next_level) * 100))
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-4 w-4 text-amber-500" /> Level {data.level}
        </CardTitle>
        <CardDescription>{data.xp} XP total</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress to level {data.level + 1}</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1 h-2 rounded bg-muted">
            <div className="h-2 rounded bg-primary" style={{ width: `${Math.max(progress, 3)}%` }} />
          </div>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1 text-sm font-medium">
            <Award className="h-4 w-4 text-primary" /> Badges
          </p>
          {data.badges.length === 0 ? (
            <p className="text-xs text-muted-foreground">Solve problems and complete lessons to earn badges.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.badges.map((badge) => (
                <div
                  key={badge.id}
                  title={badge.description ?? badge.name}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
                    badge.earned ? "bg-primary/10 text-foreground" : "opacity-40",
                  )}
                >
                  <span>{badge.icon ?? "🏅"}</span>
                  {badge.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function LeaderboardCard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useLeaderboard();

  const optIn = useMutation({
    mutationFn: (value: boolean) => api.setLeaderboardOptIn(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification", "leaderboard"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-4 w-4 text-amber-500" /> Leaderboard
          </CardTitle>
          <CardDescription>Cohort of {data?.cohort_size ?? 0} · anonymized</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!data?.opted_in ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Opt in to compare your XP with peers. Your real name is never shown.</p>
            <Button size="sm" onClick={() => optIn.mutate(true)} disabled={optIn.isPending}>
              Join leaderboard
            </Button>
          </div>
        ) : (
          <>
            {(data?.entries ?? []).slice(0, 5).map((entry) => (
              <div
                key={entry.rank}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm",
                  entry.is_current_user ? "bg-primary/10 font-medium" : "",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="w-5 text-muted-foreground">#{entry.rank}</span>
                  {entry.display_name}
                  {entry.is_current_user && <Badge variant="secondary">You</Badge>}
                </span>
                <span>{entry.xp} XP</span>
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={() => optIn.mutate(false)} disabled={optIn.isPending}>
              Leave leaderboard
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
