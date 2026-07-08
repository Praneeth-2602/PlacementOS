"use client";

import { useMutation } from "@tanstack/react-query";
import { Bot, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, type InterviewTwinMessage } from "@/lib/api";

export default function InterviewTwinPage() {
  const [company, setCompany] = useState("Google");
  const [role, setRole] = useState("SWE Intern");
  const [answer, setAnswer] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [messages, setMessages] = useState<InterviewTwinMessage[]>([]);
  const [summary, setSummary] = useState<{
    score: number;
    strengths: string[];
    weaknesses: string[];
    improvement_areas: string[];
  } | null>(null);

  const startSession = useMutation({
    mutationFn: () => api.startInterviewTwin({ company, role }),
    onSuccess: (response) => {
      const payload = response.data;
      if (!payload) return;
      setSessionId(payload.session_id);
      setQuestionNumber(payload.question_number);
      setSummary(null);
      setMessages([{ role: "assistant", content: payload.current_question }]);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sendAnswer = useMutation({
    mutationFn: () => {
      if (!sessionId) throw new Error("Start a session first.");
      return api.respondInterviewTwin({ session_id: sessionId, answer });
    },
    onSuccess: (response) => {
      const payload = response.data;
      if (!payload) return;
      setMessages((prev) => [
        ...prev,
        { role: "user", content: answer },
        { role: "assistant", content: payload.current_question, feedback: payload.feedback },
      ]);
      setAnswer("");
      setQuestionNumber(payload.question_number);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const endSession = useMutation({
    mutationFn: () => {
      if (!sessionId) throw new Error("Start a session first.");
      return api.endInterviewTwin({ session_id: sessionId });
    },
    onSuccess: (response) => {
      setSummary(response.data?.summary ?? null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Interview Twin</CardTitle>
          <CardDescription>AI mock interview with role + company context.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" />
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" />
          <Button onClick={() => startSession.mutate()} disabled={startSession.isPending}>
            Start Session
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Interview Chat</CardTitle>
            <CardDescription>Question {questionNumber || 0}/5</CardDescription>
          </div>
          <Badge variant="outline">
            <Bot className="mr-1 h-3.5 w-3.5" />
            AI Interviewer
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-[360px] space-y-2 overflow-y-auto rounded-md border p-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`rounded-md p-2 text-sm ${message.role === "assistant" ? "bg-muted" : "bg-primary/10"}`}>
                <p className="font-medium">{message.role === "assistant" ? "Interviewer" : "You"}</p>
                <p>{message.content}</p>
                {message.feedback && <p className="mt-1 text-xs text-muted-foreground">Feedback: {message.feedback}</p>}
              </div>
            ))}
            {messages.length === 0 && <p className="text-sm text-muted-foreground">Start a session to begin your mock interview.</p>}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your response..."
              className="min-h-[80px]"
            />
            <Button onClick={() => sendAnswer.mutate()} disabled={!answer.trim() || sendAnswer.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={() => endSession.mutate()} disabled={!sessionId || endSession.isPending}>
            End session
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Session Feedback</CardTitle>
            <CardDescription>Score: {summary.score}/10</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-medium">Strengths:</span> {summary.strengths.join(", ") || "N/A"}</p>
            <p><span className="font-medium">Weaknesses:</span> {summary.weaknesses.join(", ") || "N/A"}</p>
            <p><span className="font-medium">Improve next:</span> {summary.improvement_areas.join(", ") || "N/A"}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
