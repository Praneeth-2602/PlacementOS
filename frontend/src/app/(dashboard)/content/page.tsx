"use client";

import { BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { EmptyState, LoadingState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCourses } from "@/hooks/use-api";
import type { Course, ContentTrack } from "@/lib/api";

const TRACK_LABELS: Record<ContentTrack, string> = {
  DSA: "Data Structures & Algorithms",
  CS: "CS Fundamentals",
  SYSTEM_DESIGN: "System Design",
};

function ProgressRing({ percent }: { percent: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0">
      <circle cx="24" cy="24" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
      <circle
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
      <text x="24" y="28" textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
        {percent}%
      </text>
    </svg>
  );
}

function CourseCard({ course }: { course: Course }) {
  const total = course.lesson_count ?? 0;
  const done = course.completed_count ?? 0;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <Link href={`/content/${course.id}`}>
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardContent className="flex items-center gap-4 p-4">
          <ProgressRing percent={percent} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{course.title}</p>
            <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {done}/{total} lessons
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ContentPage() {
  const { data: courses = [], isLoading } = useCourses();

  const grouped = useMemo(() => {
    const map = new Map<ContentTrack, Course[]>();
    for (const course of courses) {
      const list = map.get(course.track) ?? [];
      list.push(course);
      map.set(course.track, list);
    }
    return map;
  }, [courses]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Prep Roadmaps</h2>
        <p className="text-muted-foreground">Curated tracks to build placement readiness. Progress feeds your score.</p>
      </div>

      {isLoading ? (
        <LoadingState label="Loading roadmaps..." />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No roadmaps yet"
          description="Curated prep roadmaps will appear here once published."
        />
      ) : (
        (Object.keys(TRACK_LABELS) as ContentTrack[])
          .filter((track) => (grouped.get(track)?.length ?? 0) > 0)
          .map((track) => (
            <section key={track} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{TRACK_LABELS[track]}</h3>
                <Badge variant="secondary">{grouped.get(track)?.length}</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {grouped.get(track)?.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </section>
          ))
      )}
    </div>
  );
}
