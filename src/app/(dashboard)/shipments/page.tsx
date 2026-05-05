import { hasAccess, canEdit } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getShipments } from "./actions";
import { ShipmentClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ShipmentsPage() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "shipments")) {
    redirect("/access-denied");
  }
  const isReadOnly = !canEdit(role, "shipments");

  const shipments = await getShipments();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Shipments</h2>
        <p className="text-muted-foreground">Track containers and logistics.</p>
      </div>
      <ShipmentClient initialShipments={shipments}  readOnly={isReadOnly} />
    </div>
  );
}
