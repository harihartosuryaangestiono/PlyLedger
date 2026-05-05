import { hasAccess, canEdit } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPurchaseOrders, getSuppliersForSelect, getProductsForSelect } from "./actions";
import { PurchaseClient } from "./client";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "purchases")) {
    redirect("/access-denied");
  }
  const isReadOnly = !canEdit(role, "purchases");

  const [purchaseOrders, suppliers, products] = await Promise.all([
    getPurchaseOrders(),
    getSuppliersForSelect(),
    getProductsForSelect()
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Purchase Orders</h2>
        <p className="text-muted-foreground">Manage your purchases from suppliers.</p>
      </div>
      <PurchaseClient 
        initialOrders={purchaseOrders} 
        suppliers={suppliers} 
        products={products} 
       readOnly={isReadOnly} />
    </div>
  );
}
