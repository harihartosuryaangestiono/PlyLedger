import { getProducts } from "./actions";
import { ProductClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Products</h2>
        <p className="text-muted-foreground">Manage your plywood inventory types.</p>
      </div>
      <ProductClient initialProducts={products} />
    </div>
  );
}
