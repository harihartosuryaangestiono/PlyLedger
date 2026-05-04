import { getShipments } from "./actions";
import { ShipmentClient } from "./client";

export default async function ShipmentsPage() {
  const shipments = await getShipments();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Shipments</h2>
        <p className="text-muted-foreground">Track containers and logistics.</p>
      </div>
      <ShipmentClient initialShipments={shipments} />
    </div>
  );
}
