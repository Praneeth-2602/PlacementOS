"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Building2, TrendingDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, LoadingState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useOrgAtRisk, useOrgFunnel, useOrgReadiness } from "@/hooks/use-api";
import { api, type OrgType } from "@/lib/api";
import { useOrgStore } from "@/stores/org.store";

function CreateOrgCard() {
  const queryClient = useQueryClient();
  const setActiveOrgId = useOrgStore((s) => s.setActiveOrgId);
  const [name, setName] = useState("");
  const [type, setType] = useState<OrgType>("COLLEGE");
  const [domains, setDomains] = useState("");
  const [seatLimit, setSeatLimit] = useState(200);

  const create = useMutation({
    mutationFn: () =>
      api.createOrg({
        name: name.trim(),
        type,
        verified_domains: domains.split(",").map((d) => d.trim()).filter(Boolean),
        seat_limit: seatLimit,
      }),
    onSuccess: (res) => {
      toast.success("Organization created");
      if (res.data?.id) setActiveOrgId(res.data.id);
      queryClient.invalidateQueries({ queryKey: ["org", "mine"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" /> Create your organization
        </CardTitle>
        <CardDescription>Set up a college or company account to onboard a cohort and run drives.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Organization name" />
        <Select value={type} onValueChange={(v) => setType(v as OrgType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="COLLEGE">College</SelectItem>
            <SelectItem value="COMPANY">Company</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={domains}
          onChange={(e) => setDomains(e.target.value)}
          placeholder="Verified email domains (comma separated, e.g. iitb.ac.in)"
        />
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Seat limit</label>
          <Input type="number" value={seatLimit} onChange={(e) => setSeatLimit(Number(e.target.value))} min={1} />
        </div>
        <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending} className="w-full">
          Create organization
        </Button>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function OrgOverviewPage() {
  const { activeOrg, activeOrgId, isLoading } = useActiveOrg();
  const { data: readiness } = useOrgReadiness(activeOrgId ?? "", !!activeOrgId);
  const { data: atRisk = [] } = useOrgAtRisk(activeOrgId ?? "", !!activeOrgId);
  const { data: funnel } = useOrgFunnel(activeOrgId ?? "", !!activeOrgId);

  if (isLoading) return <LoadingState label="Loading organization..." />;
  if (!activeOrg) return <CreateOrgCard />;

  const seatsUsed = activeOrg.seats_used ?? 0;
  const seatPercent = activeOrg.seat_limit > 0 ? Math.round((seatsUsed / activeOrg.seat_limit) * 100) : 0;

  const funnelStages = funnel
    ? [
        { label: "Applied", value: funnel.applied },
        { label: "Shortlisted", value: funnel.shortlisted },
        { label: "Interviewed", value: funnel.interviewed },
        { label: "Offered", value: funnel.offered },
      ]
    : [];
  const funnelMax = Math.max(1, ...funnelStages.map((s) => s.value));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{activeOrg.name}</h2>
          <p className="text-muted-foreground capitalize">{activeOrg.type.toLowerCase()} · {activeOrg.my_role ?? "member"}</p>
        </div>
        <Badge variant="secondary">
          {seatsUsed}/{activeOrg.seat_limit} seats used
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Cohort size" value={readiness?.cohort_size ?? 0} />
        <StatCard label="Avg readiness" value={`${Math.round(readiness?.average_readiness ?? 0)}`} hint="out of 100" />
        <StatCard label="At-risk students" value={atRisk.length} />
        <StatCard label="Seat usage" value={`${seatPercent}%`} hint={`${activeOrg.seat_limit - seatsUsed} remaining`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Readiness distribution</CardTitle>
            <CardDescription>Cohort readiness spread</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {readiness?.distribution?.length ? (
              readiness.distribution.map((bucket) => {
                const max = Math.max(1, ...readiness.distribution.map((b) => b.count));
                return (
                  <div key={bucket.bucket} className="flex items-center gap-3 text-sm">
                    <span className="w-16 text-muted-foreground">{bucket.bucket}</span>
                    <div className="h-4 flex-1 rounded bg-muted">
                      <div
                        className="h-4 rounded bg-primary"
                        style={{ width: `${Math.max((bucket.count / max) * 100, 2)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right">{bucket.count}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No readiness data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Placement funnel</CardTitle>
            <CardDescription>Applied → offered</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {funnelStages.length ? (
              funnelStages.map((stage) => (
                <div key={stage.label} className="flex items-center gap-3 text-sm">
                  <span className="w-24 text-muted-foreground">{stage.label}</span>
                  <div className="h-4 flex-1 rounded bg-muted">
                    <div
                      className="h-4 rounded bg-primary"
                      style={{ width: `${Math.max((stage.value / funnelMax) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right">{stage.value}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No funnel data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> At-risk students
          </CardTitle>
          <CardDescription>Low or declining readiness and inactivity flags</CardDescription>
        </CardHeader>
        <CardContent>
          {atRisk.length === 0 ? (
            <EmptyState
              icon={TrendingDown}
              title="No at-risk students"
              description="Everyone in the cohort is on track."
              className="border-none shadow-none"
            />
          ) : (
            <div className="space-y-2">
              {atRisk.map((student) => (
                <div key={student.user_id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {student.branch ?? "—"} · {student.reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="danger">{Math.round(student.readiness_score)}</Badge>
                    <Badge variant="warning" className="capitalize">
                      {student.trend}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
