import { hasAccess, canEdit } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getShipmentFormOptions, getShipmentPodFiles, getShipments } from "./actions";
import { ShipmentClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ShipmentsPage() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "shipments")) {
    redirect("/access-denied");
  }
  const isReadOnly = !canEdit(role, "shipments");

  const [shipments, formOptions, initialPodFiles] = await Promise.all([
    getShipments(),
    getShipmentFormOptions(),
    getShipmentPodFiles(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Shipments</h2>
        <p className="text-muted-foreground">Track containers and logistics.</p>
      </div>
      <ShipmentClient
        initialShipments={shipments}
        formOptions={formOptions}
        initialPodFiles={initialPodFiles}
        readOnly={isReadOnly}
      />
    </div>
  );
}
