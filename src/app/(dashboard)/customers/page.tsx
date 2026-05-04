import { getCustomers } from "./actions";
import { CustomerClient } from "./client";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
        <p className="text-muted-foreground">Manage your client database.</p>
      </div>
      <CustomerClient initialCustomers={customers} />
    </div>
  );
}
