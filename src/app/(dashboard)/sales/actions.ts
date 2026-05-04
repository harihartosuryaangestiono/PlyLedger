"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSalesOrders() {
  try {
    return await prisma.salesOrder.findMany({
      include: {
        customer: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch sales orders:", error);
    return [];
  }
}

export async function getCustomersForSelect() {
  try {
    return await prisma.customer.findMany({
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

export async function createSalesOrder(data: {
  soNumber: string;
  customerId: string;
  currency: string;
  paymentTerms: "CASH" | "INSTALLMENT" | "LC";
  items: { productId: string; quantity: number; sellingPrice: number; unit: string }[];
}) {
  try {
    // Calculate total amount from items
    const itemsCost = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.sellingPrice), 0);

    const so = await prisma.salesOrder.create({
      data: {
        soNumber: data.soNumber,
        customerId: data.customerId,
        currency: data.currency,
        paymentTerms: data.paymentTerms,
        totalAmount: itemsCost,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            unit: item.unit,
            totalPrice: item.quantity * item.sellingPrice
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
        amount: itemsCost,
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
