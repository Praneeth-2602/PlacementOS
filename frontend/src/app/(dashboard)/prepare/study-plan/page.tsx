"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, CalendarRange, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { FeatureGate, ProBadge } from "@/components/feature-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ENTITLEMENTS } from "@/hooks/use-entitlements";
import { api, type StudyPlan } from "@/lib/api";

export default function StudyPlanPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);

  const generate = useMutation({
    mutationFn: () => api.studyPlan(),
    onSuccess: (response) => {
      setPlan(response.data ?? null);
      toast.success("Study plan generated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const groupedByDay = plan
    ? plan.tasks.reduce<Record<number, StudyPlan["tasks"]>>((acc, task) => {
        (acc[task.day] ??= []).push(task);
        return acc;
      }, {})
    : {};

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link href="/prepare">
          <ArrowLeft className="mr-1 h-4 w-4" /> Prepare
        </Link>
      </Button>

      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          Personalized Study Plan <ProBadge />
        </h2>
        <p className="text-muted-foreground">Generated from your readiness gaps and roadmap progress.</p>
      </div>

      <FeatureGate
        entitlement={ENTITLEMENTS.studyPlan}
        title="Study plans are a Pro feature"
        description="Upgrade to generate a personalized, day-by-day prep plan from your readiness gaps."
      >
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-muted-foreground">
              We&apos;ll analyze your weakest areas and build a focused plan for the week ahead.
            </p>
            <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
              <Sparkles className="mr-1 h-4 w-4" />
              {generate.isPending ? "Generating..." : plan ? "Regenerate" : "Generate plan"}
            </Button>
          </CardContent>
        </Card>

        {plan && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Focus areas</CardTitle>
                <CardDescription>Where you&apos;ll gain the most readiness</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {plan.focus_areas.map((area) => (
                  <Badge key={area} variant="secondary">
                    {area}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-3">
              {Object.entries(groupedByDay).map(([day, tasks]) => (
                <Card key={day}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarRange className="h-4 w-4 text-primary" /> Day {day}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {tasks.map((task, index) => (
                      <div key={index} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{task.title}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{task.category}</Badge>
                            {task.estimated_minutes ? (
                              <span className="text-xs text-muted-foreground">{task.estimated_minutes}m</span>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{task.detail}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </FeatureGate>
    </div>
  );
}
