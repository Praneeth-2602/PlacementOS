"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { LoadingState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useInvoices, usePlans, useSubscription } from "@/hooks/use-api";
import { api, type Plan, type PlanCode } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatPrice(plan: Plan): string {
  if (plan.price === 0) return "Free";
  const symbol = plan.currency === "INR" ? "₹" : "$";
  return `${symbol}${plan.price}/${plan.interval}`;
}

export default function BillingPage() {
  const queryClient = useQueryClient();
  const { data: plans = [], isLoading } = usePlans();
  const { data: subscription } = useSubscription();
  const { data: invoices = [] } = useInvoices();

  const currentPlan: PlanCode = subscription?.plan_code ?? "free";

  const checkout = useMutation({
    mutationFn: (planCode: PlanCode) => api.checkout({ plan_code: planCode }),
    onSuccess: (res) => {
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        toast.error("No checkout URL returned");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancel = useMutation({
    mutationFn: () => api.cancelSubscription(),
    onSuccess: () => {
      toast.success("Subscription will be canceled at period end");
      queryClient.invalidateQueries({ queryKey: ["billing", "subscription"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Billing & Plans</h2>
        <p className="text-muted-foreground">Upgrade to unlock advanced AI, unlimited practice, and priority features.</p>
      </div>

      {subscription && subscription.plan_code !== "free" && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="flex items-center gap-2 font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                {subscription.plan_code.replace("_", " ")} · <span className="capitalize">{subscription.status}</span>
              </p>
              {subscription.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
            {subscription.status === "active" && (
              <Button variant="outline" size="sm" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                Cancel plan
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <LoadingState label="Loading plans..." />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.code === currentPlan;
            const isPro = plan.code === "student_pro";
            return (
              <Card key={plan.id} className={cn(isPro && "border-primary shadow-md")}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {isPro && <Badge variant="warning">Popular</Badge>}
                  </div>
                  <CardDescription className="text-xl font-bold text-foreground">{formatPrice(plan)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    {plan.entitlements.map((entitlement) => (
                      <li key={entitlement} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span className="capitalize">{entitlement.replaceAll("_", " ")}</span>
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current plan
                    </Button>
                  ) : plan.code === "free" ? (
                    <Button variant="outline" className="w-full" disabled>
                      Included
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => checkout.mutate(plan.code)}
                      disabled={checkout.isPending}
                    >
                      Upgrade
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices</CardTitle>
          <CardDescription>Your billing history</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <div className="divide-y">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {invoice.currency === "INR" ? "₹" : "$"}
                      {invoice.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(invoice.issued_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={invoice.status === "paid" ? "success" : "warning"}>{invoice.status}</Badge>
                    {invoice.provider_invoice_id && (
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
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
