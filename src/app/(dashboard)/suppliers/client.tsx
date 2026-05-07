"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createSupplier, deleteSupplier, updateSupplier } from "./actions";
import { Edit2, Trash2, Plus, Search, Download } from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export function SupplierClient({ initialSuppliers , readOnly }: { initialSuppliers: Supplier[] , readOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editContactPerson, setEditContactPerson] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editAddress, setEditAddress] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");

  const filteredSuppliers = initialSuppliers.filter((s: Supplier) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!s.name.toLowerCase().includes(q) && 
          !(s.contactPerson || "").toLowerCase().includes(q) &&
          !(s.email || "").toLowerCase().includes(q) &&
          !(s.phone || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleExport = () => {
    const csvContent = [
      ["Name", "Contact Person", "Email", "Phone", "Address"],
      ...filteredSuppliers.map(s => [
        `"${s.name}"`, 
        `"${s.contactPerson || ''}"`, 
        `"${s.email || ''}"`, 
        `"${s.phone || ''}"`, 
        `"${s.address || ''}"`
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `suppliers_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    await createSupplier({
      name: formData.get("name") as string,
      contactPerson: formData.get("contactPerson") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
    });
    setLoading(false);
    setOpen(false);
  }

  function startEdit(supplier: Supplier) {
    setEditSupplier(supplier);
    setEditName(supplier.name);
    setEditContactPerson(supplier.contactPerson ?? "");
    setEditEmail(supplier.email ?? "");
    setEditPhone(supplier.phone ?? "");
    setEditAddress(supplier.address ?? "");
    setEditOpen(true);
  }

  async function onEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editSupplier) return;

    setEditLoading(true);
    const result = await updateSupplier(editSupplier.id, {
      name: editName,
      contactPerson: editContactPerson.trim() ? editContactPerson.trim() : null,
      email: editEmail.trim() ? editEmail.trim() : null,
      phone: editPhone.trim() ? editPhone.trim() : null,
      address: editAddress.trim() ? editAddress.trim() : null,
    });
    setEditLoading(false);

    if (result.success) {
      setEditOpen(false);
      setEditSupplier(null);
    } else {
      alert("Error: " + (result.error || "Gagal mengubah supplier"));
    }
  }

  async function onDelete(supplierId: string) {
    if (!confirm("Delete supplier ini?")) return;
    setDeletingId(supplierId);
    const result = await deleteSupplier(supplierId);
    setDeletingId(null);

    if (!result.success) {
      alert("Error: " + (result.error || "Gagal menghapus supplier"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Suppliers Directory</h2>
          <p className="text-muted-foreground mt-1 text-sm">Manage vendors and manufacturer information</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search suppliers..." 
              className="pl-8 w-[240px]" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          {!readOnly && (
            <>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" /> Add Supplier</Button>} />
                <DialogContent className="sm:max-w-md w-full">
                  <DialogHeader>
                    <DialogTitle>Add New Supplier</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={onSubmit} className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Supplier Name</Label>
                        <Input id="name" name="name" placeholder="e.g., PT Sumber Kayu" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactPerson">Contact Person</Label>
                        <Input id="contactPerson" name="contactPerson" placeholder="e.g., Budi Santoso" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" name="email" type="email" placeholder="budi@example.com" />
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
                      <Button type="submit" disabled={loading} className="w-full">{loading ? "Saving..." : "Save Supplier"}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog
                open={editOpen}
                onOpenChange={(v) => {
                  setEditOpen(v);
                  if (!v) setEditSupplier(null);
                }}
              >
                <DialogContent className="sm:max-w-md w-full">
                  <DialogHeader>
                    <DialogTitle>Edit Supplier</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={onEditSubmit} className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="editName">Supplier Name</Label>
                        <Input id="editName" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editContactPerson">Contact Person</Label>
                        <Input
                          id="editContactPerson"
                          value={editContactPerson}
                          onChange={(e) => setEditContactPerson(e.target.value)}
                          placeholder="e.g., Budi Santoso"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="editEmail">Email</Label>
                          <Input
                            id="editEmail"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            type="email"
                            placeholder="budi@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editPhone">Phone</Label>
                          <Input
                            id="editPhone"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="+62..."
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editAddress">Address</Label>
                        <Input
                          id="editAddress"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          placeholder="Full address"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={editLoading || !editSupplier} className="w-full">
                        {editLoading ? "Saving..." : "Save Changes"}
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
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Name</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Contact Person</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Email</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Phone</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  No suppliers found.
                </TableCell>
              </TableRow>
            ) : (
              filteredSuppliers.map((supplier, idx) => (
                <TableRow key={supplier.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]/60'}>
                  <TableCell className="font-medium text-slate-900 py-3.5 border-b border-slate-100">{supplier.name}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{supplier.contactPerson || "-"}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{supplier.email || "-"}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{supplier.phone || "-"}</TableCell>
                  <TableCell className="text-right py-3.5 border-b border-slate-100">
                    {!readOnly && (
                      <div className="flex justify-end items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => startEdit(supplier)}
                        >
                          <Edit2 className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onDelete(supplier.id)}
                          disabled={deletingId === supplier.id}
                        >
                          <Trash2 className={`h-4 w-4 ${deletingId === supplier.id ? "text-slate-400" : "text-red-600"}`} />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    )}
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
