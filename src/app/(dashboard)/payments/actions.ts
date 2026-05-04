"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getInvoices() {
  try {
    return await prisma.invoice.findMany({
      include: {
        purchaseOrder: { include: { supplier: true } },
        salesOrder: { include: { customer: true } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return [];
  }
}

export async function recordPayment(data: {
  invoiceId: string;
  amount: number;
  method: string;
  reference: string;
}) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { payments: true }
    });
    
    if (!invoice) throw new Error("Invoice not found");

    // Calculate new status
    const totalPaidSoFar = invoice.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const newTotalPaid = totalPaidSoFar + data.amount;
    
    let newStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID" = "PARTIALLY_PAID";
    if (newTotalPaid >= invoice.amount) {
      newStatus = "PAID";
    }

    // Handle system user for audit log if no auth exists
    let systemUser = await prisma.user.findFirst({ where: { role: "ADMIN" }});
    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: {
          email: "system@plywood.com",
          name: "System Auto",
          password: "hash",
          role: "ADMIN"
        }
      });
    }

    // Atomically create payment, update invoice, write journals, write audit log
    await prisma.$transaction(async (tx) => {
      // 1. Create Payment
      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: data.amount,
          currency: invoice.currency,
          method: data.method,
          reference: data.reference,
        }
      });

      // 2. Update Invoice
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus }
      });

      // 3. Create Journal Entries (Double Entry Accounting)
      const isPayable = invoice.type === "PAYABLE";
      await tx.journalEntry.create({
        data: {
          description: `Payment for ${invoice.invoiceNumber}`,
          account: isPayable ? "Accounts Payable" : "Accounts Receivable",
          type: isPayable ? "DEBIT" : "CREDIT",
          amount: data.amount,
          currency: invoice.currency,
          referenceId: payment.id,
          referenceType: "Payment"
        }
      });
      
      await tx.journalEntry.create({
        data: {
          description: `Cash/Bank for ${invoice.invoiceNumber}`,
          account: "Cash/Bank",
          type: isPayable ? "CREDIT" : "DEBIT",
          amount: data.amount,
          currency: invoice.currency,
          referenceId: payment.id,
          referenceType: "Payment"
        }
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: systemUser.id,
          action: "CREATE_PAYMENT",
          entity: "Payment",
          entityId: payment.id,
          details: JSON.stringify({ amount: data.amount, invoiceId: invoice.id })
        }
      });
    });

    revalidatePath("/payments");
    return { success: true };
  } catch (error) {
    console.error("Payment error:", error);
    return { success: false, error: "Failed to record payment" };
  }
}
