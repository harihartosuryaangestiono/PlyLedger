import { hasAccess, canEdit } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSuppliers } from "./actions";
import { SupplierClient } from "./client";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "suppliers")) {
    redirect("/access-denied");
  }
  const isReadOnly = !canEdit(role, "suppliers");

  const suppliers = await getSuppliers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Suppliers</h2>
        <p className="text-muted-foreground">Manage your suppliers and vendors.</p>
      </div>
      <SupplierClient initialSuppliers={suppliers}  readOnly={isReadOnly} />
    </div>
  );
}
