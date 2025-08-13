import useSWR from "swr";
import Link from "next/link";
import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, Eye } from "lucide-react";
import { apiClient } from "@/lib/api";
import { DataTable, Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export default function SuppliersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  const { data, error, isLoading, mutate } = useSWR(
    ["suppliers", page, limit, search],
    () => {
      const params: any = { page, limit };
      if (search) params.search = search;
      return apiClient.suppliers.list(params);
    },
    { 
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateIfStale: false
    }
  );

  const suppliers = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : data?.data || [];
  }, [data]);

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier',
      cell: (supplier) => (
        <div className="font-medium">{supplier.name}</div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (supplier) => (
        <div>
          {supplier.email && <div>{supplier.email}</div>}
          {supplier.phone && (
            <div className="text-muted-foreground">{supplier.phone}</div>
          )}
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      cell: (supplier) => (
        <div className="text-muted-foreground">
          {supplier.address || "-"}
        </div>
      ),
    },
  ];

  const renderActions = (supplier: Supplier) => (
    <Button variant="ghost" size="sm" asChild>
      <Link href={`/suppliers/${supplier.id}`}>
        <Eye className="w-4 h-4 mr-2" />
        View
      </Link>
    </Button>
  );

  const emptyState = (
    <EmptyState
      icon={<PlusIcon className="w-12 h-12 text-muted-foreground" />}
      title="No suppliers found"
      description="Build your supplier network by adding your first supplier."
      action={{
        label: "Add Supplier",
        onClick: () => window.location.href = "/suppliers/new"
      }}
    />
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">Manage your suppliers</p>
        </div>
        <Button asChild>
          <Link href="/suppliers/new">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Supplier
          </Link>
        </Button>
      </div>

      <DataTable
        data={suppliers}
        columns={columns}
        loading={isLoading}
        error={error ? "Failed to load suppliers" : undefined}
        searchable
        searchPlaceholder="Search suppliers by name, email, or phone"
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