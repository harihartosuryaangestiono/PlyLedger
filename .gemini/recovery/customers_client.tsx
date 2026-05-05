"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createCustomer, deleteCustomer } from "./actions";
import { Trash2, Plus } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export function CustomerClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
        <div className="flex items-center gap-4">
          <Input placeholder="Search customers..." className="max-w-xs" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" /> Add Customer</Button>} />
            <DialogContent className="sm:max-w-md w-full">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" placeholder="e.g., Global Timber Inc." required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input id="contactPerson" name="contactPerson" placeholder="e.g., John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="john@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" placeholder="+1 234 567 890" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" name="address" placeholder="123 Business Blvd" />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={loading} className="w-full">{loading ? "Saving..." : "Save Customer"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
            {initialCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  No customers found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              initialCustomers.map((customer, idx) => (
                <TableRow key={customer.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]/60'}>
                  <TableCell className="font-medium text-slate-900 py-3.5 border-b border-slate-100">{customer.name}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{customer.contactPerson || "-"}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{customer.email || "-"}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{customer.phone || "-"}</TableCell>
                  <TableCell className="text-right py-3.5 border-b border-slate-100">
                    <Button variant="ghost" size="icon" onClick={() => deleteCustomer(customer.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
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
