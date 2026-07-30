"use client";

import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEntitlements, type EntitlementKey } from "@/hooks/use-entitlements";

export function ProBadge({ className }: { className?: string }) {
  return (
    <Badge variant="warning" className={className}>
      <Sparkles className="mr-1 h-3 w-3" />
      Pro
    </Badge>
  );
}

/**
 * Wraps Pro-only UI. If the user is entitled, renders children. Otherwise it
 * shows an upsell card (or a custom fallback) linking to /billing.
 */
export function FeatureGate({
  entitlement,
  title = "This is a Pro feature",
  description = "Upgrade to PlacementOS Pro to unlock advanced AI, unlimited practice, and more.",
  children,
  fallback,
}: {
  entitlement: EntitlementKey;
  title?: string;
  description?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { has, isLoading } = useEntitlements();

  if (isLoading) return <>{children}</>;
  if (has(entitlement)) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button asChild>
          <Link href="/billing">Upgrade to Pro</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
