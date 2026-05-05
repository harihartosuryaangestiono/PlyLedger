"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createSalesOrder } from "./actions";
import { Plus, Printer } from "lucide-react";
import Link from "next/link";

export function SalesClient({ initialOrders, customers, products , readOnly }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([{ productId: "", quantity: 1, sellingPrice: 0, unit: "cbm" }]);
  const [customerId, setCustomerId] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("CASH");

  const addItem = () => setItems([...items, { productId: "", quantity: 1, sellingPrice: 0, unit: "cbm" }]);
  
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.sellingPrice)), 0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    await createSalesOrder({
      soNumber: formData.get("soNumber") as string,
      customerId: customerId,
      currency: formData.get("currency") as string,
      paymentTerms: paymentTerms as any,
      items: items.map(i => ({
        ...i,
        quantity: Number(i.quantity),
        sellingPrice: Number(i.sellingPrice)
      }))
    });
    
    setLoading(false);
    setOpen(false);
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <Badge variant="success">{status}</Badge>;
      case 'PENDING': return <Badge variant="warning">{status}</Badge>;
      case 'CONFIRMED': return <Badge variant="info">{status}</Badge>;
      case 'CANCELLED': return <Badge variant="error">{status}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sales Orders</h2>
          <p className="text-muted-foreground mt-1 text-sm">Manage customer orders and revenue</p>
        </div>
        <div className="flex items-center gap-4">
          <Input placeholder="Search SO..." className="max-w-xs" />
          {!readOnly && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" /> Create SO</Button>} />
              <DialogContent className="sm:max-w-3xl w-full">
                <DialogHeader>
                  <DialogTitle>Create Sales Order</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-lg border">
                    <h3 className="font-medium mb-4 text-sm text-slate-700">General Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="soNumber">SO Number</Label>
                        <Input id="soNumber" name="soNumber" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Customer</Label>
                        <Select value={customerId} onValueChange={(v) => setCustomerId(v || "")}>
                          <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                          <SelectContent>
                            {customers.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Input id="currency" name="currency" defaultValue="IDR" readOnly className="bg-slate-50 text-slate-500 hidden" />
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Terms</Label>
                        <Select value={paymentTerms} onValueChange={(v) => setPaymentTerms(v || "")}>
                          <SelectTrigger><SelectValue placeholder="Terms" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="INSTALLMENT">Installment</SelectItem>
                            <SelectItem value="LC">Letter of Credit (LC)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-sm text-slate-700">Products</h3>
                      <Button type="button" variant="outline" size="sm" onClick={addItem}>+ Add Item</Button>
                    </div>
                    
                    <div className="space-y-3">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-white p-2 border rounded-md">
                          <Select value={item.productId} onValueChange={(v) => updateItem(idx, "productId", v)}>
                            <SelectTrigger className="flex-1 border-0 shadow-none"><SelectValue placeholder="Select product" /></SelectTrigger>
                            <SelectContent>
                              {products.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>{p.name} ({p.thickness} {p.size})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="w-px h-6 bg-slate-200 mx-1"></div>
                          <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} className="w-20 border-0 shadow-none" />
                          <div className="w-px h-6 bg-slate-200 mx-1"></div>
                          <Input placeholder="Unit" value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} className="w-20 border-0 shadow-none" />
                          <div className="w-px h-6 bg-slate-200 mx-1"></div>
                          <Input type="number" placeholder="Price" value={item.sellingPrice} onChange={(e) => updateItem(idx, "sellingPrice", e.target.value)} className="w-24 border-0 shadow-none" />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} disabled={items.length === 1} className="text-slate-400 hover:text-red-500">
                            <span className="sr-only">Remove</span>
                            &times;
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-end pt-2 border-t border-slate-200 mt-4">
                      <div className="text-right">
                        <span className="text-sm text-slate-500 mr-4">Calculated Total</span>
                        <span className="text-lg font-bold text-slate-900">Rp {totalAmount.toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={loading || !customerId} className="w-32">{loading ? "Saving..." : "Create SO"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-card shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#F8FAFC] sticky top-0 border-b border-slate-200">
            <TableRow className="border-none">
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">SO Number</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Customer</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Terms</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Total Amount</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Status</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No sales orders found.
                </TableCell>
              </TableRow>
            ) : (
              initialOrders.map((so: any, idx: number) => (
                <TableRow key={so.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]/60'}>
                  <TableCell className="font-medium text-slate-900 py-3.5 border-b border-slate-100">{so.soNumber}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{so.customer.name}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{so.paymentTerms}</TableCell>
                  <TableCell className="text-right font-medium text-slate-900 py-3.5 border-b border-slate-100">
                    Rp {so.totalAmount.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right py-3.5 border-b border-slate-100">{getStatusBadge(so.status)}</TableCell>
                  <TableCell className="text-right py-3.5 border-b border-slate-100">
                    <Link href={`/print/so/${so.id}`}>
                      <Button variant="outline" size="sm" className="h-8">
                        <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
