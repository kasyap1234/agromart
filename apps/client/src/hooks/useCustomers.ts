"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api";

export function useCustomers(params: { limit?: number } = { limit: 1000 }) {
  const key = ["customers:list", params.limit];
  const { data, error, isLoading, mutate } = useSWR(key, () =>
    apiClient.customers.list({ limit: params.limit })
  );

  return {
    customers: (data as any)?.data ?? data ?? [],
    isLoading,
    error,
    mutate,
  };
}
