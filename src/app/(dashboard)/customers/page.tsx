import { hasAccess, canEdit } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCustomers } from "./actions";
import { CustomerClient } from "./client";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "customers")) {
    redirect("/access-denied");
  }
  const isReadOnly = !canEdit(role, "customers");

  const customers = await getCustomers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
        <p className="text-muted-foreground">Manage your client database.</p>
      </div>
      <CustomerClient initialCustomers={customers}  readOnly={isReadOnly} />
    </div>
  );
}
