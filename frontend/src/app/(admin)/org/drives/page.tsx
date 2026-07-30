"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useOrgDrives } from "@/hooks/use-api";
import { api, type Drive, type DriveRoundType } from "@/lib/api";

const ROUND_TYPES: DriveRoundType[] = ["OA", "TECHNICAL", "HR", "GD", "OTHER"];

function CreateDriveDialog({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [branches, setBranches] = useState("");
  const [minCgpa, setMinCgpa] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [visitDate, setVisitDate] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api.createDrive(orgId, {
        company_name: company.trim(),
        role: role.trim() || null,
        visit_date: visitDate || null,
        eligibility: {
          branches: branches.split(",").map((b) => b.trim()).filter(Boolean),
          min_cgpa: minCgpa ? Number(minCgpa) : null,
          graduation_year: gradYear ? Number(gradYear) : null,
        },
      }),
    onSuccess: () => {
      toast.success("Drive created");
      setOpen(false);
      setCompany("");
      setRole("");
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "drives"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" /> New drive
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a campus drive</DialogTitle>
          <DialogDescription>Set the company, role, and eligibility rules.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" />
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (optional)" />
          <Input value={branches} onChange={(e) => setBranches(e.target.value)} placeholder="Eligible branches (comma separated)" />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" step="0.1" value={minCgpa} onChange={(e) => setMinCgpa(e.target.value)} placeholder="Min CGPA" />
            <Input type="number" value={gradYear} onChange={(e) => setGradYear(e.target.value)} placeholder="Grad year" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Visit date</label>
            <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={!company.trim() || create.isPending}>
            Create drive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddRoundDialog({ orgId, drive }: { orgId: string; drive: Drive }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [roundType, setRoundType] = useState<DriveRoundType>("OA");
  const [scheduledAt, setScheduledAt] = useState("");

  const addRound = useMutation({
    mutationFn: () =>
      api.addDriveRound(orgId, drive.id, {
        name: name.trim(),
        round_type: roundType,
        scheduled_at: scheduledAt || null,
        order: (drive.rounds?.length ?? 0) + 1,
      }),
    onSuccess: () => {
      toast.success("Round added");
      setOpen(false);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "drives"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Add round
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a round to {drive.company_name}</DialogTitle>
          <DialogDescription>Schedule OA, technical, HR, or other rounds.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Round name (e.g. Online Assessment)" />
          <Select value={roundType} onValueChange={(v) => setRoundType(v as DriveRoundType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROUND_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={() => addRound.mutate()} disabled={!name.trim() || addRound.isPending}>
            Add round
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function statusVariant(status: Drive["status"]): "default" | "secondary" | "success" | "warning" {
  if (status === "COMPLETED") return "success";
  if (status === "ONGOING") return "warning";
  if (status === "DRAFT") return "secondary";
  return "default";
}

export default function OrgDrivesPage() {
  const { activeOrg, activeOrgId, isLoading: orgLoading } = useActiveOrg();
  const { data: drives = [], isLoading } = useOrgDrives(activeOrgId ?? "", !!activeOrgId);

  if (orgLoading) return <LoadingState label="Loading..." />;
  if (!activeOrg) {
    return <EmptyState icon={CalendarDays} title="No organization" description="Create an organization from the Overview tab first." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campus Drives</h2>
          <p className="text-muted-foreground">Create drives, manage rounds, and track the applications pipeline.</p>
        </div>
        <CreateDriveDialog orgId={activeOrg.id} />
      </div>

      {isLoading ? (
        <LoadingState label="Loading drives..." />
      ) : drives.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No drives yet" description="Create your first campus drive." />
      ) : (
        <div className="grid gap-4">
          {drives.map((drive) => (
            <Card key={drive.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{drive.company_name}</CardTitle>
                    <CardDescription>
                      {drive.role ?? "Role TBD"}
                      {drive.visit_date ? ` · Visit ${new Date(drive.visit_date).toLocaleDateString()}` : ""}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(drive.status)}>{drive.status}</Badge>
                    <Badge variant="outline">{drive.application_count ?? 0} applicants</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1 text-xs">
                  <span className="text-muted-foreground">Eligibility:</span>
                  {drive.eligibility.branches.length > 0 ? (
                    drive.eligibility.branches.map((b) => (
                      <Badge key={b} variant="secondary">
                        {b}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">All branches</span>
                  )}
                  {drive.eligibility.min_cgpa ? <Badge variant="outline">CGPA ≥ {drive.eligibility.min_cgpa}</Badge> : null}
                  {drive.eligibility.graduation_year ? (
                    <Badge variant="outline">{drive.eligibility.graduation_year}</Badge>
                  ) : null}
                </div>

                <div className="space-y-1">
                  {(drive.rounds ?? []).map((round) => (
                    <div key={round.id} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                      <span>
                        <Badge variant="outline" className="mr-2">
                          {round.round_type}
                        </Badge>
                        {round.name}
                      </span>
                      {round.scheduled_at && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(round.scheduled_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
                  {(drive.rounds?.length ?? 0) === 0 && (
                    <p className="text-sm text-muted-foreground">No rounds scheduled yet.</p>
                  )}
                </div>

                <AddRoundDialog orgId={activeOrg.id} drive={drive} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
