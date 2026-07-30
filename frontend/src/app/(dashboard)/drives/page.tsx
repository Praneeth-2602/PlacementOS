"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, LoadingState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDrives } from "@/hooks/use-api";
import { api, type Drive } from "@/lib/api";

function DriveCard({ drive }: { drive: Drive }) {
  const queryClient = useQueryClient();

  const apply = useMutation({
    mutationFn: () => api.applyToDrive(drive.id),
    onSuccess: () => {
      toast.success("Applied to drive");
      queryClient.invalidateQueries({ queryKey: ["drives"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{drive.company_name}</CardTitle>
            <CardDescription>
              {drive.role ?? "Role TBD"}
              {drive.visit_date ? ` · ${new Date(drive.visit_date).toLocaleDateString()}` : ""}
            </CardDescription>
          </div>
          <Badge variant={drive.is_eligible ? "success" : "secondary"}>
            {drive.is_eligible ? "Eligible" : "Not eligible"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(drive.rounds?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1">
            {drive.rounds?.map((round) => (
              <Badge key={round.id} variant="outline">
                {round.round_type}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
          {drive.eligibility.branches.length > 0 && <span>Branches: {drive.eligibility.branches.join(", ")}</span>}
          {drive.eligibility.min_cgpa ? <span>· CGPA ≥ {drive.eligibility.min_cgpa}</span> : null}
        </div>
        {drive.has_applied ? (
          <Button size="sm" variant="outline" disabled>
            <CheckCircle2 className="mr-1 h-4 w-4" /> Applied
          </Button>
        ) : (
          <Button size="sm" disabled={!drive.is_eligible || apply.isPending} onClick={() => apply.mutate()}>
            Apply
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function DrivesPage() {
  const { data: drives = [], isLoading } = useDrives();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Campus Drives</h2>
        <p className="text-muted-foreground">Drives from your institution, filtered by your eligibility.</p>
      </div>

      {isLoading ? (
        <LoadingState label="Loading drives..." />
      ) : drives.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No drives available"
          description="When your institution schedules drives you're eligible for, they'll show up here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {drives.map((drive) => (
            <DriveCard key={drive.id} drive={drive} />
          ))}
        </div>
      )}
    </div>
  );
}
