"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useResumes } from "@/hooks/use-api";
import { api, type ResumeItem } from "@/lib/api";

function ATSDial({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(Math.min(score, 100), 0) / 100) * circumference;

  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg className="-rotate-90" width={108} height={108}>
        <circle cx={54} cy={54} r={radius} strokeWidth={8} className="fill-none stroke-muted" />
        <circle
          cx={54}
          cy={54}
          r={radius}
          strokeWidth={8}
          strokeLinecap="round"
          className="fill-none stroke-primary"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-semibold">{Math.round(score)}</p>
        <p className="text-[10px] text-muted-foreground">ATS</p>
      </div>
    </div>
  );
}

export default function ResumePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedResume, setSelectedResume] = useState<ResumeItem | null>(null);
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const { data: resumes = [] } = useResumes();

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["resume"] });

  const uploadResume = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.uploadResume(formData);
    },
    onSuccess: (response) => {
      const resume = response.data;
      if (!resume) return;
      setSelectedResume(resume);
      api.analyzeResume(resume.id).catch(() => undefined);
      refresh();
      toast.success("Resume uploaded. ATS analysis started.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const analyzeResume = useMutation({
    mutationFn: () => {
      if (!selectedResume) throw new Error("Select a resume first.");
      return api.analyzeResume(selectedResume.id);
    },
    onSuccess: (response) => {
      setSelectedResume(response.data ?? null);
      refresh();
      toast.success("ATS analysis complete.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const analyzeResumeV2 = useMutation({
    mutationFn: () => {
      if (!selectedResume) throw new Error("Select a resume first.");
      return api.analyzeResumeV2(selectedResume.id, { jobDescriptionText });
    },
    onSuccess: (response) => {
      setSelectedResume(response.data ?? null);
      refresh();
      toast.success("ATS V2 analysis complete.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const setDefault = useMutation({
    mutationFn: (id: string) => api.setDefaultResume(id),
    onSuccess: refresh,
    onError: (err: Error) => toast.error(err.message),
  });

  const downloadResume = async (id: string) => {
    try {
      const response = await api.exportResume(id);
      const url = response.data?.file_url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Resume Versions</CardTitle>
          <CardDescription>Upload resumes, run ATS analysis, and set default profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadResume.mutate(file);
            }}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploadResume.isPending}>
            <Upload className="h-4 w-4" />
            Upload PDF
          </Button>
          <div className="mt-4 space-y-2">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${selectedResume?.id === resume.id ? "border-primary" : ""}`}
              >
                <div>
                  <p className="font-medium">{resume.version_name}</p>
                  <p className="text-muted-foreground">{resume.target_role ?? "General"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={resume.is_default ? "success" : "secondary"}>{resume.is_default ? "Default" : "Secondary"}</Badge>
                  <Badge variant="outline">ATS {resume.ats_score ?? 0}</Badge>
                  <Button size="sm" variant="outline" onClick={() => setSelectedResume(resume)}>Select</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDefault.mutate(resume.id)}>Set Default</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ATS Analyzer</CardTitle>
            <CardDescription>Run V1 and JD-aware ATS V2 checks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <ATSDial score={selectedResume?.ats_score ?? 0} />
              <div>
                <p className="text-sm text-muted-foreground">ATS V1 score</p>
                <p className="text-xl font-semibold">{selectedResume?.ats_score ?? 0}</p>
              </div>
            </div>
            <Button onClick={() => analyzeResume.mutate()} disabled={!selectedResume || analyzeResume.isPending}>
              Analyze
            </Button>
            <Button variant="outline" onClick={() => selectedResume && downloadResume(selectedResume.id)} disabled={!selectedResume}>
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ATS V2 (JD-Aware)</CardTitle>
            <CardDescription>Paste optional job description for keyword alignment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={jobDescriptionText}
              onChange={(event) => setJobDescriptionText(event.target.value)}
              placeholder="Paste job description here (optional)"
              className="min-h-[140px]"
            />
            <Button onClick={() => analyzeResumeV2.mutate()} disabled={!selectedResume || analyzeResumeV2.isPending}>
              Analyze V2
            </Button>
            <div className="space-y-1">
              <p className="text-sm font-medium">Matched Keywords</p>
              <div className="flex flex-wrap gap-1">
                {selectedResume?.matched_keywords?.map((keyword) => <Badge key={keyword} variant="success">{keyword}</Badge>)}
              </div>
              <p className="pt-2 text-sm font-medium">Missing Keywords</p>
              <div className="flex flex-wrap gap-1">
                {selectedResume?.missing_keywords?.map((keyword) => <Badge key={keyword} variant="danger">{keyword}</Badge>)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
