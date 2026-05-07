"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { deleteInvoice, recordPayment, updateInvoice } from "./actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Search, Printer, Download, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";

export function PaymentClient({ initialInvoices , readOnly }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editInvoice, setEditInvoice] = useState<any>(null);
  const [editDueDate, setEditDueDate] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const uniqueStatuses = Array.from(new Set(initialInvoices.map((inv: any) => inv.status))).sort() as string[];
  const uniqueTypes = Array.from(new Set(initialInvoices.map((inv: any) => inv.type))).sort() as string[];

  const filteredInvoices = initialInvoices.filter((inv: any) => {
    if (filterStatus !== "all" && inv.status !== filterStatus) return false;
    if (filterType !== "all" && inv.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const entityName = inv.purchaseOrder ? inv.purchaseOrder.supplier.name : (inv.salesOrder?.customer?.name || "");
      if (!inv.invoiceNumber?.toLowerCase().includes(q) && !entityName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleExport = () => {
    const csvContent = [
      ["Invoice Number", "Type", "Related Entity", "Amount", "Paid", "Status"],
      ...filteredInvoices.map((inv: any) => {
        const entityName = inv.purchaseOrder ? inv.purchaseOrder.supplier.name : (inv.salesOrder?.customer?.name || "");
        const paid = inv.payments.reduce((s:any, p:any) => s + p.amount, 0);
        return [
          `"${inv.invoiceNumber || ''}"`, 
          `"${inv.type || ''}"`, 
          `"${entityName}"`, 
          `"${inv.amount || 0}"`, 
          `"${paid}"`, 
          `"${inv.status}"`
        ];
      })
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payments_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const startEdit = (invoice: any) => {
    setEditInvoice(invoice);
    setEditDueDate(invoice?.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : "");
    setEditOpen(true);
  };

  async function onEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editInvoice) return;

    setEditLoading(true);
    const result = await updateInvoice(editInvoice.id, {
      dueDate: editDueDate ? editDueDate : null,
    });
    setEditLoading(false);

    if (result.success) {
      setEditOpen(false);
      setEditInvoice(null);
    } else {
      alert("Error: " + (result.error || "Gagal mengubah invoice"));
    }
  }

  async function onDelete(invoiceId: string) {
    if (!confirm("Delete invoice ini?")) return;
    setDeletingId(invoiceId);
    const result = await deleteInvoice(invoiceId);
    setDeletingId(null);

    if (!result.success) {
      alert("Error: " + (result.error || "Gagal menghapus invoice"));
    }
  }

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
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search Invoice or Entity..." 
              className="pl-8 w-[220px]" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {uniqueStatuses.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTypes.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* readOnly handling */}

      {!readOnly && (
        <>
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

          <Dialog
            open={editOpen}
            onOpenChange={(v) => {
              setEditOpen(v);
              if (!v) setEditInvoice(null);
            }}
          >
            <DialogContent className="sm:max-w-md w-full">
              <DialogHeader>
                <DialogTitle>Edit Invoice: {editInvoice?.invoiceNumber}</DialogTitle>
              </DialogHeader>
              <form onSubmit={onEditSubmit} className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Kosongkan untuk mengosongkan due date.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={editLoading || !editInvoice} className="w-full">
                    {editLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}

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
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((inv: any, idx: number) => {
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
                      <div className="flex justify-end items-center gap-2">
                      {!readOnly && inv.status !== "PAID" ? (
                          <Button variant="outline" size="sm" onClick={() => handlePayClick(inv)} className="h-8">
                            <DollarSign className="mr-1.5 h-3.5 w-3.5" /> Pay
                          </Button>
                        ) : (
                          <span className="text-sm text-slate-400 font-medium mr-2">{inv.status === "PAID" ? "Settled" : ""}</span>
                        )}

                      {!readOnly && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(inv)}
                            className="h-8"
                          >
                            <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(inv.id)}
                            className="h-8 border-red-200 hover:bg-red-50"
                            disabled={deletingId === inv.id}
                          >
                            <Trash2 className={`mr-1.5 h-3.5 w-3.5 ${deletingId === inv.id ? "text-slate-400" : "text-red-600"}`} /> Delete
                          </Button>
                        </>
                      )}

                        <Link href={`/print/invoice/${inv.id}`}>
                          <Button variant="outline" size="sm" className="h-8">
                            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
                          </Button>
                        </Link>
                      </div>
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
