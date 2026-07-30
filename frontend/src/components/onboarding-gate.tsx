"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useOnboardingStatus } from "@/hooks/use-api";

/**
 * Client-side onboarding guard (Phase 6). If the signed-in user has not
 * completed their profile, they are routed to `/onboarding` before seeing the
 * dashboard. Kept resilient: any error resolving status is treated as "allow"
 * so a backend hiccup never locks users out.
 */
export function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { data, isLoading, isError } = useOnboardingStatus();

  useEffect(() => {
    if (isLoading || isError || !data) return;
    if (!data.completed && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [data, isLoading, isError, pathname, router]);

  return null;
}
