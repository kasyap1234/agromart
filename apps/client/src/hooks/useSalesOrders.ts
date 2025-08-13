"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api";

export function useSalesOrders(params: { page?: number; limit?: number; customer_id?: string; status?: string }) {
  const key = ["sales:orders", params.page, params.limit, params.customer_id, params.status];
  const { data, error, isLoading, mutate } = useSWR(key, () =>
    apiClient.sales.orders.list(params)
  );

  return {
    orders: (data as any)?.data ?? data ?? [],
    isLoading,
    error,
    mutate,
  };
}
