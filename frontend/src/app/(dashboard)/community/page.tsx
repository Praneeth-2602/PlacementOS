"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, LoadingState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useThreads } from "@/hooks/use-api";
import { api, type ThreadSort } from "@/lib/api";

const SORTS: ThreadSort[] = ["hot", "new", "top"];
const CATEGORIES = ["General", "Interview Experience", "Q&A", "Off-campus", "Resume Review"];

export default function CommunityPage() {
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<ThreadSort>("hot");
  const { data: threads = [], isLoading } = useThreads(sort);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [body, setBody] = useState("");

  const createThread = useMutation({
    mutationFn: () => api.createThread({ title, category, body }),
    onSuccess: () => {
      toast.success("Thread posted");
      setOpen(false);
      setTitle("");
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["community", "threads"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Community</h2>
          <p className="text-muted-foreground">Ask questions, share interview experiences, and help peers.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> New thread
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a discussion</DialogTitle>
              <DialogDescription>Share a question or an interview experience with the community.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your post..."
                className="min-h-[120px]"
              />
            </div>
            <DialogFooter>
              <Button onClick={() => createThread.mutate()} disabled={!title.trim() || !body.trim() || createThread.isPending}>
                Post thread
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        {SORTS.map((s) => (
          <Button key={s} size="sm" variant={sort === s ? "default" : "outline"} onClick={() => setSort(s)} className="capitalize">
            {s}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState label="Loading threads..." />
      ) : threads.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No threads yet"
          description="Be the first to start a discussion in the community."
        />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/community/${thread.id}`}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex w-10 shrink-0 flex-col items-center">
                  <span className="text-sm font-semibold">{thread.score ?? 0}</span>
                  <span className="text-[10px] text-muted-foreground">votes</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{thread.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {thread.author_name ?? "Anonymous"} · {thread.post_count ?? 0} replies
                  </p>
                </div>
                <Badge variant="secondary">{thread.category}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
