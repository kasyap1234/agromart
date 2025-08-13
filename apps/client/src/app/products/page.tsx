export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<{
    minPrice?: number;
    maxPrice?: number;
    brand?: string;
  }>({});

  const { data, error, isLoading, mutate } = useSWR<Product[]>(
    ["products:list", page, limit, search, filters],
    ([key, p, l, s, f]) => fetcher(String(key), Number(p), Number(l), String(s), f as { minPrice?: number; maxPrice?: number; brand?: string; }),
    { 
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateIfStale: false
    }
  );

  const products = data || [];

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await apiClient.products.delete(id);
      toast.success('Product deleted successfully');
      mutate();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to delete product';
      toast.error(message);
    }
  };

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      cell: (product) => (
        <div>
          <div className="font-medium">{product.name}</div>
          <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
        </div>
      ),
    },
    {
      key: 'brand',
      header: 'Brand',
      cell: (product) => (
        product.brand ? (
          <Badge variant="secondary">{product.brand}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: 'selling_price',
      header: 'Price',
      className: 'text-right',
      cell: (product) => `₹${product.selling_price?.toFixed(2) || "0.00"}`,
    },
  ];

  const renderActions = (product: Product) => (
    <div className="flex justify-end space-x-1">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/products/${product.id}`} aria-label={`View ${product.name}`}>
          <Eye className="w-4 h-4" />
        </Link>
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/products/${product.id}/edit`} aria-label={`Edit ${product.name}`}>
          <Pencil className="w-4 h-4" />
        </Link>
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        aria-label={`Delete ${product.name}`}
        onClick={() => handleDelete(product.id, product.name)}
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );

  const emptyState = (
    <EmptyState
      icon={<PlusIcon className="w-12 h-12 text-muted-foreground" />}
      title="No products found"
      description="Get started by adding your first product to the inventory."
      action={{
        label: "Add Product",
        onClick: () => window.location.href = "/products/new"
      }}
    />
  );

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

      <DataTable
        data={products}
        columns={columns}
        loading={isLoading}
        error={error ? "Failed to load products" : undefined}
        searchable
        searchPlaceholder="Search products by name, SKU, or brand"
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