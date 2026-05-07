"use server";

import { canEdit, hasAccess } from "@/lib/permissions";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { mkdir, readdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";

export type ShipmentPodFile = {
  name: string;
  size: number;
  uploadedAt: string;
  url: string;
};

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

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getShipmentUploadDir(shipmentId: string) {
  return path.join(process.cwd(), "public", "uploads", "shipments", shipmentId);
}

export async function getShipmentFormOptions() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "shipments")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    const [customers, products, suppliers, shipments] = await Promise.all([
      prisma.customer.findMany({
        select: { id: true, name: true, contactPerson: true, phone: true, address: true },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        select: { id: true, name: true, sku: true, thickness: true, size: true, grade: true, type: true },
        orderBy: { name: "asc" },
      }),
      prisma.supplier.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.shipment.findMany({
        select: { originPort: true, destinationPort: true },
      }),
    ]);

    const originPorts = Array.from(
      new Set(shipments.map((s) => s.originPort).filter((v): v is string => Boolean(v)))
    ).sort();
    const destinationPorts = Array.from(
      new Set(shipments.map((s) => s.destinationPort).filter((v): v is string => Boolean(v)))
    ).sort();

    return {
      customers,
      products,
      suppliers,
      originPorts,
      destinationPorts,
    };
  } catch (error) {
    console.error("Failed to fetch shipment form options:", error);
    return {
      customers: [],
      products: [],
      suppliers: [],
      originPorts: [],
      destinationPorts: [],
    };
  }
}

export async function getShipmentPodFiles() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "shipments")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    const shipments = await prisma.shipment.findMany({ select: { id: true } });
    const result: Record<string, ShipmentPodFile[]> = {};

    await Promise.all(
      shipments.map(async (shipment) => {
        const uploadDir = getShipmentUploadDir(shipment.id);
        try {
          const files = await readdir(uploadDir);
          const rows = await Promise.all(
            files.map(async (file) => {
              const fullPath = path.join(uploadDir, file);
              const fileStat = await stat(fullPath);
              return {
                name: file,
                size: fileStat.size,
                uploadedAt: fileStat.mtime.toISOString(),
                url: `/uploads/shipments/${shipment.id}/${file}`,
              };
            })
          );
          result[shipment.id] = rows.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
        } catch {
          result[shipment.id] = [];
        }
      })
    );
    return result;
  } catch (error) {
    console.error("Failed to load POD files:", error);
    return {};
  }
}

export async function uploadShipmentPod(formData: FormData) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "shipments")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    const shipmentId = String(formData.get("shipmentId") || "");
    const files = formData.getAll("files").filter((v): v is File => v instanceof File);
    if (!shipmentId || files.length === 0) {
      return { success: false, error: "Shipment ID and files are required." };
    }

    const uploadDir = getShipmentUploadDir(shipmentId);
    await mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const stampedName = `${Date.now()}-${sanitizeFileName(file.name)}`;
      await writeFile(path.join(uploadDir, stampedName), buffer);
    }

    revalidatePath("/shipments");
    return { success: true, files: await getShipmentPodFiles() };
  } catch (error) {
    console.error("Failed to upload POD files:", error);
    return { success: false, error: "Failed to upload POD files." };
  }
}

export async function deleteShipmentPodFile(shipmentId: string, fileName: string) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "shipments")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    await unlink(path.join(getShipmentUploadDir(shipmentId), sanitizeFileName(fileName)));
    revalidatePath("/shipments");
    return { success: true, files: await getShipmentPodFiles() };
  } catch (error) {
    return { success: false, error: "Failed to delete POD file." };
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

export async function updateShipment(
  id: string,
  data: {
    containerNumber: string | null;
    billOfLading: string | null;
    originPort: string | null;
    destinationPort: string | null;
    etd: string | null;
    eta: string | null;
    status: string;
  }
) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "shipments")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    await prisma.shipment.update({
      where: { id },
      data: {
        containerNumber: data.containerNumber,
        billOfLading: data.billOfLading,
        originPort: data.originPort,
        destinationPort: data.destinationPort,
        etd: data.etd ? new Date(data.etd) : null,
        eta: data.eta ? new Date(data.eta) : null,
        status: data.status as any,
      },
    });

    revalidatePath("/shipments");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update shipment" };
  }
}

export async function deleteShipment(id: string) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "shipments")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    await prisma.shipment.delete({
      where: { id },
    });

    revalidatePath("/shipments");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete shipment" };
  }
}
