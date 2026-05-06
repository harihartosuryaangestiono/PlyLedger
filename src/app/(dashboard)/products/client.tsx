"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProduct, deleteProduct } from "./actions";
import { Trash2, Plus, Download } from "lucide-react";

type Product = {
  id: string;
  name: string;
  type: string;
  thickness: string;
  grade: string;
  size: string;
};

export function ProductClient({ initialProducts , readOnly }: { initialProducts: Product[] , readOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("MR");
  const [grade, setGrade] = useState("A");
  const [filterThickness, setFilterThickness] = useState("all");

  const uniqueThicknesses = Array.from(new Set(initialProducts.map((p) => p.thickness))).sort();

  const filteredProducts = initialProducts.filter((p) => {
    if (filterThickness !== "all" && p.thickness !== filterThickness) return false;
    return true;
  });

  const handleExport = () => {
    const csvContent = [
      ["Name", "Type", "Grade", "Thickness", "Size"],
      ...filteredProducts.map(p => [`"${p.name}"`, `"${p.type}"`, `"${p.grade}"`, `"${p.thickness}"`, `"${p.size}"`])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `products_report_${filterThickness === 'all' ? 'all' : filterThickness}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    await createProduct({
      name: formData.get("name") as string,
      type: type,
      thickness: formData.get("thickness") as string,
      grade: grade,
      size: formData.get("size") as string,
    });
    setLoading(false);
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Products Catalog</h2>
          <p className="text-muted-foreground mt-1 text-sm">Manage plywood specifications and inventory items</p>
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
              <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" /> Add Product</Button>} />
              <DialogContent className="sm:max-w-xl w-full">
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Product Name</Label>
                      <Input id="name" name="name" placeholder="e.g., Meranti Plywood" required />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={type} onValueChange={(v) => setType(v || "")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MR">MR (Moisture Resistant)</SelectItem>
                            <SelectItem value="WBP">WBP (Weather/Boil Proof)</SelectItem>
                            <SelectItem value="Film Faced">Film Faced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Grade</Label>
                        <Select value={grade} onValueChange={(v) => setGrade(v || "")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="BB/CC">BB/CC</SelectItem>
                            <SelectItem value="Uty">Utility</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="thickness">Thickness</Label>
                        <Input id="thickness" name="thickness" placeholder="e.g., 18mm" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="size">Size</Label>
                        <Input id="size" name="size" placeholder="e.g., 1220x2440" required />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={loading} className="w-full">{loading ? "Saving..." : "Save Product"}</Button>
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
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Type</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Grade</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Thickness</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Size</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product, idx) => (
                <TableRow key={product.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]/60'}>
                  <TableCell className="font-medium text-slate-900 py-3.5 border-b border-slate-100">{product.name}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{product.type}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{product.grade}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{product.thickness}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{product.size}</TableCell>
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
