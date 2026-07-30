"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Circle, Clock, ExternalLink, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LoadingState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCourse } from "@/hooks/use-api";
import { api, type Lesson, type LessonProgressStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_ICON: Record<LessonProgressStatus, typeof Circle> = {
  NOT_STARTED: Circle,
  IN_PROGRESS: PlayCircle,
  COMPLETED: CheckCircle2,
};

export default function CourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();
  const { data: course, isLoading } = useCourse(params.courseId);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  useEffect(() => {
    if (course?.lessons?.length && !activeLessonId) {
      const firstIncomplete = course.lessons.find((l) => l.status !== "COMPLETED");
      setActiveLessonId((firstIncomplete ?? course.lessons[0]).id);
    }
  }, [course, activeLessonId]);

  const updateProgress = useMutation({
    mutationFn: ({ lessonId, status }: { lessonId: string; status: LessonProgressStatus }) =>
      api.updateLessonProgress(lessonId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content", "course", params.courseId] });
      queryClient.invalidateQueries({ queryKey: ["content", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["readiness"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState label="Loading course..." />;
  if (!course) return <p className="text-sm text-muted-foreground">Course not found.</p>;

  const activeLesson: Lesson | undefined = course.lessons.find((l) => l.id === activeLessonId);
  const total = course.lessons.length;
  const done = course.lessons.filter((l) => l.status === "COMPLETED").length;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link href="/content">
          <ArrowLeft className="mr-1 h-4 w-4" /> All roadmaps
        </Link>
      </Button>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">{course.title}</h2>
          <Badge variant="secondary">{course.track.replace("_", " ")}</Badge>
        </div>
        <p className="text-muted-foreground">{course.description}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {done}/{total} lessons complete
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Lessons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {course.lessons.map((lesson) => {
              const Icon = STATUS_ICON[lesson.status ?? "NOT_STARTED"];
              return (
                <button
                  key={lesson.id}
                  onClick={() => setActiveLessonId(lesson.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    activeLessonId === lesson.id ? "bg-accent" : "hover:bg-accent/50",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      lesson.status === "COMPLETED" ? "text-emerald-500" : "text-muted-foreground",
                    )}
                  />
                  <span className="flex-1 truncate">{lesson.title}</span>
                  {lesson.estimated_minutes ? (
                    <span className="text-xs text-muted-foreground">{lesson.estimated_minutes}m</span>
                  ) : null}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          {activeLesson ? (
            <>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>{activeLesson.title}</CardTitle>
                  {activeLesson.estimated_minutes ? (
                    <Badge variant="outline">
                      <Clock className="mr-1 h-3 w-3" />
                      {activeLesson.estimated_minutes} min
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeLesson.body ? (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {activeLesson.body}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Open the resource below to study this lesson.</p>
                )}
                {activeLesson.resource_url && (
                  <Button asChild variant="outline" size="sm">
                    <a href={activeLesson.resource_url} target="_blank" rel="noreferrer">
                      Open resource <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateProgress.isPending}
                    onClick={() => updateProgress.mutate({ lessonId: activeLesson.id, status: "IN_PROGRESS" })}
                  >
                    Mark in progress
                  </Button>
                  <Button
                    size="sm"
                    disabled={updateProgress.isPending || activeLesson.status === "COMPLETED"}
                    onClick={() => updateProgress.mutate({ lessonId: activeLesson.id, status: "COMPLETED" })}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    {activeLesson.status === "COMPLETED" ? "Completed" : "Mark complete"}
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Select a lesson to begin.
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
