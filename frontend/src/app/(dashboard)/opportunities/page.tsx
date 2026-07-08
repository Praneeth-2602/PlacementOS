"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOpportunities } from "@/hooks/use-api";
import { api, type Opportunity, type OpportunityStatus } from "@/lib/api";

const KANBAN_COLUMNS: OpportunityStatus[] = [
  "TRACKING",
  "APPLIED",
  "OA_SCHEDULED",
  "INTERVIEW_SCHEDULED",
  "OFFERED",
  "REJECTED",
  "ACCEPTED",
  "DECLINED",
];

function deadlineBadge(deadline?: string | null): "danger" | "warning" | "secondary" {
  if (!deadline) return "secondary";
  const delta = new Date(deadline).getTime() - Date.now();
  if (delta <= 24 * 60 * 60 * 1000) return "danger";
  if (delta <= 7 * 24 * 60 * 60 * 1000) return "warning";
  return "secondary";
}

export default function OpportunitiesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [newOpportunity, setNewOpportunity] = useState({
    company: "",
    role: "",
    type: "PLACEMENT",
    status: "TRACKING",
    ctc: "",
    deadline: "",
    oa_date: "",
    jd_url: "",
  });

  const filters = useMemo(
    () => ({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(typeFilter ? { type: typeFilter } : {}),
    }),
    [statusFilter, typeFilter],
  );
  const { data: opportunities = [] } = useOpportunities(filters);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    queryClient.invalidateQueries({ queryKey: ["opportunities", "deadlines"] });
  };

  const createOpportunity = useMutation({
    mutationFn: () =>
      api.createOpportunity({
        ...newOpportunity,
        type: newOpportunity.type as Opportunity["type"],
        status: newOpportunity.status as OpportunityStatus,
      }),
    onSuccess: () => {
      toast.success("Opportunity added");
      setNewOpportunity({
        company: "",
        role: "",
        type: "PLACEMENT",
        status: "TRACKING",
        ctc: "",
        deadline: "",
        oa_date: "",
        jd_url: "",
      });
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: (payload: { id: string; status: OpportunityStatus }) => api.updateOpportunityStatus(payload.id, payload.status),
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error(err.message),
  });

  const syncCalendar = useMutation({
    mutationFn: (payload: { id: string; synced: boolean }) =>
      payload.synced ? api.unsyncOpportunityCalendar(payload.id) : api.syncOpportunityCalendar(payload.id),
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            {KANBAN_COLUMNS.map((status) => (
              <SelectItem key={status} value={status}>{status.replaceAll("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PLACEMENT">Placement</SelectItem>
            <SelectItem value="INTERNSHIP">Internship</SelectItem>
            <SelectItem value="OFF_CAMPUS">Off-campus</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Add Opportunity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Opportunity</DialogTitle>
              <DialogDescription>Track company applications and deadlines.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Input placeholder="Company" value={newOpportunity.company} onChange={(e) => setNewOpportunity((prev) => ({ ...prev, company: e.target.value }))} />
              <Input placeholder="Role" value={newOpportunity.role} onChange={(e) => setNewOpportunity((prev) => ({ ...prev, role: e.target.value }))} />
              <Input placeholder="CTC" value={newOpportunity.ctc} onChange={(e) => setNewOpportunity((prev) => ({ ...prev, ctc: e.target.value }))} />
              <Input type="date" value={newOpportunity.deadline} onChange={(e) => setNewOpportunity((prev) => ({ ...prev, deadline: e.target.value }))} />
              <Input type="date" value={newOpportunity.oa_date} onChange={(e) => setNewOpportunity((prev) => ({ ...prev, oa_date: e.target.value }))} />
              <Input placeholder="JD URL" value={newOpportunity.jd_url} onChange={(e) => setNewOpportunity((prev) => ({ ...prev, jd_url: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button onClick={() => createOpportunity.mutate()} disabled={!newOpportunity.company || !newOpportunity.role}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>
        <TabsContent value="kanban">
          <div className="grid gap-3 xl:grid-cols-4">
            {KANBAN_COLUMNS.map((status) => (
              <Card key={status}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{status.replaceAll("_", " ")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {opportunities
                    .filter((opp) => opp.status === status)
                    .map((opportunity) => (
                      <div key={opportunity.id} className="rounded-md border p-3 text-sm">
                        <p className="font-medium">{opportunity.company}</p>
                        <p className="text-muted-foreground">{opportunity.role}</p>
                        {opportunity.deadline && (
                          <Badge variant={deadlineBadge(opportunity.deadline)} className="mt-2">
                            Deadline: {new Date(opportunity.deadline).toLocaleDateString()}
                          </Badge>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {status !== "DECLINED" && status !== "ACCEPTED" && (
                            <Select onValueChange={(value) => updateStatus.mutate({ id: opportunity.id, status: value as OpportunityStatus })}>
                              <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue placeholder="Move status" /></SelectTrigger>
                              <SelectContent>
                                {KANBAN_COLUMNS.map((targetStatus) => (
                                  <SelectItem key={targetStatus} value={targetStatus}>{targetStatus.replaceAll("_", " ")}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => syncCalendar.mutate({ id: opportunity.id, synced: !!opportunity.calendar_synced })}
                          >
                            <CalendarPlus className="mr-1 h-3.5 w-3.5" />
                            {opportunity.calendar_synced ? "Unsync" : "Calendar"}
                          </Button>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Opportunities Table</CardTitle>
              <CardDescription>Sortable overview of all tracked opportunities.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {opportunities
                .slice()
                .sort((a, b) => new Date(a.deadline ?? 0).getTime() - new Date(b.deadline ?? 0).getTime())
                .map((opportunity) => (
                  <div key={opportunity.id} className="grid gap-1 rounded-md border p-3 text-sm md:grid-cols-6 md:items-center">
                    <span className="font-medium">{opportunity.company}</span>
                    <span>{opportunity.role}</span>
                    <Badge variant="outline">{opportunity.type}</Badge>
                    <Badge variant="secondary">{opportunity.status.replaceAll("_", " ")}</Badge>
                    <Badge variant={deadlineBadge(opportunity.deadline)}>{opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString() : "No deadline"}</Badge>
                    <Button size="sm" variant="outline" onClick={() => syncCalendar.mutate({ id: opportunity.id, synced: !!opportunity.calendar_synced })}>
                      {opportunity.calendar_synced ? "Unsync calendar" : "Sync calendar"}
                    </Button>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
