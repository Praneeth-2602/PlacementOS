"use client";

import { cn } from "@/lib/utils";

export function ReadinessGauge({ score, className }: { score: number; className?: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("relative mx-auto flex h-40 w-40 items-center justify-center", className)}>
      <svg className="-rotate-90" width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold">{Math.round(score)}</p>
        <p className="text-xs text-muted-foreground">Readiness</p>
      </div>
    </div>
  );
}
