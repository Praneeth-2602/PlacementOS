"use client";

import { useEffect } from "react";

import { useMyOrgs } from "@/hooks/use-api";
import { useOrgStore } from "@/stores/org.store";

/**
 * Resolves the caller's active organization for the admin (Phase 8) surfaces.
 * Persists the choice and falls back to the first org the user belongs to.
 */
export function useActiveOrg() {
  const { data: orgs = [], isLoading } = useMyOrgs();
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const setActiveOrgId = useOrgStore((s) => s.setActiveOrgId);

  useEffect(() => {
    if (isLoading) return;
    if (orgs.length === 0) {
      if (activeOrgId) setActiveOrgId(null);
      return;
    }
    const stillValid = activeOrgId && orgs.some((o) => o.id === activeOrgId);
    if (!stillValid) setActiveOrgId(orgs[0].id);
  }, [orgs, isLoading, activeOrgId, setActiveOrgId]);

  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0] ?? null;

  return { orgs, activeOrg, activeOrgId: activeOrg?.id ?? null, isLoading, setActiveOrgId };
}
