"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createPurchaseOrder } from "./actions";
import { Plus, Printer, Download } from "lucide-react";
import Link from "next/link";

export function PurchaseClient({ initialOrders, suppliers, products , readOnly }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([{ productId: "", quantity: 1, unitPrice: 0, unit: "cbm" }]);
  const [supplierId, setSupplierId] = useState("");
  const [filterThickness, setFilterThickness] = useState("all");

  const uniqueThicknesses = Array.from(new Set(
    initialOrders.flatMap((po: any) => po.items.map((i: any) => i.product?.thickness)).filter(Boolean)
  )).sort() as string[];

  const filteredOrders = initialOrders.filter((po: any) => {
    if (filterThickness !== "all") {
      const hasThickness = po.items.some((i: any) => i.product?.thickness === filterThickness);
      if (!hasThickness) return false;
    }
    return true;
  });

  const handleExport = () => {
    const csvContent = [
      ["PO Number", "Supplier", "Total Cost", "Status", "Date"],
      ...filteredOrders.map((po: any) => [
        `"${po.poNumber}"`, 
        `"${po.supplier.name}"`, 
        `"${po.totalCost}"`, 
        `"${po.status}"`, 
        `"${new Date(po.createdAt).toLocaleDateString()}"`
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `purchases_report_${filterThickness === 'all' ? 'all' : filterThickness}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addItem = () => setItems([...items, { productId: "", quantity: 1, unitPrice: 0, unit: "cbm" }]);
  
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

  const totalCost = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    await createPurchaseOrder({
      poNumber: formData.get("poNumber") as string,
      supplierId: supplierId,
      currency: formData.get("currency") as string,
      items: items.map(i => ({
        ...i,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice)
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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Purchase Orders</h2>
          <p className="text-muted-foreground mt-1 text-sm">Manage purchases and incoming inventory</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={filterThickness} onValueChange={setFilterThickness}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Thickness" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Thickness</SelectItem>
              {uniqueThicknesses.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          {!readOnly && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" /> Create PO</Button>} />
              <DialogContent className="sm:max-w-3xl w-full">
                <DialogHeader>
                  <DialogTitle>Create Purchase Order</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-lg border">
                    <h3 className="font-medium mb-4 text-sm text-slate-700">General Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="poNumber">PO Number</Label>
                        <Input id="poNumber" name="poNumber" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Supplier</Label>
                        <Select value={supplierId} onValueChange={(v) => setSupplierId(v || "")}>
                          <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                          <SelectContent>
                            {suppliers.map((s: any) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 hidden">
                        <Label htmlFor="currency">Currency</Label>
                        <Input id="currency" name="currency" defaultValue="IDR" readOnly className="bg-slate-50 text-slate-500 hidden" />
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
                          <Input type="number" placeholder="Price" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} className="w-24 border-0 shadow-none" />
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
                        <span className="text-lg font-bold text-slate-900">Rp {totalCost.toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={loading || !supplierId} className="w-32">{loading ? "Saving..." : "Create PO"}</Button>
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
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">PO Number</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Supplier</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Total Cost</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Status</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  No purchase orders found.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((po: any, idx: number) => (
                <TableRow key={po.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]/60'}>
                  <TableCell className="font-medium text-slate-900 py-3.5 border-b border-slate-100">{po.poNumber}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{po.supplier.name}</TableCell>
                  <TableCell className="text-right font-medium text-slate-900 py-3.5 border-b border-slate-100">
                    Rp {po.totalCost.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right py-3.5 border-b border-slate-100">{getStatusBadge(po.status)}</TableCell>
                  <TableCell className="text-right py-3.5 border-b border-slate-100">
                    <Link href={`/print/po/${po.id}`}>
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
