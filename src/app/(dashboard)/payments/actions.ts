"use server";

import { canEdit, hasAccess } from "@/lib/permissions";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getInvoices() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "payments")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

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
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "payments")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

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
    await prisma.$transaction(async (tx: any) => {
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

export async function updateInvoice(
  invoiceId: string,
  data: {
    dueDate: string | null;
  }
) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "payments")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });

    revalidatePath("/payments");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update invoice" };
  }
}

export async function deleteInvoice(invoiceId: string) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "payments")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const payments = await tx.payment.findMany({
        where: { invoiceId },
        select: { id: true },
      });

      const paymentIds = payments.map((p) => p.id);

      if (paymentIds.length > 0) {
        await tx.journalEntry.deleteMany({
          where: {
            referenceType: "Payment",
            referenceId: { in: paymentIds },
          },
        });
        await tx.payment.deleteMany({
          where: { id: { in: paymentIds } },
        });
      }

      await tx.invoice.delete({
        where: { id: invoiceId },
      });
    });

    revalidatePath("/payments");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete invoice" };
  }
}
