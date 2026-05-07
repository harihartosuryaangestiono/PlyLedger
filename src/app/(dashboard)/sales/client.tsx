"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { createSalesOrder, deleteSalesOrder, updateSalesOrderStatus } from "./actions";
import { Edit2, Plus, Printer, Download, Search, Trash2 } from "lucide-react";
import Link from "next/link";

export function SalesClient({ initialOrders, customers, products , readOnly }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editOrder, setEditOrder] = useState<any>(null);
  const [editStatus, setEditStatus] = useState<string>("DRAFT");

  const [items, setItems] = useState([{ productId: "", pallets: "", quantity: 1, sellingPrice: 0, unit: "pcs" }]);
  const [customerId, setCustomerId] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("CASH");
  const [hasTax, setHasTax] = useState(false);
  const [filterThickness, setFilterThickness] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCustomer, setFilterCustomer] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const uniqueThicknesses = Array.from(new Set(
    initialOrders.flatMap((so: any) => so.items.map((i: any) => i.product?.thickness)).filter(Boolean)
  )).sort() as string[];
  const uniqueStatuses = Array.from(new Set(initialOrders.map((so: any) => so.status))).sort() as string[];

  const filteredOrders = initialOrders.filter((so: any) => {
    if (filterThickness !== "all") {
      const hasThickness = so.items.some((i: any) => i.product?.thickness === filterThickness);
      if (!hasThickness) return false;
    }
    if (filterStatus !== "all" && so.status !== filterStatus) return false;
    if (filterCustomer !== "all" && so.customerId !== filterCustomer) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!so.soNumber.toLowerCase().includes(q) && !so.customer.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleExport = () => {
    const csvContent = [
      ["SO Number", "Customer", "Terms", "Total Amount", "Status", "Date"],
      ...filteredOrders.map((so: any) => [
        `"${so.soNumber}"`, 
        `"${so.customer.name}"`, 
        `"${so.paymentTerms}"`, 
        `"${so.totalAmount}"`, 
        `"${so.status}"`, 
        `"${new Date(so.createdAt).toLocaleDateString()}"`
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_report_${filterThickness === 'all' ? 'all' : filterThickness}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addItem = () => setItems([...items, { productId: "", pallets: "", quantity: 1, sellingPrice: 0, unit: "pcs" }]);
  
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

  const subTotal = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.sellingPrice)), 0);
  const taxAmount = hasTax ? subTotal * 0.11 : 0;
  const grandTotal = subTotal + taxAmount;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    await createSalesOrder({
      soNumber: formData.get("soNumber") as string,
      customerId: customerId,
      currency: formData.get("currency") as string,
      paymentTerms: paymentTerms as any,
      subTotal,
      hasTax,
      taxAmount,
      totalAmount: grandTotal,
      items: items.map(i => ({
        productId: i.productId,
        pallets: i.pallets ? Number(i.pallets) : null,
        quantity: Number(i.quantity),
        sellingPrice: Number(i.sellingPrice),
        unit: "pcs",
        totalPrice: Number(i.quantity) * Number(i.sellingPrice)
      }))
    });
    
    setLoading(false);
    setOpen(false);
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <Badge variant="success">{status}</Badge>;
      case 'SHIPPED': return <Badge variant="info">{status.replace('_', ' ')}</Badge>;
      case 'DRAFT': return <Badge variant="outline">{status}</Badge>;
      case 'PENDING': return <Badge variant="warning">{status}</Badge>;
      case 'CONFIRMED': return <Badge variant="info">{status}</Badge>;
      case 'CANCELLED': return <Badge variant="error">{status}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  function startEdit(order: any) {
    setEditOrder(order);
    setEditStatus(order.status || "DRAFT");
    setEditOpen(true);
  }

  async function onEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editOrder) return;

    setEditLoading(true);
    const result = await updateSalesOrderStatus(editOrder.id, editStatus);
    setEditLoading(false);

    if (result.success) {
      setEditOpen(false);
      setEditOrder(null);
    } else {
      alert("Error: " + (result.error || "Gagal mengubah sales order"));
    }
  }

  async function onDelete(orderId: string) {
    if (!confirm("Delete sales order ini?")) return;
    setDeletingId(orderId);
    const result = await deleteSalesOrder(orderId);
    setDeletingId(null);

    if (!result.success) {
      alert("Error: " + (result.error || "Gagal menghapus sales order"));
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sales Orders</h2>
          <p className="text-muted-foreground mt-1 text-sm">Manage customer orders and revenue</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search SO or Customer..." 
              className="pl-8 w-[220px]" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterThickness} onValueChange={setFilterThickness}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="All Thickness" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Thickness</SelectItem>
              {uniqueThicknesses.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {uniqueStatuses.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCustomer} onValueChange={setFilterCustomer}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customers.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          {!readOnly && (
            <>
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
                      <div className="grid grid-cols-[3fr_1fr_1fr_2fr_2fr_auto] gap-2 mb-2 px-2">
                        <div className="text-xs font-semibold text-slate-500 uppercase">Nama Barang</div>
                        <div className="text-xs font-semibold text-slate-500 uppercase text-center">Pallet</div>
                        <div className="text-xs font-semibold text-slate-500 uppercase text-center">Pcs</div>
                        <div className="text-xs font-semibold text-slate-500 uppercase text-right">Harga Per Pcs</div>
                        <div className="text-xs font-semibold text-slate-500 uppercase text-right">Jumlah</div>
                        <div className="w-8"></div>
                      </div>
                      {items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[3fr_1fr_1fr_2fr_2fr_auto] gap-2 items-center bg-white p-2 border rounded-md">
                          <SearchableSelect 
                            options={products.map((p: any) => ({
                              value: p.id,
                              label: `${p.sku ? `[${p.sku}] ` : ''}${p.name} - ${p.type} ${p.grade} ${p.thickness} ${p.size}`
                            }))}
                            value={item.productId}
                            onChange={(v) => updateItem(idx, "productId", v)}
                            placeholder="Cari nama atau SKU barang..."
                          />
                          <Input type="number" placeholder="0" value={item.pallets} onChange={(e) => updateItem(idx, "pallets", e.target.value)} className="text-center" />
                          <Input type="number" placeholder="0" min="1" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} className="text-center" required />
                          <Input type="number" placeholder="0" min="0" value={item.sellingPrice} onChange={(e) => updateItem(idx, "sellingPrice", e.target.value)} className="text-right" required />
                          <div className="text-right px-3 text-sm font-medium text-slate-700 bg-slate-50 border rounded-md h-9 flex items-center justify-end">
                            {((Number(item.quantity) || 0) * (Number(item.sellingPrice) || 0)).toLocaleString("id-ID")}
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} disabled={items.length === 1} className="text-slate-400 hover:text-red-500">
                            <span className="sr-only">Remove</span>
                            &times;
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200 mt-4 space-y-2">
                      <div className="flex justify-end items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                          <input type="checkbox" checked={hasTax} onChange={(e) => setHasTax(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                          Include PPN (11%)
                        </label>
                      </div>
                      
                      <div className="flex justify-end">
                        <div className="w-64 space-y-2 text-right">
                          <div className="flex justify-between text-sm text-slate-500">
                            <span>Subtotal:</span>
                            <span>Rp {subTotal.toLocaleString("id-ID")}</span>
                          </div>
                          {hasTax && (
                            <div className="flex justify-between text-sm text-slate-500">
                              <span>PPN (11%):</span>
                              <span>Rp {taxAmount.toLocaleString("id-ID")}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold text-slate-900 border-t pt-2">
                            <span>Grand Total:</span>
                            <span>Rp {grandTotal.toLocaleString("id-ID")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={loading || !customerId} className="w-32">{loading ? "Saving..." : "Create SO"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
              <Dialog
                open={editOpen}
                onOpenChange={(v) => {
                  setEditOpen(v);
                  if (!v) setEditOrder(null);
                }}
              >
                <DialogContent className="sm:max-w-md w-full">
                  <DialogHeader>
                    <DialogTitle>Edit Sales Order Status</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={onEditSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={editStatus} onValueChange={(v) => setEditStatus(v || "DRAFT")}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">DRAFT</SelectItem>
                          <SelectItem value="CONFIRMED">CONFIRMED</SelectItem>
                          <SelectItem value="SHIPPED">SHIPPED</SelectItem>
                          <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                          <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={editLoading || !editOrder} className="w-full sm:w-32">
                        {editLoading ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </>
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
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No sales orders found.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((so: any, idx: number) => (
                <TableRow key={so.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]/60'}>
                  <TableCell className="font-medium text-slate-900 py-3.5 border-b border-slate-100">{so.soNumber}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{so.customer.name}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{so.paymentTerms}</TableCell>
                  <TableCell className="text-right font-medium text-slate-900 py-3.5 border-b border-slate-100">
                    Rp {so.totalAmount.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right py-3.5 border-b border-slate-100">{getStatusBadge(so.status)}</TableCell>
                  <TableCell className="text-right py-3.5 border-b border-slate-100">
                    <div className="flex justify-end items-center gap-2">
                      {!readOnly && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => startEdit(so)}
                            disabled={deletingId === so.id}
                          >
                            <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 border-red-200 hover:bg-red-50"
                            onClick={() => onDelete(so.id)}
                            disabled={deletingId === so.id}
                          >
                            <Trash2 className={`mr-1.5 h-3.5 w-3.5 ${deletingId === so.id ? "text-slate-400" : "text-red-600"}`} /> Delete
                          </Button>
                        </>
                      )}
                      <Link href={`/print/so/${so.id}`}>
                        <Button variant="outline" size="sm" className="h-8">
                          <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
                        </Button>
                      </Link>
                    </div>
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
