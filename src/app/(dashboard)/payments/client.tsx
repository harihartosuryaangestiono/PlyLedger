"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { recordPayment } from "./actions";
import { DollarSign, Search } from "lucide-react";

export function PaymentClient({ initialInvoices }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    await recordPayment({
      invoiceId: selectedInvoice.id,
      amount: Number(formData.get("amount")),
      method: formData.get("method") as string,
      reference: formData.get("reference") as string,
    });
    
    setLoading(false);
    setOpen(false);
    setSelectedInvoice(null);
  }

  const handlePayClick = (invoice: any) => {
    setSelectedInvoice(invoice);
    setOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return <Badge variant="success">{status}</Badge>;
      case 'PARTIALLY_PAID': return <Badge variant="warning">{status.replace('_', ' ')}</Badge>;
      case 'UNPAID': return <Badge variant="error">{status}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Payments & Invoices</h2>
          <p className="text-muted-foreground mt-1 text-sm">Manage accounts receivable and payable</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search invoices..." className="pl-8 max-w-xs" />
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Record Payment: {selectedInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm font-medium text-slate-500">Total Invoice Amount</span>
                <span className="text-sm font-bold">Rp {selectedInvoice?.amount.toLocaleString("id-ID")}</span>
              </div>
              
              <div className="space-y-2">
                <Label>Payment Amount (Rp)</Label>
                <Input 
                  name="amount" 
                  type="number" 
                  step="0.01" 
                  max={selectedInvoice ? selectedInvoice.amount - selectedInvoice.payments.reduce((s:any,p:any)=>s+p.amount,0) : 0} 
                  required 
                />
                <p className="text-xs text-muted-foreground">
                  Remaining balance: Rp {(selectedInvoice ? selectedInvoice.amount - selectedInvoice.payments.reduce((s:any,p:any)=>s+p.amount,0) : 0).toLocaleString("id-ID")}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Input name="method" placeholder="e.g., Bank Transfer, Check" required />
              </div>
              <div className="space-y-2">
                <Label>Reference / Memo</Label>
                <Input name="reference" placeholder="e.g., TXN-98765" />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={loading} className="w-full">{loading ? "Processing..." : "Submit Payment"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="rounded-2xl border border-slate-200 bg-card shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#F8FAFC] sticky top-0 border-b border-slate-200">
            <TableRow className="border-none">
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Invoice #</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Type</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Related Entity</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Amount</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Paid</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Status</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No invoices found. Create a PO or SO first.
                </TableCell>
              </TableRow>
            ) : (
              initialInvoices.map((inv: any, idx: number) => {
                const paid = inv.payments.reduce((s:any, p:any) => s + p.amount, 0);
                return (
                  <TableRow key={inv.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]/60'}>
                    <TableCell className="font-medium text-slate-900 py-3.5 border-b border-slate-100">{inv.invoiceNumber}</TableCell>
                    <TableCell className="py-3.5 border-b border-slate-100">
                      {inv.type === "PAYABLE" ? 
                        <span className="text-orange-600 font-medium text-sm">Payable (AP)</span> : 
                        <span className="text-blue-600 font-medium text-sm">Receivable (AR)</span>
                      }
                    </TableCell>
                    <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">
                      {inv.purchaseOrder ? inv.purchaseOrder.supplier.name : inv.salesOrder?.customer?.name}
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-900 py-3.5 border-b border-slate-100">
                      Rp {inv.amount.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium py-3.5 border-b border-slate-100">
                      Rp {paid.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right py-3.5 border-b border-slate-100">{getStatusBadge(inv.status)}</TableCell>
                    <TableCell className="text-right py-3.5 border-b border-slate-100">
                      {inv.status !== "PAID" ? (
                        <Button variant="outline" size="sm" onClick={() => handlePayClick(inv)} className="h-8">
                          <DollarSign className="mr-1.5 h-3.5 w-3.5" /> Pay
                        </Button>
                      ) : (
                        <span className="text-sm text-slate-400 font-medium mr-4">Settled</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
