"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProduct, deleteProduct } from "./actions";
import { Trash2, Plus, Download, Search } from "lucide-react";

type Product = {
  id: string;
  sku?: string | null;
  name: string;
  type: string; // Used for Glue
  thickness: string;
  grade: string;
  size: string;
};

export function ProductClient({ initialProducts , readOnly }: { initialProducts: Product[] , readOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("MR"); // Glue
  const [grade, setGrade] = useState("OVL");
  const [filterThickness, setFilterThickness] = useState("all");
  const [filterGlue, setFilterGlue] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const uniqueThicknesses = Array.from(new Set(initialProducts.map((p) => p.thickness))).sort();
  const uniqueGlues = Array.from(new Set(initialProducts.map((p) => p.type))).sort();
  const uniqueGrades = Array.from(new Set(initialProducts.map((p) => p.grade))).sort();

  const filteredProducts = initialProducts.filter((p) => {
    if (filterThickness !== "all" && p.thickness !== filterThickness) return false;
    if (filterGlue !== "all" && p.type !== filterGlue) return false;
    if (filterGrade !== "all" && p.grade !== filterGrade) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !(p.sku || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleExport = () => {
    const csvContent = [
      ["SKU", "Name", "Glue", "Grade", "Thickness", "Size"],
      ...filteredProducts.map(p => [`"${p.sku || ''}"`, `"${p.name}"`, `"${p.type}"`, `"${p.grade}"`, `"${p.thickness}"`, `"${p.size}"`])
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
      sku: formData.get("sku") as string,
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
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search SKU or Name..." 
              className="pl-8 w-[200px]" 
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
          <Select value={filterGlue} onValueChange={setFilterGlue}>
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="All Glue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Glue</SelectItem>
              {uniqueGlues.map(g => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="All Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grade</SelectItem>
              {uniqueGrades.map(g => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU (Optional)</Label>
                        <Input id="sku" name="sku" placeholder="e.g., PLY-MR-18" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">Product Name</Label>
                        <Input id="name" name="name" placeholder="e.g., Meranti Plywood" required />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Glue</Label>
                        <Select value={type} onValueChange={(v) => setType(v || "")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select glue" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MR">MR</SelectItem>
                            <SelectItem value="E2">E2</SelectItem>
                            <SelectItem value="E1">E1</SelectItem>
                            <SelectItem value="E0">E0</SelectItem>
                            <SelectItem value="CARB">CARB</SelectItem>
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
                            <SelectItem value="OVL">OVL</SelectItem>
                            <SelectItem value="BBCC">BBCC</SelectItem>
                            <SelectItem value="UTY Ekspor">UTY Ekspor</SelectItem>
                            <SelectItem value="Uty Lokal">Uty Lokal</SelectItem>
                            <SelectItem value="PG">PG</SelectItem>
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
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">SKU</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Name</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Glue</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Grade</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Thickness</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Size</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product, idx) => (
                <TableRow key={product.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]/60'}>
                  <TableCell className="font-medium text-slate-500 py-3.5 border-b border-slate-100">{product.sku || '-'}</TableCell>
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
