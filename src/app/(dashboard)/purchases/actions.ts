"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getPurchaseOrders() {
  try {
    return await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch purchase orders:", error);
    return [];
  }
}

export async function getSuppliersForSelect() {
  try {
    return await prisma.supplier.findMany({
      select: { id: true, name: true }
    });
  } catch (e) { return []; }
}

export async function getProductsForSelect() {
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
  try {
    // Calculate total cost from items
    const itemsCost = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

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
