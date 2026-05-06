"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createCustomer, deleteCustomer } from "./actions";
import { Trash2, Plus, Search, Download } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export function CustomerClient({ initialCustomers , readOnly }: { initialCustomers: Customer[] , readOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = initialCustomers.filter((c: Customer) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && 
          !(c.contactPerson || "").toLowerCase().includes(q) &&
          !(c.email || "").toLowerCase().includes(q) &&
          !(c.phone || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleExport = () => {
    const csvContent = [
      ["Name", "Contact Person", "Email", "Phone", "Address"],
      ...filteredCustomers.map(c => [
        `"${c.name}"`, 
        `"${c.contactPerson || ''}"`, 
        `"${c.email || ''}"`, 
        `"${c.phone || ''}"`, 
        `"${c.address || ''}"`
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `customers_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    await createCustomer({
      name: formData.get("name") as string,
      contactPerson: formData.get("contactPerson") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
    });
    setLoading(false);
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Customers Directory</h2>
          <p className="text-muted-foreground mt-1 text-sm">Manage buyers and client information</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search customers..." 
              className="pl-8 w-[240px]" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          {!readOnly && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" /> Add Customer</Button>} />
              <DialogContent className="sm:max-w-md w-full">
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Customer Name</Label>
                      <Input id="name" name="name" placeholder="e.g., PT Maju Jaya" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPerson">Contact Person</Label>
                      <Input id="contactPerson" name="contactPerson" placeholder="e.g., Andi" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" placeholder="andi@example.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" name="phone" placeholder="+62..." />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input id="address" name="address" placeholder="Full address" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={loading} className="w-full">{loading ? "Saving..." : "Save Customer"}</Button>
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
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Name</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Contact Person</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Email</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Phone</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer, idx) => (
                <TableRow key={customer.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]/60'}>
                  <TableCell className="font-medium text-slate-900 py-3.5 border-b border-slate-100">{customer.name}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{customer.contactPerson || "-"}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{customer.email || "-"}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{customer.phone || "-"}</TableCell>
                  <TableCell className="text-right py-3.5 border-b border-slate-100">
                    {/* readOnly handling */}
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
