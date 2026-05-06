"use server";

import { canEdit, hasAccess } from "@/lib/permissions";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getPurchaseOrders() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "purchases")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    return await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch purchase orders:", error);
    return [];
  }
}

export async function getSuppliersForSelect() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "purchases")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    return await prisma.supplier.findMany({
      select: { id: true, name: true }
    });
  } catch (e) { return []; }
}

export async function getProductsForSelect() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "purchases")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    return await prisma.product.findMany({
      select: { id: true, name: true, type: true, thickness: true, size: true }
    });
  } catch (e) { return []; }
}

export async function createPurchaseOrder(data: {
  poNumber: string;
  supplierId: string;
  currency: string;
  items: { productId: string; quantity: number; unitPrice: number; unit: string }[];
}) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "purchases")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    // Calculate total cost from items
    const itemsCost = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: data.poNumber,
        supplierId: data.supplierId,
        currency: data.currency,
        totalCost: itemsCost,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unit: item.unit,
            totalPrice: item.quantity * item.unitPrice
          }))
        }
      }
    });

    // Auto-create Invoice
    await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-PO-${data.poNumber}`,
        type: "PAYABLE",
        purchaseOrderId: po.id,
        amount: itemsCost,
        currency: data.currency,
        status: "UNPAID",
      }
    });
    
    revalidatePath("/purchases");
    return { success: true };
  } catch (error) {
    console.error("Failed to create purchase order:", error);
    return { success: false, error: "Failed to create purchase order" };
  }
}
