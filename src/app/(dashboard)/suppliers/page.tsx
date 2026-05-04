import { getSuppliers } from "./actions";
import { SupplierClient } from "./client";

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Suppliers</h2>
        <p className="text-muted-foreground">Manage your suppliers and vendors.</p>
      </div>
      <SupplierClient initialSuppliers={suppliers} />
    </div>
  );
}
