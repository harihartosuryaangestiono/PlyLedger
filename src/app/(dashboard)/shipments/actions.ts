"use server";

import { canEdit, hasAccess } from "@/lib/permissions";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getShipments() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "shipments")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    return await prisma.shipment.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch shipments:", error);
    return [];
  }
}

export async function createShipment(data: {
  containerNumber: string;
  billOfLading: string;
  originPort: string;
  destinationPort: string;
  etd: string;
  eta: string;
}) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "shipments")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    await prisma.shipment.create({
      data: {
        containerNumber: data.containerNumber,
        billOfLading: data.billOfLading,
        originPort: data.originPort,
        destinationPort: data.destinationPort,
        etd: data.etd ? new Date(data.etd) : null,
        eta: data.eta ? new Date(data.eta) : null,
      }
    });
    
    revalidatePath("/shipments");
    return { success: true };
  } catch (error) {
    console.error("Failed to create shipment:", error);
    return { success: false, error: "Failed to create shipment" };
  }
}
