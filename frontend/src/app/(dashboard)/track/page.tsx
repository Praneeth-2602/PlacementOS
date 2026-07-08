"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDsaHeatmap, useScoreHistory, useTopicBreakdown, useWeeklyReport } from "@/hooks/use-api";

export default function TrackPage() {
  const { data: heatmap = [] } = useDsaHeatmap();
  const { data: history = [] } = useScoreHistory();
  const { data: breakdown = [] } = useTopicBreakdown();
  const { data: weekly = [] } = useWeeklyReport();

  const lastTwo = history.slice(-2);
  const trajectory = lastTwo.length === 2 ? lastTwo[1].overall - lastTwo[0].overall : 0;
  const weeksTo90 = trajectory > 0 ? Math.max(Math.ceil((90 - (lastTwo[1]?.overall ?? 0)) / trajectory), 1) : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>DSA Activity Heatmap</CardTitle>
          <CardDescription>52-week contribution-style daily activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-13 gap-1">
            {heatmap.slice(-364).map((day) => (
              <div
                key={day.date}
                className="h-4 rounded-sm"
                style={{
                  backgroundColor:
                    day.count > 5 ? "hsl(var(--primary))" : day.count > 2 ? "hsl(var(--primary) / 0.65)" : day.count > 0 ? "hsl(var(--primary) / 0.35)" : "hsl(var(--muted))",
                }}
                title={`${day.date}: ${day.count}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Readiness Score Trend</CardTitle>
            <CardDescription>Historical overall + category score movement.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="overall" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Topic Mastery Radar</CardTitle>
            <CardDescription>Relative mastery across major preparation categories.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={breakdown}>
                <PolarGrid />
                <PolarAngleAxis dataKey="topic" />
                <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.35)" />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Goal Completion</CardTitle>
          <CardDescription>Week-over-week goal progression and consistency.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="goals_completed" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time-to-Placement Estimate</CardTitle>
          <CardDescription>Projection using your recent score trajectory.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {weeksTo90
              ? `If you maintain the current growth rate, you can reach 90 readiness in approximately ${weeksTo90} week(s).`
              : "Not enough trend data yet to estimate your placement timeline."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
