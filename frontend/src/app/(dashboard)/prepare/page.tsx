"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { useMockSessionStats, useMockSessions, usePrepareQuestions, useStarTemplates } from "@/hooks/use-api";
import { api, type PrepareQuestion } from "@/lib/api";

function QuestionCard({ question }: { question: PrepareQuestion }) {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {question.difficulty && <Badge variant={question.difficulty === "HARD" ? "danger" : question.difficulty === "MEDIUM" ? "warning" : "success"}>{question.difficulty}</Badge>}
          {question.company && <Badge variant="outline">{question.company}</Badge>}
          <Badge variant="secondary">{question.type}</Badge>
        </div>
        <CardTitle className="text-base">{question.question}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{question.answer ?? "Open the question detail to view suggested answer."}</p>
      </CardContent>
    </Card>
  );
}

export default function PreparePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("technical");
  const [company, setCompany] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [topic, setTopic] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [sessionForm, setSessionForm] = useState({
    type: "TECHNICAL",
    duration_minutes: 45,
    questions_answered: 4,
    self_score: 7,
    notes: "",
  });
  const [starForm, setStarForm] = useState({
    title: "",
    situation: "",
    task: "",
    action: "",
    result: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    if (type === "HR") setActiveTab("hr");
    setCompany(params.get("company") ?? "");
    setTopic(params.get("topic") ?? "");
  }, []);

  const filters = useMemo(
    () => ({
      type: activeTab === "hr" ? "HR" : "TECHNICAL",
      ...(company ? { company } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(topic ? { topic } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [activeTab, company, debouncedSearch, difficulty, topic],
  );

  const { data: questions = [] } = usePrepareQuestions(filters);
  const { data: sessions = [] } = useMockSessions();
  const { data: stats } = useMockSessionStats();
  const { data: starTemplates = [] } = useStarTemplates();

  const saveStar = useMutation({
    mutationFn: () => api.createStarTemplate(starForm),
    onSuccess: () => {
      toast.success("STAR template saved");
      setStarForm({ title: "", situation: "", task: "", action: "", result: "" });
      queryClient.invalidateQueries({ queryKey: ["prepare", "star-templates"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const logSession = useMutation({
    mutationFn: () =>
      api.createMockSession({
        ...sessionForm,
        type: sessionForm.type as "TECHNICAL" | "HR" | "MIXED",
      }),
    onSuccess: () => {
      toast.success("Session logged");
      queryClient.invalidateQueries({ queryKey: ["prepare", "sessions"] });
      queryClient.invalidateQueries({ queryKey: ["prepare", "sessions", "stats"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="hr">HR</TabsTrigger>
          <TabsTrigger value="mock">Mock Sessions</TabsTrigger>
        </TabsList>
        <Button asChild variant="outline" size="sm">
          <Link href="/prepare/interview-twin">Open Interview Twin</Link>
        </Button>
      </div>

      <TabsContent value="technical" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Technical Question Bank</CardTitle>
            <CardDescription>Filter by company, difficulty and topic</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions" />
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" />
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic" />
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {questions.map((question) => (
                <QuestionCard key={question.id} question={question} />
              ))}
              {questions.length === 0 && <p className="text-sm text-muted-foreground">No questions for current filters.</p>}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="hr" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>HR Questions + STAR Templates</CardTitle>
            <CardDescription>Prepare stories and communication depth</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {questions
                .filter((question) => question.type === "HR")
                .map((question) => (
                  <div key={question.id} className="rounded-md border p-3">
                    <p className="font-medium">{question.question}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{question.answer ?? "Use STAR to structure your answer."}</p>
                  </div>
                ))}
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">STAR Editor</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Input placeholder="Template title" value={starForm.title} onChange={(e) => setStarForm((prev) => ({ ...prev, title: e.target.value }))} />
                <Textarea placeholder="Situation" value={starForm.situation} onChange={(e) => setStarForm((prev) => ({ ...prev, situation: e.target.value }))} />
                <Textarea placeholder="Task" value={starForm.task} onChange={(e) => setStarForm((prev) => ({ ...prev, task: e.target.value }))} />
                <Textarea placeholder="Action" value={starForm.action} onChange={(e) => setStarForm((prev) => ({ ...prev, action: e.target.value }))} />
                <Textarea placeholder="Result" value={starForm.result} onChange={(e) => setStarForm((prev) => ({ ...prev, result: e.target.value }))} />
                <Button onClick={() => saveStar.mutate()} disabled={!starForm.title.trim()}>
                  Save STAR Template
                </Button>
              </CardContent>
            </Card>
            <div className="space-y-2">
              {starTemplates.map((template) => (
                <div key={template.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{template.title}</p>
                  <p className="text-muted-foreground">
                    S: {template.situation} | T: {template.task} | A: {template.action} | R: {template.result}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="mock" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Mock Sessions</CardTitle>
            <CardDescription>Log practice sessions and track score trends</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-lg">Session Form</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Select
                    value={sessionForm.type}
                    onValueChange={(value) => setSessionForm((prev) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Session type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TECHNICAL">Technical</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="MIXED">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={sessionForm.duration_minutes}
                    onChange={(e) => setSessionForm((prev) => ({ ...prev, duration_minutes: Number(e.target.value) }))}
                    placeholder="Duration (minutes)"
                  />
                  <Input
                    type="number"
                    value={sessionForm.questions_answered}
                    onChange={(e) => setSessionForm((prev) => ({ ...prev, questions_answered: Number(e.target.value) }))}
                    placeholder="Questions answered"
                  />
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={sessionForm.self_score}
                    onChange={(e) => setSessionForm((prev) => ({ ...prev, self_score: Number(e.target.value) }))}
                    placeholder="Self score (1-10)"
                  />
                  <Textarea
                    value={sessionForm.notes}
                    onChange={(e) => setSessionForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="What went well / improve"
                  />
                  <Button onClick={() => logSession.mutate()}>Log Session</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Session Stats</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Total sessions: {stats?.total_sessions ?? 0}</p>
                  <p>Average score: {stats?.average_score?.toFixed(1) ?? "0.0"}</p>
                  <p>This week: {stats?.this_week_count ?? 0}</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-lg">Score Trend</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.trend ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avg_score" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <div className="space-y-2">
              {sessions.map((session) => (
                <div key={session.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">
                    {session.type} | Score {session.self_score}/10
                  </p>
                  <p className="text-muted-foreground">
                    {session.duration_minutes} mins, {session.questions_answered} questions
                  </p>
                  {session.notes && <p className="mt-1">{session.notes}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
