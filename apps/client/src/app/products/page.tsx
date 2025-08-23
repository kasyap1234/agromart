import { Suspense } from "react";
import ProductsPage from "./ProductsPage";

export default function ProductsPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading products...</p>
        </div>
      </div>
    }>
      <ProductsPage />
    </Suspense>
  );
}