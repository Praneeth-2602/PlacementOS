"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, CreditCard, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLeaderboard, useMyOrgs, useSubscription } from "@/hooks/use-api";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: subscription } = useSubscription();
  const { data: leaderboard } = useLeaderboard();
  const { data: orgs = [] } = useMyOrgs();

  const optIn = useMutation({
    mutationFn: (value: boolean) => api.setLeaderboardOptIn(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification", "leaderboard"] });
      toast.success("Preference saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const planLabel = (subscription?.plan_code ?? "free").replace("_", " ");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Plan & Billing
          </CardTitle>
          <CardDescription>Manage your subscription and entitlements.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant={subscription?.plan_code && subscription.plan_code !== "free" ? "warning" : "secondary"} className="capitalize">
              {subscription?.plan_code && subscription.plan_code !== "free" && <Sparkles className="mr-1 h-3 w-3" />}
              {planLabel}
            </Badge>
            {subscription?.status && <span className="text-sm capitalize text-muted-foreground">{subscription.status}</span>}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/billing">Manage billing</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" /> Leaderboard privacy
          </CardTitle>
          <CardDescription>Control whether your XP appears on the cohort leaderboard.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {leaderboard?.opted_in
              ? "You appear on the leaderboard with an anonymized display name."
              : "You are hidden from the leaderboard."}
          </p>
          <Button
            variant={leaderboard?.opted_in ? "outline" : "default"}
            size="sm"
            onClick={() => optIn.mutate(!leaderboard?.opted_in)}
            disabled={optIn.isPending}
          >
            {leaderboard?.opted_in ? "Opt out" : "Opt in"}
          </Button>
        </CardContent>
      </Card>

      {orgs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Institution
            </CardTitle>
            <CardDescription>You have access to organization administration.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {orgs.map((o) => o.name).join(", ")}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/org">Open admin console</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Account preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Profile and notification settings will expand in later phases.</p>
        </CardContent>
      </Card>
    </div>
  );
}
