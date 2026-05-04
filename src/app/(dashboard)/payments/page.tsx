import { getInvoices } from "./actions";
import { PaymentClient } from "./client";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const invoices = await getInvoices();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Payments & Invoices</h2>
        <p className="text-muted-foreground">Manage incoming and outgoing payments.</p>
      </div>
      <PaymentClient initialInvoices={invoices} />
    </div>
  );
}
