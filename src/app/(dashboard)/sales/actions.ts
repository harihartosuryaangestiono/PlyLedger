"use server";

import { canEdit, hasAccess } from "@/lib/permissions";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSalesOrders() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "sales")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    return await prisma.salesOrder.findMany({
      include: {
        customer: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch sales orders:", error);
    return [];
  }
}

export async function getCustomersForSelect() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "sales")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    return await prisma.customer.findMany({
      select: { id: true, name: true }
    });
  } catch (e) { return []; }
}

export async function getProductsForSelect() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "sales")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    return await prisma.product.findMany({
      select: { id: true, sku: true, name: true, type: true, thickness: true, size: true }
    });
  } catch (e) { return []; }
}

export async function createSalesOrder(data: {
  soNumber: string;
  customerId: string;
  currency: string;
  paymentTerms: "CASH" | "INSTALLMENT" | "LC";
  subTotal: number;
  hasTax: boolean;
  taxAmount: number;
  totalAmount: number;
  items: { productId: string; pallets?: number | null; quantity: number; sellingPrice: number; unit: string; totalPrice: number }[];
}) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "sales")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    const so = await prisma.salesOrder.create({
      data: {
        soNumber: data.soNumber,
        customerId: data.customerId,
        currency: data.currency,
        paymentTerms: data.paymentTerms,
        subTotal: data.subTotal,
        hasTax: data.hasTax,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            pallets: item.pallets,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            unit: item.unit,
            totalPrice: item.totalPrice
          }))
        }
      }
    });

    // Auto-create Invoice
    await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-SO-${data.soNumber}`,
        type: "RECEIVABLE",
        salesOrderId: so.id,
        amount: data.totalAmount,
        currency: data.currency,
        status: "UNPAID",
      }
    });
    
    revalidatePath("/sales");
    return { success: true };
  } catch (error) {
    console.error("Failed to create sales order:", error);
    return { success: false, error: "Failed to create sales order" };
  }
}

export async function updateSalesOrderStatus(id: string, status: string) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "sales")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    await prisma.salesOrder.update({
      where: { id },
      data: { status: status as any },
    });

    revalidatePath("/sales");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update sales order status" };
  }
}

export async function deleteSalesOrder(id: string) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "sales")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const invoices = await tx.invoice.findMany({
        where: { salesOrderId: id },
        select: {
          id: true,
          payments: { select: { id: true } },
        },
      });

      const invoiceIds = invoices.map((i) => i.id);
      const paymentIds = invoices.flatMap((i) => i.payments.map((p) => p.id));

      if (paymentIds.length > 0) {
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

      await tx.salesOrder.delete({ where: { id } });
    });

    revalidatePath("/sales");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete sales order" };
  }
}
