"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { LeetCodeStatsCard } from "@/components/dashboard/leetcode-stats";
import { LeetCodeConnect } from "@/components/dashboard/sync-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAptitudeSection, useCSSubject, useCSSummary, useLeetCodeStats, useLeetCodeTopics, useUser } from "@/hooks/use-api";
import { api } from "@/lib/api";

const SUBJECTS = ["OS", "DBMS", "CN", "OOP"] as const;
const APTITUDE_SECTIONS = ["QUANT", "LOGICAL", "VERBAL"] as const;

function statusVariant(status: string): "default" | "secondary" | "success" | "warning" | "danger" {
  if (status === "COMPLETED") return "success";
  if (status === "IN_PROGRESS") return "warning";
  if (status === "NEEDS_REVISION") return "danger";
  return "secondary";
}

export default function LearnPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>("OS");
  const [section, setSection] = useState<(typeof APTITUDE_SECTIONS)[number]>("QUANT");
  const [note, setNote] = useState("");
  const [activeTopic, setActiveTopic] = useState<string>("");
  const { data: stats } = useLeetCodeStats(!!user?.leetcode?.is_connected);
  const { data: topics = [] } = useLeetCodeTopics(!!user?.leetcode?.is_connected);
  const { data: csTopics = [] } = useCSSubject(subject, true);
  const { data: csSummary = [] } = useCSSummary();
  const { data: aptitudeTopics = [] } = useAptitudeSection(section, true);

  const toggleRevision = useMutation({
    mutationFn: (topic: string) => api.toggleTopicRevision(topic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leetcode", "topics"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCSTopic = useMutation({
    mutationFn: (payload: { topic: string; confidence: number; status: string }) =>
      api.updateCSTopic(subject, payload.topic, { confidence: payload.confidence, status: payload.status as never }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learn", "cs", subject] });
      queryClient.invalidateQueries({ queryKey: ["learn", "cs", "summary"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveNote = useMutation({
    mutationFn: () => api.createNote({ subject, topic: activeTopic, content: note }),
    onSuccess: () => {
      toast.success("Note saved");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revisionList = useMemo(() => csTopics.filter((topic) => topic.status === "NEEDS_REVISION"), [csTopics]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dsa" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dsa">DSA</TabsTrigger>
          <TabsTrigger value="cs">CS Fundamentals</TabsTrigger>
          <TabsTrigger value="aptitude">Aptitude</TabsTrigger>
        </TabsList>

        <TabsContent value="dsa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DSA — LeetCode</CardTitle>
              <CardDescription>Connect your LeetCode account to track topic progress</CardDescription>
            </CardHeader>
            <CardContent>
              <LeetCodeConnect defaultUsername={user?.leetcode?.username} />
            </CardContent>
          </Card>

          {stats && <LeetCodeStatsCard stats={stats} />}

          {topics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Topic Progress</CardTitle>
                <CardDescription>Toggle revision flags for weak areas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{topic.topic}</p>
                        <p className="text-muted-foreground">{topic.solved_count} solved</p>
                      </div>
                      <Button
                        size="sm"
                        variant={topic.needs_revision ? "default" : "outline"}
                        onClick={() => toggleRevision.mutate(topic.topic)}
                      >
                        {topic.needs_revision ? "Needs revision" : "Mark revision"}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CS Fundamentals</CardTitle>
              <CardDescription>Track confidence and revision status by subject</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((item) => (
                  <Button key={item} variant={subject === item ? "default" : "outline"} size="sm" onClick={() => setSubject(item)}>
                    {item}
                  </Button>
                ))}
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/learn/cs-fundamentals/${subject.toLowerCase()}`}>Deep dive</Link>
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {csSummary.map((item) => (
                  <div key={item.subject} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{item.subject}</p>
                    <div className="mt-2 h-2 rounded bg-muted">
                      <div className="h-2 rounded bg-primary" style={{ width: `${Math.max(item.completion_percent, 5)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.completed_topics}/{item.total_topics} topics completed
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {csTopics.map((topic) => (
                  <div key={topic.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{topic.topic}</p>
                      <Badge variant={statusVariant(topic.status)}>{topic.status.replaceAll("_", " ")}</Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      <label className="text-xs text-muted-foreground">Confidence: {topic.confidence}</label>
                      <Input
                        type="range"
                        min={0}
                        max={100}
                        value={topic.confidence}
                        onChange={(event) =>
                          updateCSTopic.mutate({
                            topic: topic.topic,
                            confidence: Number(event.target.value),
                            status: topic.status,
                          })
                        }
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateCSTopic.mutate({ topic: topic.topic, confidence: topic.confidence, status: "IN_PROGRESS" })}>
                          In progress
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateCSTopic.mutate({ topic: topic.topic, confidence: topic.confidence, status: "COMPLETED" })}>
                          Complete
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setActiveTopic(topic.topic);
                                setNote("");
                              }}
                            >
                              Notes
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{topic.topic} Notes</DialogTitle>
                              <DialogDescription>Save quick revision notes.</DialogDescription>
                            </DialogHeader>
                            <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write your key takeaway..." />
                            <DialogFooter>
                              <Button onClick={() => saveNote.mutate()} disabled={!note.trim()}>
                                Save note
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                ))}
                {csTopics.length === 0 && <p className="text-sm text-muted-foreground">No topics found for this subject yet.</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Revision Checklist</CardTitle>
              <CardDescription>Topics flagged for quick revision</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {revisionList.map((topic) => (
                <div key={topic.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{topic.topic}</span>
                  <Badge variant="danger">Needs revision</Badge>
                </div>
              ))}
              {revisionList.length === 0 && <p className="text-sm text-muted-foreground">No revision topics right now.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aptitude" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aptitude Practice</CardTitle>
              <CardDescription>Measure topic-wise accuracy before placements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                {APTITUDE_SECTIONS.map((item) => (
                  <Button key={item} variant={item === section ? "default" : "outline"} size="sm" onClick={() => setSection(item)}>
                    {item}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                {aptitudeTopics.map((topic) => {
                  const accuracy = topic.attempted === 0 ? 0 : Math.round((topic.correct / topic.attempted) * 100);
                  return (
                    <div key={topic.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{topic.topic}</p>
                        <p className="text-muted-foreground">
                          {topic.correct}/{topic.attempted} correct
                        </p>
                      </div>
                      <Badge variant={accuracy >= 70 ? "success" : accuracy >= 50 ? "warning" : "danger"}>{accuracy}% accuracy</Badge>
                    </div>
                  );
                })}
              </div>
              <Button asChild variant="outline" className="mt-4">
                <Link href={`/prepare?type=TECHNICAL&topic=${section}`}>Practice filtered questions</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
