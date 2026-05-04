import prisma from "@/lib/prisma";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // 1. Fetch Outstanding Receivables (Customer owes us)
  const receivables = await prisma.invoice.findMany({
    where: { type: "RECEIVABLE", status: { not: "PAID" } },
    include: { payments: true }
  });
  
  const outstandingReceivables = receivables.reduce((sum: number, inv: any) => {
    const paid = inv.payments.reduce((s: number, p: any) => s + p.amount, 0);
    return sum + (inv.amount - paid);
  }, 0);

  // 2. Fetch Outstanding Payables (We owe Supplier)
  const payables = await prisma.invoice.findMany({
    where: { type: "PAYABLE", status: { not: "PAID" } },
    include: { payments: true }
  });

  const outstandingPayables = payables.reduce((sum: number, inv: any) => {
    const paid = inv.payments.reduce((s: number, p: any) => s + p.amount, 0);
    return sum + (inv.amount - paid);
  }, 0);

  // 3. Profit & Loss based on Cash Payments
  const allPayments = await prisma.payment.findMany({
    include: { invoice: true }
  });
  
  const totalRevenue = allPayments
    .filter((p: any) => p.invoice.type === "RECEIVABLE")
    .reduce((sum: number, p: any) => sum + p.amount, 0);
    
  const totalCost = allPayments
    .filter((p: any) => p.invoice.type === "PAYABLE")
    .reduce((sum: number, p: any) => sum + p.amount, 0);
    
  const netProfit = totalRevenue - totalCost;

  // 4. Generate Chart Data (Last 6 months based on payments)
  // Simplified logic: group payments by month
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = new Date().getMonth();
  
  // Create an array of the last 6 months
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    let d = new Date();
    d.setMonth(currentMonth - i);
    
    // Calculate rev/cost for this specific month
    const monthRev = allPayments
      .filter((p: any) => p.invoice.type === "RECEIVABLE" && new Date(p.paymentDate).getMonth() === d.getMonth() && new Date(p.paymentDate).getFullYear() === d.getFullYear())
      .reduce((sum: number, p: any) => sum + p.amount, 0);
      
    const monthCost = allPayments
      .filter((p: any) => p.invoice.type === "PAYABLE" && new Date(p.paymentDate).getMonth() === d.getMonth() && new Date(p.paymentDate).getFullYear() === d.getFullYear())
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    chartData.push({
      month: months[d.getMonth()],
      revenue: monthRev || 0,
      cost: monthCost || 0
    });
  }

  // 5. Recent Transactions
  // Let's get the 5 most recently updated invoices
  const recentInvoices = await prisma.invoice.findMany({
    take: 5,
    orderBy: { updatedAt: 'desc' },
    include: {
      salesOrder: { include: { customer: true } },
      purchaseOrder: { include: { supplier: true } }
    }
  });

  const recentTransactions = recentInvoices.map((inv: any) => {
    let party = "Unknown";
    if (inv.type === "RECEIVABLE" && inv.salesOrder) {
      party = inv.salesOrder.customer.name;
    } else if (inv.type === "PAYABLE" && inv.purchaseOrder) {
      party = inv.purchaseOrder.supplier.name;
    }
    
    // Generate a simple ID like INV-1024 or BILL-768
    const idPrefix = inv.type === "RECEIVABLE" ? "INV" : "BILL";
    const shortId = inv.id.substring(0, 4).toUpperCase();

    return {
      id: `${idPrefix}-${shortId}`,
      date: new Date(inv.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      party: party,
      type: inv.type === "RECEIVABLE" ? "Sale" : "Purchase",
      amount: inv.amount,
      status: inv.status
    };
  });

  return (
    <DashboardClient 
      metrics={{
        totalRevenue,
        totalCost,
        netProfit,
        outstandingReceivables,
        receivablesCount: receivables.length,
        outstandingPayables,
        payablesCount: payables.length,
      }}
      chartData={chartData}
      recentTransactions={recentTransactions}
    />
  );
}
