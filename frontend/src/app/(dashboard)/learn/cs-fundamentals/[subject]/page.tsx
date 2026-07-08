"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCSSubject } from "@/hooks/use-api";

function badgeForStatus(status: string): "success" | "warning" | "danger" | "secondary" {
  if (status === "COMPLETED") return "success";
  if (status === "IN_PROGRESS") return "warning";
  if (status === "NEEDS_REVISION") return "danger";
  return "secondary";
}

export default function CSFundamentalsSubjectPage() {
  const params = useParams<{ subject: string }>();
  const subject = (params.subject ?? "os").toUpperCase();
  const { data: topics = [] } = useCSSubject(subject);

  const completion = useMemo(() => {
    if (!topics.length) return 0;
    const completed = topics.filter((topic) => topic.status === "COMPLETED").length;
    return Math.round((completed / topics.length) * 100);
  }, [topics]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{subject} Deep Dive</CardTitle>
          <CardDescription>Review all topics, confidence and revision flags for {subject}.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 h-2 rounded bg-muted">
            <div className="h-2 rounded bg-primary" style={{ width: `${Math.max(completion, 5)}%` }} />
          </div>
          <p className="mb-4 text-sm text-muted-foreground">{completion}% completion</p>
          <div className="space-y-2">
            {topics.map((topic) => (
              <div key={topic.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{topic.topic}</p>
                  <p className="text-muted-foreground">Confidence: {topic.confidence}/100</p>
                </div>
                <Badge variant={badgeForStatus(topic.status)}>{topic.status.replaceAll("_", " ")}</Badge>
              </div>
            ))}
            {topics.length === 0 && <p className="text-sm text-muted-foreground">No subject data yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
