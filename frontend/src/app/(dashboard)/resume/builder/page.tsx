"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useResumes } from "@/hooks/use-api";
import { api } from "@/lib/api";

export default function ResumeBuilderPage() {
  const { data: resumes = [] } = useResumes();
  const activeResume = useMemo(() => resumes.find((item) => item.is_default) ?? resumes[0], [resumes]);
  const [jsonText, setJsonText] = useState("{}");

  useEffect(() => {
    setJsonText(JSON.stringify(activeResume?.json_data ?? {}, null, 2));
  }, [activeResume?.id, activeResume?.json_data]);

  const saveDraft = useMutation({
    mutationFn: async () => {
      if (!activeResume) throw new Error("No resume found. Create one first.");
      const parsed = JSON.parse(jsonText) as Record<string, unknown>;
      return api.updateResume(activeResume.id, { json_data: parsed });
    },
    onSuccess: () => toast.success("Builder draft saved"),
    onError: (err: Error) => toast.error(err.message),
  });

  const exportPdf = useMutation({
    mutationFn: async () => {
      if (!activeResume) throw new Error("No resume selected.");
      return api.exportResume(activeResume.id);
    },
    onSuccess: (response) => {
      const fileUrl = response.data?.file_url;
      if (fileUrl) window.open(fileUrl, "_blank", "noopener,noreferrer");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Resume JSON Editor</CardTitle>
          <CardDescription>Edit structured sections and auto-save changes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={activeResume?.version_name ?? "No resume selected"} readOnly />
          <Textarea
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            className="min-h-[460px] font-mono text-xs"
            onBlur={() => saveDraft.mutate()}
          />
          <div className="flex gap-2">
            <Button onClick={() => saveDraft.mutate()} disabled={saveDraft.isPending}>Save</Button>
            <Button variant="outline" onClick={() => exportPdf.mutate()} disabled={exportPdf.isPending || !activeResume}>
              Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>Rendered JSON preview for quick visual validation.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted p-3 text-xs">
            {jsonText}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
