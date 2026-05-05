import { hasAccess, canEdit } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSalesOrders, getCustomersForSelect, getProductsForSelect } from "./actions";
import { SalesClient } from "./client";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "sales")) {
    redirect("/access-denied");
  }
  const isReadOnly = !canEdit(role, "sales");

  const [salesOrders, customers, products] = await Promise.all([
    getSalesOrders(),
    getCustomersForSelect(),
    getProductsForSelect()
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Sales Orders</h2>
        <p className="text-muted-foreground">Manage your sales to customers.</p>
      </div>
      <SalesClient 
        initialOrders={salesOrders} 
        customers={customers} 
        products={products} 
       readOnly={isReadOnly} />
    </div>
  );
}
