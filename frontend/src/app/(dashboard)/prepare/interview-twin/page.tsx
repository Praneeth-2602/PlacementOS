"use client";

import { useMutation } from "@tanstack/react-query";
import { Bot, Send, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ProBadge } from "@/components/feature-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEntitlements, ENTITLEMENTS } from "@/hooks/use-entitlements";
import { api, streamInterviewTwin, type InterviewTwinMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function InterviewTwinPage() {
  const [company, setCompany] = useState("Google");
  const [role, setRole] = useState("SWE Intern");
  const [answer, setAnswer] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [messages, setMessages] = useState<InterviewTwinMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const { has } = useEntitlements();
  const canStream = has(ENTITLEMENTS.streamingInterview);
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

  const handleSend = async () => {
    if (!answer.trim()) return;
    if (!sessionId) {
      toast.error("Start a session first.");
      return;
    }
    if (canStream && useStreaming) {
      const currentAnswer = answer;
      setAnswer("");
      setIsStreaming(true);
      // Optimistically show the answer and an empty assistant bubble to fill.
      setMessages((prev) => [...prev, { role: "user", content: currentAnswer }, { role: "assistant", content: "" }]);
      await streamInterviewTwin(
        { session_id: sessionId, answer: currentAnswer },
        {
          onToken: (token) => {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                next[next.length - 1] = { ...last, content: last.content + token };
              }
              return next;
            });
          },
          onDone: () => setIsStreaming(false),
          onError: () => {
            // Streaming unavailable — fall back to the structured endpoint.
            setIsStreaming(false);
            setMessages((prev) => prev.slice(0, -1));
            setAnswer(currentAnswer);
            setUseStreaming(false);
            toast.message("Streaming unavailable, switched to standard mode.");
          },
        },
      );
      return;
    }
    sendAnswer.mutate();
  };

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
          <div className="flex items-center gap-2">
            {canStream && (
              <Button
                variant={useStreaming ? "default" : "outline"}
                size="sm"
                className="h-7"
                onClick={() => setUseStreaming((s) => !s)}
              >
                <Zap className="mr-1 h-3.5 w-3.5" /> Streaming <ProBadge className="ml-1" />
              </Button>
            )}
            <Badge variant="outline">
              <Bot className="mr-1 h-3.5 w-3.5" />
              AI Interviewer
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-[360px] space-y-2 overflow-y-auto rounded-md border p-3">
            {messages.map((message, index) => {
              const isLast = index === messages.length - 1;
              const showTyping = isStreaming && isLast && message.role === "assistant" && !message.content;
              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-md p-2 text-sm ${message.role === "assistant" ? "bg-muted" : "bg-primary/10"}`}
                >
                  <p className="font-medium">{message.role === "assistant" ? "Interviewer" : "You"}</p>
                  {showTyping ? (
                    <span className="inline-flex gap-1 py-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                    </span>
                  ) : (
                    <p className={cn(isStreaming && isLast && "after:ml-0.5 after:animate-pulse after:content-['▋']")}>
                      {message.content}
                    </p>
                  )}
                  {message.feedback && <p className="mt-1 text-xs text-muted-foreground">Feedback: {message.feedback}</p>}
                </div>
              );
            })}
            {messages.length === 0 && <p className="text-sm text-muted-foreground">Start a session to begin your mock interview.</p>}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your response..."
              className="min-h-[80px]"
            />
            <Button onClick={handleSend} disabled={!answer.trim() || sendAnswer.isPending || isStreaming}>
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
