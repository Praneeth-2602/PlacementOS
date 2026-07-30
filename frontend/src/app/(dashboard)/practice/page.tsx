"use client";

import { CheckCircle2, Code2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { FeatureGate } from "@/components/feature-gate";
import { ProBadge } from "@/components/feature-gate";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProblemRecommendations, useProblems } from "@/hooks/use-api";
import { ENTITLEMENTS } from "@/hooks/use-entitlements";
import type { ProblemDifficulty } from "@/lib/api";

const DIFFICULTIES: (ProblemDifficulty | "ALL")[] = ["ALL", "EASY", "MEDIUM", "HARD"];
const TOPICS = ["ALL", "Arrays", "Strings", "Trees", "Graphs", "DP", "Greedy", "Hashing"];

function difficultyVariant(d: ProblemDifficulty): "success" | "warning" | "danger" {
  return d === "EASY" ? "success" : d === "MEDIUM" ? "warning" : "danger";
}

export default function PracticePage() {
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("ALL");
  const [topic, setTopic] = useState("ALL");

  const params: Record<string, string> = {};
  if (difficulty !== "ALL") params.difficulty = difficulty;
  if (topic !== "ALL") params.topic = topic;

  const { data: problems = [], isLoading } = useProblems(params);
  const { data: recommendations = [] } = useProblemRecommendations();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Coding Practice</h2>
        <p className="text-muted-foreground">Solve problems against the in-app judge. Solved problems feed your DSA analytics.</p>
      </div>

      <FeatureGate
        entitlement={ENTITLEMENTS.unlimitedPractice}
        title="Personalized recommendations are a Pro feature"
        description="Upgrade to get embeddings-based problem recommendations tailored to your weak areas."
        fallback={null}
      >
        {recommendations.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" /> Recommended for you <ProBadge />
              </CardTitle>
              <CardDescription>Picked from your readiness gaps</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-3">
              {recommendations.slice(0, 3).map((rec) => (
                <Link key={rec.problem.id} href={`/practice/${rec.problem.id}`}>
                  <div className="rounded-md border bg-background p-3 transition-colors hover:border-primary/50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{rec.problem.title}</p>
                      <Badge variant={difficultyVariant(rec.problem.difficulty)}>{rec.problem.difficulty}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{rec.reason}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </FeatureGate>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => (
            <Button key={d} size="sm" variant={difficulty === d ? "default" : "outline"} onClick={() => setDifficulty(d)}>
              {d}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <Button key={t} size="sm" variant={topic === t ? "secondary" : "ghost"} onClick={() => setTopic(t)}>
              {t}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading problems..." />
      ) : problems.length === 0 ? (
        <EmptyState icon={Code2} title="No problems match these filters" description="Try a different difficulty or topic." />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {problems.map((problem) => (
              <Link
                key={problem.id}
                href={`/practice/${problem.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
              >
                {problem.solved ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Code2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1 truncate text-sm font-medium">{problem.title}</span>
                <Badge variant="outline">{problem.topic}</Badge>
                <Badge variant={difficultyVariant(problem.difficulty)}>{problem.difficulty}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
