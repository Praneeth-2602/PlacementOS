"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Upload, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, LoadingState } from "@/components/ui/states";
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
import { Textarea } from "@/components/ui/textarea";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useOrgMembers } from "@/hooks/use-api";
import { api } from "@/lib/api";

function InviteDialog({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState("");

  const invite = useMutation({
    mutationFn: () =>
      api.inviteMembers(
        orgId,
        emails.split(/[\n,]/).map((e) => e.trim()).filter(Boolean),
      ),
    onSuccess: (res) => {
      toast.success(`Invited ${res.data?.invited ?? 0} students`);
      setOpen(false);
      setEmails("");
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["org", orgId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-1 h-4 w-4" /> Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite students</DialogTitle>
          <DialogDescription>Paste emails separated by commas or new lines. Seat limits apply.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="student1@college.edu, student2@college.edu"
          className="min-h-[120px]"
        />
        <DialogFooter>
          <Button onClick={() => invite.mutate()} disabled={!emails.trim() || invite.isPending}>
            Send invites
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("email,branch,graduation_year\n");
  const [errors, setErrors] = useState<Array<{ row: number; error: string }>>([]);

  const importCsv = useMutation({
    mutationFn: () => api.importMembers(orgId, csv),
    onSuccess: (res) => {
      toast.success(`Imported ${res.data?.imported ?? 0} students`);
      setErrors(res.data?.errors ?? []);
      if (!res.data?.errors?.length) setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["org", orgId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-1 h-4 w-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import students from CSV</DialogTitle>
          <DialogDescription>Columns: email, branch, graduation_year. Rows are upserted idempotently.</DialogDescription>
        </DialogHeader>
        <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} className="min-h-[160px] font-mono text-xs" />
        {errors.length > 0 && (
          <div className="max-h-32 overflow-auto rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
            {errors.map((err) => (
              <p key={err.row} className="text-destructive">
                Row {err.row}: {err.error}
              </p>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => importCsv.mutate()} disabled={importCsv.isPending}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function OrgStudentsPage() {
  const queryClient = useQueryClient();
  const { activeOrg, activeOrgId, isLoading: orgLoading } = useActiveOrg();
  const { data: members = [], isLoading } = useOrgMembers(activeOrgId ?? "", undefined, !!activeOrgId);

  const remove = useMutation({
    mutationFn: (userId: string) => api.removeMember(activeOrgId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["org", activeOrgId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (orgLoading) return <LoadingState label="Loading..." />;
  if (!activeOrg) {
    return <EmptyState icon={UserPlus} title="No organization" description="Create an organization from the Overview tab first." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Students</h2>
          <p className="text-muted-foreground">
            {activeOrg.seats_used}/{activeOrg.seat_limit} seats used
          </p>
        </div>
        <div className="flex gap-2">
          <ImportDialog orgId={activeOrg.id} />
          <InviteDialog orgId={activeOrg.id} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>Org-scoped roster</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingState label="Loading members..." />
          ) : members.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No members yet. Invite or import students to get started.
            </p>
          ) : (
            <div className="divide-y">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{member.name ?? member.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.email} · {member.branch ?? "—"} · {member.graduation_year ?? "—"}
                    </p>
                  </div>
                  {member.readiness_score != null && <Badge variant="outline">{Math.round(member.readiness_score)}</Badge>}
                  <Badge variant={member.status === "ACTIVE" ? "success" : "warning"}>{member.status}</Badge>
                  <Badge variant="secondary">{member.org_role}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => remove.mutate(member.user_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
