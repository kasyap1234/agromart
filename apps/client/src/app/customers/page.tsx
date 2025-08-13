"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, Eye } from "lucide-react";
import { apiClient } from "@/lib/api";
import { DataTable, Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  const { data, error, isLoading, mutate } = useSWR(
    ["customers", page, limit, search],
    () => {
      const params: any = { page, limit };
      if (search) params.search = search;
      return apiClient.customers.list(params);
    },
    { 
      keepPreviousData: true,
      revalidateOnFocus: false
    }
  );

  const customers = useMemo(() => {
    if (!data) return [];
    return (data as any)?.data ?? data ?? [];
  }, [data]);

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      cell: (customer) => (
        <div className="font-medium">{customer.name}</div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (customer) => (
        <div>
          {customer.email && <div>{customer.email}</div>}
          {customer.phone && (
            <div className="text-muted-foreground">{customer.phone}</div>
          )}
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      cell: (customer) => (
        <div className="text-muted-foreground">
          {customer.address || "-"}
        </div>
      ),
    },
  ];

  const renderActions = (customer: Customer) => (
    <Button variant="ghost" size="sm" asChild>
      <Link href={`/customers/${customer.id}`}>
        <Eye className="w-4 h-4 mr-2" />
        View
      </Link>
    </Button>
  );

  const emptyState = (
    <EmptyState
      icon={<PlusIcon className="w-12 h-12 text-muted-foreground" />}
      title="No customers found"
      description="Start building your customer base by adding your first customer."
      action={{
        label: "Add Customer",
        onClick: () => window.location.href = "/customers/new"
      }}
    />
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage your customers</p>
        </div>
        <Button asChild>
          <Link href="/customers/new">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Customer
          </Link>
        </Button>
      </div>

      <DataTable
        data={customers}
        columns={columns}
        loading={isLoading}
        error={error ? "Failed to load customers" : undefined}
        searchable
        searchPlaceholder="Search customers by name, email, or phone"
        onSearch={(query) => setSearch(query)}
        pagination={{
          page,
          limit,
          onPageChange: setPage,
          onLimitChange: (newLimit) => {
            setLimit(newLimit);
            setPage(1);
          },
        }}
        actions={renderActions}
        emptyState={emptyState}
      />
    </div>
  );
}