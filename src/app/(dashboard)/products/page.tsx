import { hasAccess, canEdit } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProducts } from "./actions";
import { ProductClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "products")) {
    redirect("/access-denied");
  }
  const isReadOnly = !canEdit(role, "products");

  const products = await getProducts();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Products</h2>
        <p className="text-muted-foreground">Manage your plywood inventory types.</p>
      </div>
      <ProductClient initialProducts={products}  readOnly={isReadOnly} />
    </div>
  );
}
