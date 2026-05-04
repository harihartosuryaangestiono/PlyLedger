import { getPurchaseOrders, getSuppliersForSelect, getProductsForSelect } from "./actions";
import { PurchaseClient } from "./client";

export default async function PurchasesPage() {
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
      />
    </div>
  );
}
