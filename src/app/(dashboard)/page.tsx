import prisma from "@/lib/prisma";
import { DashboardClient } from "./dashboard-client";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  
  // SALES role restriction check
  const isSales = role === "SALES";

  // 1. Fetch Outstanding Receivables (Customer owes us)
  const receivables = await prisma.invoice.findMany({
    where: { type: "RECEIVABLE", status: { not: "PAID" } },
    include: { payments: true, salesOrder: { include: { customer: true } } }
  });
  
  const outstandingReceivables = receivables.reduce((sum: number, inv: any) => {
    const paid = inv.payments.reduce((s: number, p: any) => s + p.amount, 0);
    return sum + (inv.amount - paid);
  }, 0);

  // 2. Fetch Outstanding Payables (We owe Supplier) - Skip if SALES
  let payables: any[] = [];
  let outstandingPayables = 0;
  if (!isSales) {
    payables = await prisma.invoice.findMany({
      where: { type: "PAYABLE", status: { not: "PAID" } },
      include: { payments: true, purchaseOrder: { include: { supplier: true } } }
    });
    outstandingPayables = payables.reduce((sum: number, inv: any) => {
      const paid = inv.payments.reduce((s: number, p: any) => s + p.amount, 0);
      return sum + (inv.amount - paid);
    }, 0);
  }

  // 3. Profit & Loss / Revenue & Cost
  // All Invoices for Revenue
  const allReceivableInvoices = await prisma.invoice.findMany({
    where: { type: "RECEIVABLE" }
  });
  const totalRevenue = allReceivableInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  // All Purchase Orders for Cost (Item Cost + Freight + Handling + Doc)
  let totalCost = 0;
  let allPOs: any[] = [];
  if (!isSales) {
    allPOs = await prisma.purchaseOrder.findMany();
    totalCost = allPOs.reduce((sum, po) => sum + po.totalCost + po.freightCost + po.handlingCost + po.documentationCost, 0);
  }
  
  const netProfit = totalRevenue - totalCost;

  // Cash Balance = Total Received Payments - Total Sent Payments
  const allPayments = await prisma.payment.findMany({
    include: { invoice: true }
  });
  
  const inflow = allPayments.filter(p => p.invoice.type === "RECEIVABLE").reduce((sum, p) => sum + p.amount, 0);
  const outflow = allPayments.filter(p => p.invoice.type === "PAYABLE").reduce((sum, p) => sum + p.amount, 0);
  const cashBalance = isSales ? 0 : inflow - outflow;

  // 4. Generate Chart Data (Last 6 months)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    let d = new Date(currentYear, currentMonth - i, 1);
    
    // Revenue from invoices created in that month
    const monthRev = allReceivableInvoices
      .filter((inv: any) => new Date(inv.createdAt).getMonth() === d.getMonth() && new Date(inv.createdAt).getFullYear() === d.getFullYear())
      .reduce((sum: number, inv: any) => sum + inv.amount, 0);
      
    // Cost from POs created in that month
    const monthCost = isSales ? 0 : allPOs
      .filter((po: any) => new Date(po.createdAt).getMonth() === d.getMonth() && new Date(po.createdAt).getFullYear() === d.getFullYear())
      .reduce((sum: number, po: any) => sum + po.totalCost + po.freightCost + po.handlingCost + po.documentationCost, 0);

    const monthInflow = allPayments
      .filter((p: any) => p.invoice.type === "RECEIVABLE" && new Date(p.paymentDate).getMonth() === d.getMonth() && new Date(p.paymentDate).getFullYear() === d.getFullYear())
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    const monthOutflow = isSales ? 0 : allPayments
      .filter((p: any) => p.invoice.type === "PAYABLE" && new Date(p.paymentDate).getMonth() === d.getMonth() && new Date(p.paymentDate).getFullYear() === d.getFullYear())
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    chartData.push({
      month: `${months[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`,
      revenue: monthRev,
      cost: monthCost,
      profit: monthRev - monthCost,
      inflow: monthInflow,
      outflow: monthOutflow,
      netCash: monthInflow - monthOutflow
    });
  }

  // 5. Operational Summary: Recent Transactions
  const recentInvoices = await prisma.invoice.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      salesOrder: { include: { customer: true } },
      purchaseOrder: { include: { supplier: true } }
    }
  });

  const recentTransactions = recentInvoices
    .filter(inv => !isSales || inv.type === "RECEIVABLE")
    .slice(0, 5)
    .map((inv: any) => {
      let party = "Unknown";
      if (inv.type === "RECEIVABLE" && inv.salesOrder) {
        party = inv.salesOrder.customer.name;
      } else if (inv.type === "PAYABLE" && inv.purchaseOrder) {
        party = inv.purchaseOrder.supplier.name;
      }
      
      const idPrefix = inv.type === "RECEIVABLE" ? "INV" : "BILL";
      const shortId = inv.id.substring(0, 4).toUpperCase();

      return {
        id: `${idPrefix}-${shortId}`,
        rawDate: inv.createdAt,
        date: new Date(inv.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        party: party,
        type: inv.type === "RECEIVABLE" ? "Sale" : "Purchase",
        amount: inv.amount,
        status: inv.status
      };
    });

  // 6. Pending Payments (Overdue / Unpaid Invoices)
  const pendingInvoices = await prisma.invoice.findMany({
    where: { 
      status: { not: "PAID" },
      ...(isSales ? { type: "RECEIVABLE" } : {})
    },
    take: 10,
    orderBy: [
      { dueDate: 'asc' }, // Prioritize overdue
      { createdAt: 'desc' }
    ],
    include: {
      salesOrder: { include: { customer: true } },
      purchaseOrder: { include: { supplier: true } },
      payments: true
    }
  });

  const pendingPayments = pendingInvoices.slice(0, 5).map(inv => {
    let party = "Unknown";
    if (inv.type === "RECEIVABLE" && inv.salesOrder) party = inv.salesOrder.customer.name;
    else if (inv.type === "PAYABLE" && inv.purchaseOrder) party = inv.purchaseOrder.supplier.name;

    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date();

    return {
      id: inv.invoiceNumber,
      party,
      type: inv.type,
      total: inv.amount,
      outstanding: inv.amount - paid,
      dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'N/A',
      isOverdue
    }
  });

  // 7. Active Shipments
  const activeShipmentsData = await prisma.shipment.findMany({
    where: { status: "IN_TRANSIT" },
    take: 5,
    orderBy: { etd: 'desc' },
    include: {
      salesOrders: true,
      purchaseOrders: true
    }
  });

  const activeShipments = activeShipmentsData
    .filter(s => !isSales || s.salesOrders.length > 0)
    .map(s => ({
      id: s.containerNumber || s.id.substring(0, 8).toUpperCase(),
      origin: s.originPort || "Unknown",
      destination: s.destinationPort || "Unknown",
      etd: s.etd ? new Date(s.etd).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'N/A',
      eta: s.eta ? new Date(s.eta).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'N/A',
      type: s.salesOrders.length > 0 ? "Export (Sales)" : "Import (Purchase)"
    }));

  return (
    <DashboardClient 
      role={role}
      metrics={{
        totalRevenue,
        totalCost,
        netProfit,
        outstandingReceivables,
        outstandingPayables,
        cashBalance
      }}
      chartData={chartData}
      recentTransactions={recentTransactions}
      pendingPayments={pendingPayments}
      activeShipments={activeShipments}
    />
  );
}
