import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { canEdit, hasAccess } from "@/lib/permissions";
import { BookkeepingClient } from "./client";
import { getBookkeepingOverview, getBankTransactions } from "./actions";

export const dynamic = "force-dynamic";

export default async function BookkeepingPage() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "bookkeeping")) {
    redirect("/access-denied");
  }
  const isReadOnly = !canEdit(role, "bookkeeping");

  const [{ categories, latestBatches }, txns] = await Promise.all([
    getBookkeepingOverview(),
    getBankTransactions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Bookkeeping (Bank Mutations)</h2>
        <p className="text-muted-foreground">
          Import and reconcile real bank mutations (KlikBCA-style), categorize, and match to invoices.
        </p>
      </div>

      <BookkeepingClient
        readOnly={isReadOnly}
        initialTransactions={txns}
        categories={categories}
        latestBatches={latestBatches}
      />
    </div>
  );
}

