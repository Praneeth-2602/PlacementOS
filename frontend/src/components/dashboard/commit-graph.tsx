"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function colorForCount(count: number): string {
  if (count === 0) return "bg-muted";
  if (count < 3) return "bg-primary/30";
  if (count < 6) return "bg-primary/60";
  return "bg-primary";
}

export function CommitGraph({ calendar }: { calendar: Record<string, number> }) {
  const dates = Object.keys(calendar).sort();
  const weeks: { date: string; count: number }[][] = [];
  let currentWeek: { date: string; count: number }[] = [];

  for (const date of dates) {
    currentWeek.push({ date, count: calendar[date] });
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length) weeks.push(currentWeek);

  const displayWeeks = weeks.slice(-26);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contribution Graph</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1 overflow-x-auto pb-2">
          {displayWeeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count} contributions`}
                  className={`h-3 w-3 rounded-sm ${colorForCount(day.count)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
