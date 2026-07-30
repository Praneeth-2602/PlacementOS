"use client";

import { useSubscription } from "@/hooks/use-api";
import type { PlanCode } from "@/lib/api";

/**
 * Known entitlement keys used across the UI for Phase 9 feature gating.
 * The backend is the source of truth; these are the flags we check client-side
 * to show/hide Pro-only affordances. Free users fall back to the default set.
 */
export const ENTITLEMENTS = {
  advancedAi: "advanced_ai",
  unlimitedPractice: "unlimited_practice",
  resumeRewrite: "resume_rewrite",
  studyPlan: "study_plan",
  streamingInterview: "streaming_interview",
  priorityMentors: "priority_mentors",
} as const;

export type EntitlementKey = (typeof ENTITLEMENTS)[keyof typeof ENTITLEMENTS];

const FREE_ENTITLEMENTS: string[] = [];

export function useEntitlements() {
  const { data: subscription, isLoading } = useSubscription();

  const planCode: PlanCode = subscription?.plan_code ?? "free";
  const entitlements = subscription?.entitlements ?? FREE_ENTITLEMENTS;
  const isPro = planCode === "student_pro" || planCode === "institutional";
  const isActive = subscription?.status === "active" || subscription?.status === "trialing";

  const has = (key: EntitlementKey): boolean => {
    // Active Pro/institutional plans unlock everything by default; otherwise
    // check the explicit entitlement list returned by the backend.
    if (isPro && isActive) return true;
    return entitlements.includes(key);
  };

  return { planCode, isPro, isActive, entitlements, has, isLoading };
}
