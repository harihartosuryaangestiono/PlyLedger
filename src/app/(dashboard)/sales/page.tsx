import { getSalesOrders, getCustomersForSelect, getProductsForSelect } from "./actions";
import { SalesClient } from "./client";

export default async function SalesPage() {
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
      />
    </div>
  );
}
