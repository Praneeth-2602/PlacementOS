"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronUp, Flag } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { LoadingState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useThread } from "@/hooks/use-api";
import { api, type Post } from "@/lib/api";
import { cn } from "@/lib/utils";

function PostCard({ post, threadId }: { post: Post; threadId: string }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["community", "thread", threadId] });

  const vote = useMutation({
    mutationFn: (value: -1 | 1) => api.votePost(post.id, value),
    onSuccess: invalidate,
    onError: (err: Error) => toast.error(err.message),
  });

  const report = useMutation({
    mutationFn: () => api.reportPost(post.id, "Reported from thread"),
    onSuccess: () => toast.success("Reported to moderators"),
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex gap-3 rounded-md border p-3">
      <div className="flex flex-col items-center gap-1">
        <button onClick={() => vote.mutate(1)} className={cn(post.user_vote === 1 && "text-primary")}>
          <ChevronUp className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">{post.score}</span>
        <button onClick={() => vote.mutate(-1)} className={cn(post.user_vote === -1 && "text-destructive")}>
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">
          {post.author_name ?? "Anonymous"} · {new Date(post.created_at).toLocaleDateString()}
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm">{post.body}</p>
        <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs text-muted-foreground" onClick={() => report.mutate()}>
          <Flag className="mr-1 h-3 w-3" /> Report
        </Button>
      </div>
    </div>
  );
}

export default function ThreadDetailPage() {
  const params = useParams<{ threadId: string }>();
  const queryClient = useQueryClient();
  const { data: thread, isLoading } = useThread(params.threadId);
  const [reply, setReply] = useState("");

  const postReply = useMutation({
    mutationFn: () => api.replyThread(params.threadId, reply),
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["community", "thread", params.threadId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState label="Loading thread..." />;
  if (!thread) return <p className="text-sm text-muted-foreground">Thread not found.</p>;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link href="/community">
          <ArrowLeft className="mr-1 h-4 w-4" /> Community
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{thread.title}</CardTitle>
            <Badge variant="secondary">{thread.category}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {thread.author_name ?? "Anonymous"} · {new Date(thread.created_at).toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {thread.posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No replies yet. Start the conversation.</p>
          ) : (
            thread.posts.map((post) => <PostCard key={post.id} post={post} threadId={params.threadId} />)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a reply</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Share your thoughts..."
            className="min-h-[100px]"
          />
          <Button onClick={() => postReply.mutate()} disabled={!reply.trim() || postReply.isPending}>
            Post reply
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
