"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState, useMemo, useCallback } from "react";
import { debounce } from "@/lib/utils";
import { 
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchIcon, PlusIcon } from "lucide-react";
import { apiClient } from "@/lib/api";

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

  // Debounced search to reduce API calls
  const debouncedSearch = useMemo(
    () => debounce((value: string) => setSearch(value), 300),
    []
  );

  const handleSearchChange = useCallback((value: string) => {
    setPage(1); // Reset to first page when search changes
    debouncedSearch(value);
  }, [debouncedSearch]);

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

  const hasNextPage = customers.length === limit;
  const hasPrevPage = page > 1;

  if (error) {
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
        
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-500 mb-4">Failed to load customers.</div>
            <Button variant="outline" onClick={() => mutate()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      {/* Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search customers by name, email, or phone"
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {!isLoading && customers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground mb-4">No customers found.</div>
            <Button variant="outline" onClick={() => {
              setSearch("");
              setPage(1);
            }}>
              Clear search
            </Button>
            <Button className="ml-2" asChild>
              <Link href="/customers/new">Add a new customer</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        !isLoading && (
          <>
            {/* Customers Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer: Customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">
                          {customer.name}
                        </TableCell>
                        <TableCell>
                          <div>
                            {customer.email && (
                              <div>{customer.email}</div>
                            )}
                            {customer.phone && (
                              <div className="text-muted-foreground">{customer.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-muted-foreground">
                            {customer.address || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/customers/${customer.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Rows per page</span>
                  <Select value={String(limit)} onValueChange={(value: string) => {
                    setLimit(Number(value));
                    setPage(1);
                  }}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={!hasPrevPage}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={!hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </>
        )
      )}
    </div>
  );
}