"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { createShipment } from "./actions";
import { Plus, Search, Printer } from "lucide-react";
import Link from "next/link";

export function ShipmentClient({ initialShipments }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    await createShipment({
      containerNumber: formData.get("containerNumber") as string,
      billOfLading: formData.get("billOfLading") as string,
      originPort: formData.get("originPort") as string,
      destinationPort: formData.get("destinationPort") as string,
      etd: formData.get("etd") as string,
      eta: formData.get("eta") as string,
    });
    
    setLoading(false);
    setOpen(false);
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED': return <Badge variant="success">{status}</Badge>;
      case 'IN_TRANSIT': return <Badge variant="info">{status.replace('_', ' ')}</Badge>;
      case 'PENDING': return <Badge variant="warning">{status}</Badge>;
      case 'CANCELLED': return <Badge variant="error">{status}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Shipments Tracking</h2>
          <p className="text-muted-foreground mt-1 text-sm">Monitor logistics and container movements</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search Shipments..." className="pl-8 max-w-xs" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" /> Add Shipment</Button>} />
            <DialogContent className="sm:max-w-2xl w-full">
              <DialogHeader>
                <DialogTitle>Track New Shipment</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="containerNumber">Container Number</Label>
                      <Input id="containerNumber" name="containerNumber" placeholder="e.g., MSKU1234567" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billOfLading">Bill of Lading (BL)</Label>
                      <Input id="billOfLading" name="billOfLading" placeholder="e.g., BL987654321" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="originPort">Origin Port</Label>
                      <Input id="originPort" name="originPort" placeholder="e.g., Shanghai" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destinationPort">Destination Port</Label>
                      <Input id="destinationPort" name="destinationPort" placeholder="e.g., Los Angeles" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="etd">ETD</Label>
                      <Input id="etd" name="etd" type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eta">ETA</Label>
                      <Input id="eta" name="eta" type="date" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={loading} className="w-full">{loading ? "Saving..." : "Save Shipment"}</Button>
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
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Container / BL</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Route</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">ETD</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">ETA</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Status</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialShipments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No shipments found.
                </TableCell>
              </TableRow>
            ) : (
              initialShipments.map((shipment: any, idx: number) => (
                <TableRow key={shipment.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]/60'}>
                  <TableCell className="py-3.5 border-b border-slate-100">
                    <div className="font-medium text-slate-900">{shipment.containerNumber || "TBA"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">BL: {shipment.billOfLading}</div>
                  </TableCell>
                  <TableCell className="py-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">{shipment.originPort}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-medium text-slate-700">{shipment.destinationPort}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{shipment.etd ? new Date(shipment.etd).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}</TableCell>
                  <TableCell className="text-slate-600 py-3.5 border-b border-slate-100">{shipment.eta ? new Date(shipment.eta).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}</TableCell>
                  <TableCell className="text-right py-3.5 border-b border-slate-100">{getStatusBadge(shipment.status)}</TableCell>
                  <TableCell className="text-right py-3.5 border-b border-slate-100">
                    <Link href={`/print/shipment/${shipment.id}`}>
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
