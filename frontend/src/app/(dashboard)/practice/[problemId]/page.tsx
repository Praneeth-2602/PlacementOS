"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2, Play, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LoadingState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProblem } from "@/hooks/use-api";
import { api, type ProblemDifficulty, type SubmissionVerdict } from "@/lib/api";

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
];

const STARTER: Record<string, string> = {
  python: "def solve():\n    # write your solution here\n    pass\n",
  javascript: "function solve() {\n  // write your solution here\n}\n",
  java: "class Solution {\n  // write your solution here\n}\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  // write your solution here\n}\n",
};

const TERMINAL: SubmissionVerdict[] = [
  "ACCEPTED",
  "WRONG_ANSWER",
  "TIME_LIMIT_EXCEEDED",
  "RUNTIME_ERROR",
  "COMPILE_ERROR",
];

function difficultyVariant(d: ProblemDifficulty): "success" | "warning" | "danger" {
  return d === "EASY" ? "success" : d === "MEDIUM" ? "warning" : "danger";
}

function verdictLabel(v: SubmissionVerdict): string {
  return v.replaceAll("_", " ");
}

export default function ProblemDetailPage() {
  const params = useParams<{ problemId: string }>();
  const queryClient = useQueryClient();
  const { data: problem, isLoading } = useProblem(params.problemId);
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(STARTER.python);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const { data: submission } = useQuery({
    queryKey: ["practice", "submission", submissionId],
    queryFn: async () => (await api.submission(submissionId!)).data,
    enabled: !!submissionId,
    refetchInterval: (query) => {
      const verdict = query.state.data?.verdict;
      return verdict && TERMINAL.includes(verdict) ? false : 1500;
    },
  });

  const submit = useMutation({
    mutationFn: () => api.submitSolution(params.problemId, { language, code }),
    onSuccess: (res) => {
      if (res.data?.submission_id) {
        setSubmissionId(res.data.submission_id);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const verdict = submission?.verdict;
  const isJudging = !!submissionId && (!verdict || !TERMINAL.includes(verdict));
  const accepted = verdict === "ACCEPTED";

  useEffect(() => {
    if (accepted) {
      // Refresh solved state in the list on acceptance.
      queryClient.invalidateQueries({ queryKey: ["practice", "problems"] });
      queryClient.invalidateQueries({ queryKey: ["readiness"] });
    }
  }, [accepted, queryClient]);

  if (isLoading) return <LoadingState label="Loading problem..." />;
  if (!problem) return <p className="text-sm text-muted-foreground">Problem not found.</p>;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link href="/practice">
          <ArrowLeft className="mr-1 h-4 w-4" /> All problems
        </Link>
      </Button>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{problem.title}</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">{problem.topic}</Badge>
                <Badge variant={difficultyVariant(problem.difficulty)}>{problem.difficulty}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{problem.statement}</div>
            {problem.constraints && (
              <div>
                <p className="text-sm font-medium">Constraints</p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{problem.constraints}</p>
              </div>
            )}
            {problem.sample_tests && problem.sample_tests.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Sample tests</p>
                {problem.sample_tests.map((test, index) => (
                  <div key={index} className="rounded-md border bg-muted/40 p-3 text-xs">
                    <p className="font-mono">
                      <span className="text-muted-foreground">Input:</span> {test.input}
                    </p>
                    <p className="font-mono">
                      <span className="text-muted-foreground">Output:</span> {test.output}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Code</CardTitle>
              <Select
                value={language}
                onValueChange={(value) => {
                  setLanguage(value);
                  setCode(STARTER[value] ?? "");
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="h-80 w-full rounded-md border border-input bg-background p-3 font-mono text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button onClick={() => submit.mutate()} disabled={submit.isPending || isJudging}>
                {submit.isPending || isJudging ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Judging...
                  </>
                ) : (
                  <>
                    <Play className="mr-1 h-4 w-4" /> Submit
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {submissionId && (
            <Card
              className={
                accepted
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : verdict && TERMINAL.includes(verdict)
                    ? "border-destructive/40 bg-destructive/5"
                    : undefined
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {isJudging ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : accepted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  Verdict
                </CardTitle>
                <CardDescription>
                  {isJudging ? "Running against test cases..." : verdictLabel(verdict!)}
                  {submission?.runtime_ms != null && !isJudging ? ` · ${submission.runtime_ms} ms` : ""}
                </CardDescription>
              </CardHeader>
              {submission?.output && !isJudging && (
                <CardContent>
                  <pre className="max-h-40 overflow-auto rounded-md bg-muted/40 p-3 font-mono text-xs">
                    {submission.output}
                  </pre>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
