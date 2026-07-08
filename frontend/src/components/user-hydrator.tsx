"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { api } from "@/lib/api";
import { useUserStore } from "@/stores/user.store";

export function UserHydrator() {
  const setUser = useUserStore((s) => s.setUser);
  const setLoading = useUserStore((s) => s.setLoading);

  const { data, isError, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await api.me();
      return res.data ?? null;
    },
    retry: false,
  });

  useEffect(() => {
    if (isLoading) {
      setLoading(true);
      return;
    }
    if (isError) {
      setUser(null);
      return;
    }
    setUser(data ?? null);
  }, [data, isError, isLoading, setUser, setLoading]);

  return null;
}
