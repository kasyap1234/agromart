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
import { Badge } from "@/components/ui/badge";
import { SearchIcon, PlusIcon, FilterIcon } from "lucide-react";
import { apiClient } from "@/lib/api";

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  brand?: string;
  image_url?: string;
  unit_id?: string;
  price_per_unit?: number;
}

const fetcher = async (
  key: string, 
  page: number, 
  limit: number, 
  search: string,
  filters: {
    minPrice?: number;
    maxPrice?: number;
    brand?: string;
  }
) => {
  const params: any = { page, limit };
  
  if (search && search.trim()) {
    params.search = search.trim();
  }
  
  if (filters.minPrice !== undefined) {
    params.min_price = filters.minPrice;
  }
  
  if (filters.maxPrice !== undefined) {
    params.max_price = filters.maxPrice;
  }
  
  if (filters.brand) {
    params.brand = filters.brand;
  }
  
  const data = await apiClient.products.list(params);
  const arr = (data as any)?.data ?? (data as any)?.items ?? data;
  return Array.isArray(arr) ? arr as Product[] : [] as Product[];
};

// Extract unique brands from products
const extractBrands = (products: Product[]): string[] => {
  const brands = new Set<string>();
  products.forEach(product => {
    if (product.brand) {
      brands.add(product.brand);
    }
  });
  return Array.from(brands).sort();
};

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<{
    minPrice?: number;
    maxPrice?: number;
    brand?: string;
  }>({});

  // Debounced search to reduce API calls
  const debouncedSearch = useMemo(
    () => debounce((value: string) => setSearch(value), 300),
    []
  );

  const handleSearchChange = useCallback((value: string) => {
    setPage(1); // Reset to first page when search changes
    debouncedSearch(value);
  }, [debouncedSearch]);

  const { data, error, isLoading, mutate } = useSWR<Product[]>(
    ["products:list", page, limit, search, filters],
    ([key, p, l, s, f]) => fetcher(String(key), Number(p), Number(l), String(s), f as { minPrice?: number; maxPrice?: number; brand?: string; }),
    { 
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateIfStale: false
    }
  );

  // Extract brands for filter dropdown
  const brands = useMemo(() => {
    return data ? extractBrands(data) : [];
  }, [data]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: {
    minPrice?: number;
    maxPrice?: number;
    brand?: string;
  }) => {
    setPage(1); // Reset to first page when filters change
    setFilters(newFilters);
  }, []);

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Handle limit change
  const handleLimitChange = useCallback((newLimit: number) => {
    setPage(1); // Reset to first page when limit changes
    setLimit(newLimit);
  }, []);

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground">Manage your product inventory</p>
          </div>
          <Button asChild>
            <Link href="/products/new">
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Product
            </Link>
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-500 mb-4">Failed to load products.</div>
            <Button variant="outline" onClick={() => mutate()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const products = data || [];
  const hasNextPage = products.length === limit;
  const hasPrevPage = page > 1;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>
        <Button asChild>
          <Link href="/products/new">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search products by name, SKU, or brand"
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Select onValueChange={(value: string) => handleFiltersChange({ ...filters, brand: value || undefined })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Brands</SelectItem>
                  {brands.map(brand => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" size="icon">
                <FilterIcon className="w-4 h-4" />
              </Button>
              <Button variant="outline">Export</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {!isLoading && products.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground mb-4">No products found.</div>
            <Button variant="outline" onClick={() => {
              setSearch("");
              setFilters({});
              setPage(1);
            }}>
              Clear all filters
            </Button>
            <Button className="ml-2" asChild>
              <Link href="/products/new">Add a new product</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        !isLoading && (
          <>
            {/* Products Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          <div>{product.name}</div>
                        </TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>
                          {product.brand ? (
                            <Badge variant="secondary">{product.brand}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{product.price?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/products/${product.id}`}>View</Link>
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
                  <Select value={String(limit)} onValueChange={(value: string) => handleLimitChange(Number(value))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
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
                    onClick={() => handlePageChange(page + 1)}
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