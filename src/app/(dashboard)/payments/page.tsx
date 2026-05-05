import { hasAccess, canEdit } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getInvoices } from "./actions";
import { PaymentClient } from "./client";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "payments")) {
    redirect("/access-denied");
  }
  const isReadOnly = !canEdit(role, "payments");

  const invoices = await getInvoices();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Payments & Invoices</h2>
        <p className="text-muted-foreground">Manage incoming and outgoing payments.</p>
      </div>
      <PaymentClient initialInvoices={invoices}  readOnly={isReadOnly} />
    </div>
  );
}
