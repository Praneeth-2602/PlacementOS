import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDailyQuote } from "@/lib/quotes";
import type { Opportunity } from "@/lib/api";

export function MotivationCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Motivation</CardTitle>
        <CardDescription>Keep your streak alive</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm italic text-muted-foreground">&ldquo;{getDailyQuote()}&rdquo;</p>
      </CardContent>
    </Card>
  );
}

export function UpcomingDeadlines({ deadlines }: { deadlines?: Opportunity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Deadlines</CardTitle>
        <CardDescription>Next priority opportunities</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {deadlines?.slice(0, 4).map((deadline) => (
          <div key={deadline.id} className="rounded-md border px-3 py-2 text-sm">
            <p className="font-medium">{deadline.company}</p>
            <p className="text-muted-foreground">{deadline.role}</p>
            <p className="text-xs text-muted-foreground">
              Deadline: {deadline.deadline ? new Date(deadline.deadline).toLocaleDateString() : "N/A"}
            </p>
          </div>
        ))}
        {!deadlines?.length && (
          <p className="text-sm text-muted-foreground">No deadlines yet. Add opportunities to see them here.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function TodaysPlan({
  tasks,
  csTopics,
  upcomingCTA,
}: {
  tasks?: string[];
  csTopics?: string[];
  upcomingCTA?: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Plan</CardTitle>
        <CardDescription>Auto-generated using your weak spots</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {tasks?.map((task, index) => <p key={`task-${index}`}>- {task}</p>)}
        {csTopics?.map((topic, index) => <p key={`topic-${index}`}>- Revise {topic}</p>)}
        {upcomingCTA && <p className="font-medium">{upcomingCTA}</p>}
        {!tasks?.length && !csTopics?.length && (
          <p className="text-muted-foreground">Connect LeetCode and sync GitHub to start building your plan.</p>
        )}
      </CardContent>
    </Card>
  );
}
