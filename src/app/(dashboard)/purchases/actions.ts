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
      select: { id: true, sku: true, name: true, type: true, thickness: true, size: true }
    });
  } catch (e) { return []; }
}

export async function createPurchaseOrder(data: {
  poNumber: string;
  supplierId: string;
  shippingAddress?: string;
  currency: string;
  subTotal: number;
  hasTax: boolean;
  taxAmount: number;
  totalAmount: number;
  items: { productId: string; pallets?: number | null; quantity: number; unitPrice: number; unit: string; totalPrice: number }[];
}) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "purchases")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: data.poNumber,
        supplierId: data.supplierId,
        shippingAddress: data.shippingAddress,
        currency: data.currency,
        subTotal: data.subTotal,
        hasTax: data.hasTax,
        taxAmount: data.taxAmount,
        totalCost: data.totalAmount, // Map UI grandTotal to db totalCost
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            pallets: item.pallets,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unit: item.unit,
            totalPrice: item.totalPrice
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
        amount: data.totalAmount,
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

export async function updatePurchaseOrderStatus(id: string, status: string, shippingAddress?: string | null) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "purchases")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    await prisma.purchaseOrder.update({
      where: { id },
      data: { 
        status: status as any,
        ...(shippingAddress !== undefined && { shippingAddress })
      },
    });

    revalidatePath("/purchases");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update purchase order status" };
  }
}

export async function deletePurchaseOrder(id: string) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "purchases")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const invoices = await tx.invoice.findMany({
        where: { purchaseOrderId: id },
        select: {
          id: true,
          payments: { select: { id: true } },
        },
      });

      const invoiceIds = invoices.map((i) => i.id);
      const paymentIds = invoices.flatMap((i) => i.payments.map((p) => p.id));

      if (paymentIds.length > 0) {
        // Keep accounting ledger consistent by removing journal entries created for those payments
        await tx.journalEntry.deleteMany({
          where: {
            referenceType: "Payment",
            referenceId: { in: paymentIds },
          },
        });
        await tx.payment.deleteMany({ where: { id: { in: paymentIds } } });
      }

      if (invoiceIds.length > 0) {
        await tx.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
      }

      await tx.purchaseOrder.delete({ where: { id } });
    });

    revalidatePath("/purchases");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete purchase order" };
  }
}
