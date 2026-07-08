"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeetCodeStats } from "@/lib/api";

export function LeetCodeStatsCard({ stats }: { stats: LeetCodeStats }) {
  const total = stats.easy_solved + stats.medium_solved + stats.hard_solved || 1;
  const segments = [
    { label: "Easy", value: stats.easy_solved, color: "bg-green-500" },
    { label: "Medium", value: stats.medium_solved, color: "bg-yellow-500" },
    { label: "Hard", value: stats.hard_solved, color: "bg-red-500" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>LeetCode Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          {segments.map((seg) => (
            <div
              key={seg.label}
              className={seg.color}
              style={{ width: `${(seg.value / total) * 100}%` }}
              title={`${seg.label}: ${seg.value}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          {segments.map((seg) => (
            <div key={seg.label}>
              <p className="font-semibold">{seg.value}</p>
              <p className="text-muted-foreground">{seg.label}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Streak: {stats.current_streak} days
          {stats.ranking ? ` · Rank #${stats.ranking.toLocaleString()}` : ""}
        </p>
      </CardContent>
    </Card>
  );
}
