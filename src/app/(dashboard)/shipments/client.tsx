"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeCheck,
  Box,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Copy,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Filter,
  PackageSearch,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Search,
  ShipWheel,
  Trash2,
  Truck,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createShipment,
  deleteShipment,
  deleteShipmentPodFile,
  type ShipmentPodFile,
  updateShipment,
  uploadShipmentPod,
} from "./actions";

type Shipment = {
  id: string;
  doNumber?: string | null;
  deliveryDate?: string | Date | null;
  customerId?: string | null;
  customer?: { name: string } | null;
  destinationAddress?: string | null;
  customerPic?: string | null;
  phoneNumber?: string | null;
  warehouseOrigin?: string | null;
  driverName?: string | null;
  vehiclePlate?: string | null;
  expeditionCompany?: string | null;
  sealNumber?: string | null;
  notes?: string | null;

  containerNumber: string | null;
  billOfLading: string;
  originPort: string;
  destinationPort: string;
  etd: string | Date | null;
  eta: string | Date | null;
  status: string;

  items?: { productId: string; product: { name: string; thickness: string; size: string; grade: string }; quantity: number; unit: string; notes: string | null }[];
};

type ShipmentFormOptions = {
  customers: {
    id: string;
    name: string;
    contactPerson: string | null;
    phone: string | null;
    address: string | null;
  }[];
  products: {
    id: string;
    name: string;
    sku: string | null;
    thickness: string;
    size: string;
    grade: string;
    type: string;
  }[];
  suppliers: { id: string; name: string }[];
  originPorts: string[];
  destinationPorts: string[];
};

type TabKey = "deliveryOrders" | "shipments" | "containers" | "pod" | "schedule" | "reports";

const tabs: { key: TabKey; label: string }[] = [
  { key: "deliveryOrders", label: "Delivery Orders" },
  { key: "shipments", label: "Shipments" },
  { key: "containers", label: "Containers" },
  { key: "pod", label: "POD" },
  { key: "schedule", label: "Schedule" },
  { key: "reports", label: "Reports" },
];

const shipmentSteps = ["Packing", "Loading", "Transit", "Arrived", "Delivered"];

const BRAND = {
  navy: "#0F172A",
  navySoft: "#1E293B",
  slateBorder: "#E2E8F0",
  slateBg: "#F8FAFC",
};

function toDateInput(val: string | Date | null) {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toISOString().slice(0, 10);
}

function formatDate(val: string | Date | null) {
  if (!val) return "-";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

function statusVariant(status: string) {
  if (status.includes("DELIVERED") || status === "Delivered") return "success";
  if (status.includes("TRANSIT") || status.includes("Arrived") || status === "On Delivery") return "info";
  if (status.includes("PENDING") || status === "Loading" || status === "Draft") return "warning";
  if (status === "Cancelled" || status === "Returned" || status.includes("DELAY")) return "error";
  return "outline";
}

export function ShipmentClient({
  initialShipments,
  formOptions,
  initialPodFiles,
  readOnly,
}: {
  initialShipments: Shipment[];
  formOptions: ShipmentFormOptions;
  initialPodFiles: Record<string, ShipmentPodFile[]>;
  readOnly: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("deliveryOrders");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [openCreateDo, setOpenCreateDo] = useState(false);
  const [openTimeline, setOpenTimeline] = useState(false);
  const [openDoView, setOpenDoView] = useState(false);
  const [openDoEdit, setOpenDoEdit] = useState(false);
  const [openQrTracking, setOpenQrTracking] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Shipment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingShipment, setSavingShipment] = useState(false);
  const [savingDoEdit, setSavingDoEdit] = useState(false);
  const [uploadingPod, setUploadingPod] = useState(false);
  const [scheduleMonth, setScheduleMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [allowManualCustomerContact, setAllowManualCustomerContact] = useState(false);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const [podUploads, setPodUploads] = useState<Record<string, ShipmentPodFile[]>>(initialPodFiles || {});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [doEditForm, setDoEditForm] = useState({
    doNumber: "",
    deliveryDate: "",
    customerId: "",
    destinationAddress: "",
    customerPic: "",
    phoneNumber: "",
    warehouseOrigin: "",
    driverName: "",
    vehiclePlate: "",
    expeditionCompany: "",
    sealNumber: "",
    notes: "",

    containerNumber: "",
    billOfLading: "",
    originPort: "",
    destinationPort: "",
    etd: "",
    eta: "",
    status: "PENDING",
  });

  const [doItems, setDoItems] = useState([
    { productId: "", product: "", thickness: "", size: "", grade: "", quantity: 0, unit: "Sheets", notes: "" },
  ]);

  const [doForm, setDoForm] = useState({
    doNumber: `DO-${new Date().getFullYear()}-${String(initialShipments.length + 101).padStart(4, "0")}`,
    deliveryDate: toDateInput(new Date()),
    customer: "",
    destinationAddress: "",
    customerPic: "",
    phoneNumber: "",
    warehouseOrigin: "",
    driverName: "",
    vehiclePlate: "",
    expeditionCompany: "",
    containerNumber: "",
    sealNumber: "",
    etd: toDateInput(new Date()),
    eta: toDateInput(new Date(Date.now() + 1000 * 60 * 60 * 24 * 2)),
    notes: "",
  });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setIsLoadingTab(true);
    const timer = setTimeout(() => setIsLoadingTab(false), 260);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const customerOptions = useMemo(
    () =>
      formOptions.customers.map((c) => ({
        value: c.id,
        label: c.name,
      })),
    [formOptions.customers]
  );
  const productOptions = useMemo(
    () =>
      formOptions.products.map((p) => ({
        value: p.id,
        label: `${p.name}${p.sku ? ` (${p.sku})` : ""}`,
      })),
    [formOptions.products]
  );

  const uniqueStatuses = useMemo(
    () => Array.from(new Set(initialShipments.map((s) => s.status))).sort(),
    [initialShipments]
  );

  const filteredShipments = useMemo(() => {
    return initialShipments.filter((s) => {
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.containerNumber?.toLowerCase().includes(q) ||
        s.billOfLading.toLowerCase().includes(q) ||
        s.originPort.toLowerCase().includes(q) ||
        s.destinationPort.toLowerCase().includes(q)
      );
    });
  }, [initialShipments, filterStatus, searchQuery]);

  const deliveryOrders = useMemo(() => {
    return filteredShipments.map((s, idx) => {
      const normalized = s.status.toUpperCase();
      const doStatus =
        normalized.includes("DELIVERED")
          ? "Delivered"
          : normalized.includes("TRANSIT")
            ? "On Delivery"
            : normalized.includes("ARRIVED")
              ? "Loading"
              : normalized.includes("CANCEL")
                ? "Cancelled"
                : normalized.includes("RETURN")
                  ? "Returned"
                  : "Draft";
      return {
        id: s.id,
        doNumber: s.doNumber || `DO-${new Date().getFullYear()}-${String(idx + 1).padStart(4, "0")}`,
        customer: s.customer?.name || s.customerPic || "-",
        destination: s.destinationAddress || s.destinationPort || "-",
        driver: s.driverName || "-",
        vehiclePlate: s.vehiclePlate || "-",
        totalItems: s.items?.length || "-",
        deliveryDate: s.deliveryDate || s.eta,
        status: doStatus,
      };
    });
  }, [filteredShipments]);

  const containers = useMemo(() => {
    return filteredShipments.map((s) => ({
      id: s.id,
      containerNumber: s.containerNumber || "-",
      blNumber: s.billOfLading,
      vesselName: "-",
      originPort: s.originPort,
      destinationPort: s.destinationPort,
      etd: s.etd,
      eta: s.eta,
      sealNumber: "-",
      status: s.status.replaceAll("_", " "),
    }));
  }, [filteredShipments]);

  const perPage = 8;
  const paginatedDeliveryOrders = deliveryOrders.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(deliveryOrders.length / perPage));

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const analytics = {
    active: filteredShipments.filter((s) => !String(s.status).includes("DELIVERED")).length,
    deliveredToday: filteredShipments.filter(
      (s) =>
        String(s.status).toUpperCase().includes("DELIVERED") &&
        s.eta &&
        new Date(s.eta) >= startToday &&
        new Date(s.eta) < endToday
    ).length,
    delayed: filteredShipments.filter(
      (s) => s.eta && new Date(s.eta) < startToday && !String(s.status).toUpperCase().includes("DELIVERED")
    ).length,
    pendingPod: filteredShipments.filter((s) => String(s.status).toUpperCase().includes("DELIVERED")).length,
    inTransit: filteredShipments.filter((s) => String(s.status).toUpperCase().includes("TRANSIT")).length,
  };

  const monthlyDeliveries = useMemo(() => {
    const result: { month: string; deliveries: number; delayed: number; volume: number }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = monthDate.toLocaleDateString("en-US", { month: "short" });
      const month = monthDate.getMonth();
      const year = monthDate.getFullYear();
      const monthShipments = filteredShipments.filter((s) => {
        if (!s.eta) return false;
        const eta = new Date(s.eta);
        return eta.getMonth() === month && eta.getFullYear() === year;
      });
      const delayed = monthShipments.filter(
        (s) => s.eta && new Date(s.eta) < now && !String(s.status).toUpperCase().includes("DELIVERED")
      ).length;
      result.push({
        month: monthLabel,
        deliveries: monthShipments.length,
        delayed,
        volume: monthShipments.length,
      });
    }
    return result;
  }, [filteredShipments, now]);

  const scheduleEvents = useMemo(() => {
    return filteredShipments.flatMap((s) => {
      const events: { shipmentId: string; type: "ETD" | "ETA"; date: Date; label: string }[] = [];
      if (s.etd) events.push({ shipmentId: s.id, type: "ETD", date: new Date(s.etd), label: `${s.containerNumber || s.billOfLading} - ETD` });
      if (s.eta) events.push({ shipmentId: s.id, type: "ETA", date: new Date(s.eta), label: `${s.containerNumber || s.billOfLading} - ETA` });
      return events;
    });
  }, [filteredShipments]);

  const monthDays = useMemo(() => {
    const year = scheduleMonth.getFullYear();
    const month = scheduleMonth.getMonth();
    const first = new Date(year, month, 1);
    const firstWeekday = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - firstWeekday);
    return Array.from({ length: 42 }).map((_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      return d;
    });
  }, [scheduleMonth]);

  const weekRange = useMemo(() => {
    const todayWeekday = (now.getDay() + 6) % 7;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - todayWeekday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }, [now]);

  const weekEvents = useMemo(() => {
    return scheduleEvents
      .filter((e) => e.date >= weekRange.start && e.date <= new Date(weekRange.end.getFullYear(), weekRange.end.getMonth(), weekRange.end.getDate() + 1))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [scheduleEvents, weekRange]);

  function exportCsv() {
    const rows = [
      ["Container", "BL", "Origin", "Destination", "ETD", "ETA", "Status"],
      ...filteredShipments.map((s) => [
        `"${s.containerNumber || ""}"`,
        `"${s.billOfLading}"`,
        `"${s.originPort}"`,
        `"${s.destinationPort}"`,
        `"${formatDate(s.etd)}"`,
        `"${formatDate(s.eta)}"`,
        `"${s.status}"`,
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shipments_export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setToast("CSV exported successfully.");
  }

  async function createDeliveryOrder() {
    const hasValidProduct = doItems.some((item) => item.productId && Number(item.quantity) > 0);
    if (!hasValidProduct) {
      setToast("Minimal pilih 1 product valid dengan quantity > 0.");
      return;
    }
    setSavingShipment(true);
    const result = await createShipment({
      doNumber: doForm.doNumber,
      deliveryDate: doForm.deliveryDate,
      customerId: selectedCustomerId || undefined,
      destinationAddress: doForm.destinationAddress,
      customerPic: doForm.customerPic,
      phoneNumber: doForm.phoneNumber,
      warehouseOrigin: doForm.warehouseOrigin,
      driverName: doForm.driverName,
      vehiclePlate: doForm.vehiclePlate,
      expeditionCompany: doForm.expeditionCompany,
      sealNumber: doForm.sealNumber,
      notes: doForm.notes,

      containerNumber: doForm.containerNumber,
      billOfLading: doForm.containerNumber ? `${doForm.containerNumber}-BL` : `${doForm.doNumber}-BL`,
      originPort: doForm.warehouseOrigin,
      destinationPort: doForm.destinationAddress,
      etd: doForm.etd,
      eta: doForm.eta,

      items: doItems.filter(item => item.productId && Number(item.quantity) > 0).map(item => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unit: item.unit,
        notes: item.notes
      }))
    });
    setSavingShipment(false);
    if (result.success) {
      setOpenCreateDo(false);
      setToast("Delivery order created.");
    } else {
      setToast("Failed to create delivery order.");
    }
  }

  function onSelectCustomer(customerId: string) {
    const customer = formOptions.customers.find((c) => c.id === customerId);
    if (!customer) return;
    setSelectedCustomerId(customerId);
    setAllowManualCustomerContact(false);
    setDoForm((prev) => ({
      ...prev,
      customer: customer.name,
      customerPic: customer.contactPerson || "",
      phoneNumber: customer.phone || "",
      destinationAddress: customer.address || prev.destinationAddress,
    }));
  }

  function onSelectProduct(rowIndex: number, productId: string) {
    const product = formOptions.products.find((p) => p.id === productId);
    if (!product) return;
    setDoItems((rows) =>
      rows.map((row, idx) =>
        idx === rowIndex
          ? {
              ...row,
              productId,
              product: product.name,
              thickness: product.thickness,
              size: product.size,
              grade: product.grade,
            }
          : row
      )
    );
  }

  async function updateShipmentStatus(shipment: Shipment, status: string) {
    const result = await updateShipment(shipment.id, {
      containerNumber: shipment.containerNumber,
      billOfLading: shipment.billOfLading,
      originPort: shipment.originPort,
      destinationPort: shipment.destinationPort,
      etd: shipment.etd ? toDateInput(shipment.etd) : null,
      eta: shipment.eta ? toDateInput(shipment.eta) : null,
      status,
    });
    setToast(result.success ? "Shipment updated." : "Failed to update shipment.");
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    const result = await deleteShipment(pendingDelete.id);
    setDeletingId(null);
    setPendingDelete(null);
    setToast(result.success ? "Shipment removed." : "Failed to remove shipment.");
  }

  function getShipmentById(id: string) {
    return filteredShipments.find((s) => s.id === id) || null;
  }

  function openViewDo(id: string) {
    const shipment = getShipmentById(id);
    if (!shipment) {
      setToast("Shipment not found.");
      return;
    }
    setSelectedShipment(shipment);
    setOpenDoView(true);
  }

  function openEditDo(id: string) {
    const shipment = getShipmentById(id);
    if (!shipment) {
      setToast("Shipment not found.");
      return;
    }
    setSelectedShipment(shipment);
    setDoEditForm({
      doNumber: shipment.doNumber || "",
      deliveryDate: toDateInput(shipment.deliveryDate),
      customerId: shipment.customerId || "",
      destinationAddress: shipment.destinationAddress || "",
      customerPic: shipment.customerPic || "",
      phoneNumber: shipment.phoneNumber || "",
      warehouseOrigin: shipment.warehouseOrigin || "",
      driverName: shipment.driverName || "",
      vehiclePlate: shipment.vehiclePlate || "",
      expeditionCompany: shipment.expeditionCompany || "",
      sealNumber: shipment.sealNumber || "",
      notes: shipment.notes || "",

      containerNumber: shipment.containerNumber || "",
      billOfLading: shipment.billOfLading || "",
      originPort: shipment.originPort || "",
      destinationPort: shipment.destinationPort || "",
      etd: toDateInput(shipment.etd),
      eta: toDateInput(shipment.eta),
      status: shipment.status || "PENDING",
    });

    if (shipment.items && shipment.items.length > 0) {
      setDoItems(shipment.items.map(item => ({
        productId: item.productId,
        product: item.product.name,
        thickness: item.product.thickness,
        size: item.product.size,
        grade: item.product.grade,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes || ""
      })));
    } else {
      setDoItems([{ productId: "", product: "", thickness: "", size: "", grade: "", quantity: 0, unit: "Sheets", notes: "" }]);
    }
    
    setSelectedCustomerId(shipment.customerId || "");
    setOpenDoEdit(true);
  }

  async function saveDoEdit() {
    if (!selectedShipment) return;
    setSavingDoEdit(true);
    const result = await updateShipment(selectedShipment.id, {
      doNumber: doEditForm.doNumber || null,
      deliveryDate: doEditForm.deliveryDate || null,
      customerId: selectedCustomerId || null,
      destinationAddress: doEditForm.destinationAddress || null,
      customerPic: doEditForm.customerPic || null,
      phoneNumber: doEditForm.phoneNumber || null,
      warehouseOrigin: doEditForm.warehouseOrigin || null,
      driverName: doEditForm.driverName || null,
      vehiclePlate: doEditForm.vehiclePlate || null,
      expeditionCompany: doEditForm.expeditionCompany || null,
      sealNumber: doEditForm.sealNumber || null,
      notes: doEditForm.notes || null,

      containerNumber: doEditForm.containerNumber || null,
      billOfLading: doEditForm.billOfLading || null,
      originPort: doEditForm.originPort || null,
      destinationPort: doEditForm.destinationPort || null,
      etd: doEditForm.etd || null,
      eta: doEditForm.eta || null,
      status: doEditForm.status,

      items: doItems.filter(item => item.productId && Number(item.quantity) > 0).map(item => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unit: item.unit,
        notes: item.notes
      }))
    });
    setSavingDoEdit(false);
    if (result.success) {
      setOpenDoEdit(false);
      setToast("Delivery order updated.");
    } else {
      setToast("Failed to update delivery order.");
    }
  }

  function printDo(id: string) {
    window.open(`/print/shipment/${id}`, "_blank");
  }

  function getTrackingUrl(shipment: Shipment | null) {
    if (!shipment) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/print/shipment/${shipment.id}`;
  }

  function openQrForShipment(shipmentId?: string) {
    const target = shipmentId ? getShipmentById(shipmentId) : filteredShipments[0] || null;
    if (!target) {
      setToast("No shipment available for QR.");
      return;
    }
    setSelectedShipment(target);
    setOpenQrTracking(true);
  }

  async function copyTrackingLink() {
    const url = getTrackingUrl(selectedShipment);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setToast("Tracking link copied.");
  }

  function triggerPodUpload(id: string) {
    setUploadTargetId(id);
    fileInputRef.current?.click();
  }

  async function onPodFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!uploadTargetId || !e.target.files || e.target.files.length === 0) return;
    const selected = Array.from(e.target.files);
    const formData = new FormData();
    formData.append("shipmentId", uploadTargetId);
    selected.forEach((file) => formData.append("files", file));

    setUploadingPod(true);
    const result = await uploadShipmentPod(formData);
    setUploadingPod(false);

    if (result.success && result.files) {
      setPodUploads(result.files);
      setToast(`${selected.length} file uploaded.`);
    } else {
      setToast(result.error || "Upload failed.");
    }
    setUploadTargetId(null);
    e.target.value = "";
  }

  async function onDeletePodFile(shipmentId: string, fileName: string) {
    const result = await deleteShipmentPodFile(shipmentId, fileName);
    if (result.success && result.files) {
      setPodUploads(result.files);
      setToast("File deleted.");
    } else {
      setToast(result.error || "Failed to delete file.");
    }
  }

  return (
    <div className="relative space-y-6 pb-10">
      <input ref={fileInputRef} type="file" className="hidden" multiple onChange={onPodFilesSelected} />
      {toast && (
        <div className="fixed right-6 top-4 z-50 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 shadow-lg">
          {toast}
        </div>
      )}

      <div className="rounded-2xl border p-5 shadow-sm" style={{ borderColor: BRAND.slateBorder, background: `linear-gradient(135deg, #ffffff 0%, ${BRAND.slateBg} 100%)` }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Logistics Management</h2>
            <p className="mt-1 text-sm text-slate-500">Monitor deliveries, containers, and shipment operations.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 pl-8"
                placeholder="Search shipment..."
              />
            </div>
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value || "all")}>
              <SelectTrigger className="w-44">
                <Filter className="mr-2 h-4 w-4 text-slate-500" />
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {uniqueStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            {!readOnly && (
              <Dialog open={openCreateDo} onOpenChange={setOpenCreateDo}>
                <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" />Create Delivery Order</Button>} />
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
                  <DialogHeader>
                    <DialogTitle>Create Delivery Order (Surat Jalan)</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="mb-3 text-sm font-semibold text-slate-700">Section A - Delivery Information</h4>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label>DO Number</Label>
                          <Input value={doForm.doNumber} onChange={(e) => setDoForm((v) => ({ ...v, doNumber: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Delivery Date</Label>
                          <Input type="date" value={doForm.deliveryDate} onChange={(e) => setDoForm((v) => ({ ...v, deliveryDate: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Customer</Label>
                          <SearchableSelect
                            options={customerOptions}
                            value={selectedCustomerId}
                            onChange={onSelectCustomer}
                            placeholder="Select customer..."
                            emptyMessage="No customer data"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Destination Address</Label>
                          <Input
                            value={doForm.destinationAddress}
                            onChange={(e) => setDoForm((v) => ({ ...v, destinationAddress: e.target.value }))}
                            placeholder="Input destination address..."
                          />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label>Customer PIC</Label>
                            {selectedCustomerId ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setAllowManualCustomerContact((v) => !v)}
                              >
                                {allowManualCustomerContact ? "Lock" : "Override"}
                              </Button>
                            ) : null}
                          </div>
                          <Input
                            value={doForm.customerPic}
                            readOnly={!!selectedCustomerId && !allowManualCustomerContact}
                            onChange={(e) => setDoForm((v) => ({ ...v, customerPic: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Phone Number</Label>
                          <Input
                            value={doForm.phoneNumber}
                            readOnly={!!selectedCustomerId && !allowManualCustomerContact}
                            onChange={(e) => setDoForm((v) => ({ ...v, phoneNumber: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Warehouse Origin</Label>
                          <Input
                            value={doForm.warehouseOrigin}
                            onChange={(e) => setDoForm((v) => ({ ...v, warehouseOrigin: e.target.value }))}
                            placeholder="Input warehouse origin..."
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Driver Name</Label>
                          <Input value={doForm.driverName} onChange={(e) => setDoForm((v) => ({ ...v, driverName: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Vehicle Plate</Label>
                          <Input value={doForm.vehiclePlate} onChange={(e) => setDoForm((v) => ({ ...v, vehiclePlate: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Expedition Company</Label>
                          <Input
                            value={doForm.expeditionCompany}
                            onChange={(e) => setDoForm((v) => ({ ...v, expeditionCompany: e.target.value }))}
                            placeholder="Input expedition company..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-700">Section B - Item Details</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setDoItems((v) => [...v, { productId: "", product: "", thickness: "", size: "", grade: "", quantity: 0, unit: "Sheets", notes: "" }])
                          }
                        >
                          + Add Item
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead>Thickness</TableHead>
                              <TableHead>Size</TableHead>
                              <TableHead>Grade</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead>Notes</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {doItems.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="min-w-[240px]">
                                  <SearchableSelect
                                    options={productOptions}
                                    value={item.productId}
                                    onChange={(value) => onSelectProduct(idx, value)}
                                    placeholder="Select product..."
                                    emptyMessage="No product data"
                                  />
                                </TableCell>
                                {(["thickness", "size", "grade", "quantity", "unit", "notes"] as const).map((k) => (
                                  <TableCell key={k}>
                                    <Input
                                      value={item[k]}
                                      onChange={(e) =>
                                        setDoItems((v) => v.map((x, i) => (i === idx ? { ...x, [k]: k === "quantity" ? Number(e.target.value) : e.target.value } : x)))
                                      }
                                      readOnly={k === "thickness" || k === "size" || k === "grade"}
                                      className={k === "thickness" || k === "size" || k === "grade" ? "bg-slate-50" : ""}
                                    />
                                  </TableCell>
                                ))}
                                <TableCell className="text-right">
                                  <Button
                                    size="icon-sm"
                                    variant="outline"
                                    onClick={() => setDoItems((v) => v.filter((_, i) => i !== idx))}
                                    disabled={doItems.length <= 1}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="mb-3 text-sm font-semibold text-slate-700">Section C - Shipment Info</h4>
                      <div className="grid gap-3 md:grid-cols-4">
                        {[
                          ["Container Number", "containerNumber", "text"],
                          ["Seal Number", "sealNumber", "text"],
                          ["ETD", "etd", "date"],
                          ["ETA", "eta", "date"],
                        ].map(([label, key, type]) => (
                          <div key={key} className="space-y-1.5">
                            <Label>{label}</Label>
                            <Input
                              type={type}
                              value={doForm[key as keyof typeof doForm]}
                              onChange={(e) => setDoForm((v) => ({ ...v, [key]: e.target.value }))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Section D - Additional Notes</Label>
                      <Textarea
                        value={doForm.notes}
                        onChange={(e) => setDoForm((v) => ({ ...v, notes: e.target.value }))}
                        placeholder="Add loading instruction or customer handling note..."
                        rows={3}
                      />
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                      <Button variant="outline" onClick={() => setToast("Draft saved locally.")}>Save Draft</Button>
                      <Button variant="outline" onClick={() => setToast("Print preview generated.")}>Print Preview</Button>
                      <Button
                        onClick={createDeliveryOrder}
                        disabled={savingShipment || !doItems.some((item) => item.productId && Number(item.quantity) > 0)}
                      >
                        {savingShipment ? "Creating..." : "Create Delivery"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Active Shipments", value: analytics.active, icon: PackageSearch },
          { label: "Delivered Today", value: analytics.deliveredToday, icon: CheckCircle2 },
          { label: "Delayed Deliveries", value: analytics.delayed, icon: CircleAlert },
          { label: "Pending POD", value: analytics.pendingPod, icon: FileText },
          { label: "Containers In Transit", value: analytics.inTransit, icon: ShipWheel },
        ].map((card) => (
          <Card key={card.label} className="rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: BRAND.slateBorder }}>
            <CardContent className="p-5">
              <div className="mb-3 flex items-start justify-between">
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <div className="rounded-lg p-2 text-white" style={{ backgroundColor: BRAND.navy }}>
                  <card.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900">{card.value}</div>
              <p className="mt-1 text-xs text-slate-500">Calculated from real shipment records</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "ghost"}
              className="rounded-xl"
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoadingTab ? (
        <div className="space-y-3">
          <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ) : (
        <>
          {activeTab === "deliveryOrders" && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-50">
                    <TableRow>
                      <TableHead>DO Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Vehicle Plate</TableHead>
                      <TableHead>Total Items</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDeliveryOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-12 text-center text-slate-500">
                          No delivery orders found.
                        </TableCell>
                      </TableRow>
                    )}
                    {paginatedDeliveryOrders.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-semibold">{row.doNumber}</TableCell>
                        <TableCell>{row.customer}</TableCell>
                        <TableCell>{row.destination}</TableCell>
                        <TableCell>{row.driver}</TableCell>
                        <TableCell>{row.vehiclePlate}</TableCell>
                        <TableCell>{row.totalItems}</TableCell>
                        <TableCell>{formatDate(row.deliveryDate)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(row.status) as any}>{row.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1.5">
                            <Button size="icon-sm" variant="outline" onClick={() => openViewDo(row.id)}><Eye className="h-4 w-4" /></Button>
                            {!readOnly && <Button size="icon-sm" variant="outline" onClick={() => openEditDo(row.id)}><Pencil className="h-4 w-4" /></Button>}
                            <Button size="icon-sm" variant="outline" onClick={() => printDo(row.id)}><Printer className="h-4 w-4" /></Button>
                            <Button size="icon-sm" variant="outline" onClick={() => triggerPodUpload(row.id)} disabled={uploadingPod}><Upload className="h-4 w-4" /></Button>
                            {!readOnly && (
                              <Button
                                size="icon-sm"
                                variant="outline"
                                onClick={() => {
                                  const shipment = getShipmentById(row.id);
                                  if (shipment) setPendingDelete(shipment);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "shipments" && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-50">
                    <TableRow>
                      <TableHead>Container / BL</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>ETD</TableHead>
                      <TableHead>ETA</TableHead>
                      <TableHead>Current Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShipments.map((s) => {
                      const step = Math.min(shipmentSteps.length - 1, shipmentSteps.findIndex((x) => s.status.toUpperCase().includes(x.toUpperCase())) + 2);
                      const pct = Math.max(20, (step / (shipmentSteps.length - 1)) * 100);
                      const etaDays = s.eta ? Math.max(0, Math.ceil((new Date(s.eta).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="font-semibold text-slate-900">{s.containerNumber || "TBA"}</div>
                            <div className="text-xs text-slate-500">BL: {s.billOfLading}</div>
                          </TableCell>
                          <TableCell>{s.originPort} {"->"} {s.destinationPort}</TableCell>
                          <TableCell>{formatDate(s.etd)}</TableCell>
                          <TableCell>{formatDate(s.eta)}</TableCell>
                          <TableCell><Badge variant={statusVariant(s.status) as any}>{s.status.replaceAll("_", " ")}</Badge></TableCell>
                          <TableCell>
                            <div className="space-y-1.5">
                              <div className="h-2 rounded-full bg-slate-100">
                                <div className="h-2 rounded-full bg-slate-900 transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-xs text-slate-500">{etaDays === null ? "ETA pending" : `${etaDays} days to ETA`}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1.5">
                              <Button size="icon-sm" variant="outline" onClick={() => { setSelectedShipment(s); setOpenTimeline(true); }}><CalendarClock className="h-4 w-4" /></Button>
                              {!readOnly && <Button size="icon-sm" variant="outline" onClick={() => updateShipmentStatus(s, "IN_TRANSIT")}><Truck className="h-4 w-4" /></Button>}
                              {!readOnly && <Button size="icon-sm" variant="outline" onClick={() => setPendingDelete(s)} disabled={deletingId === s.id}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {activeTab === "containers" && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-50">
                  <TableRow>
                    <TableHead>Container Number</TableHead>
                    <TableHead>BL Number</TableHead>
                    <TableHead>Vessel Name</TableHead>
                    <TableHead>Origin Port</TableHead>
                    <TableHead>Destination Port</TableHead>
                    <TableHead>ETD</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead>Seal Number</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {containers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold">{c.containerNumber}</TableCell>
                      <TableCell>{c.blNumber}</TableCell>
                      <TableCell>{c.vesselName}</TableCell>
                      <TableCell>{c.originPort}</TableCell>
                      <TableCell>{c.destinationPort}</TableCell>
                      <TableCell>{formatDate(c.etd)}</TableCell>
                      <TableCell>{formatDate(c.eta)}</TableCell>
                      <TableCell>{c.sealNumber}</TableCell>
                      <TableCell><Badge variant={statusVariant(c.status) as any}>{c.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {activeTab === "pod" && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {deliveryOrders.length === 0 && (
                <Card className="rounded-2xl border-dashed md:col-span-2 xl:col-span-3">
                  <CardContent className="py-14 text-center text-sm text-slate-500">
                    No delivery records available yet for POD.
                  </CardContent>
                </Card>
              )}
              {deliveryOrders.map((row) => (
                <Card key={row.id} className="rounded-2xl border-slate-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <span>{row.doNumber}</span>
                      <Badge variant={row.status === "Delivered" ? "success" : "warning"}>{row.status === "Delivered" ? "Completed" : "Pending"}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500">
                      Upload delivery photos and signed POD documents.
                    </div>
                    {(podUploads[row.id] || []).length > 0 && (
                      <div className="space-y-2">
                        {(podUploads[row.id] || []).map((file, idx) => (
                          <div key={`${file.name}-${idx}`} className="rounded-lg border bg-slate-50 px-3 py-2">
                            <p className="truncate text-xs font-medium text-slate-700">{file.name}</p>
                            <p className="text-[11px] text-slate-500">
                              {(file.size / 1024).toFixed(1)} KB - {new Date(file.uploadedAt).toLocaleString()}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <a href={file.url} target="_blank" className="text-[11px] text-blue-600 underline">
                                View
                              </a>
                              {!readOnly && (
                                <button
                                  type="button"
                                  className="text-[11px] text-red-600 underline"
                                  onClick={() => onDeletePodFile(row.id, file.name)}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Receiver: -</span>
                      <span>-</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Button variant="outline" size="sm" onClick={() => triggerPodUpload(row.id)} disabled={uploadingPod}><Upload className="mr-1 h-3.5 w-3.5" /> {uploadingPod ? "Uploading..." : "Upload File"}</Button>
                      <Button variant="outline" size="sm"><BadgeCheck className="mr-1 h-3.5 w-3.5" /> Signature</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeTab === "schedule" && (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="rounded-2xl lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Month Planner</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setScheduleMonth(new Date(scheduleMonth.getFullYear(), scheduleMonth.getMonth() - 1, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-32 text-center text-sm font-medium text-slate-700">
                      {scheduleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </div>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setScheduleMonth(new Date(scheduleMonth.getFullYear(), scheduleMonth.getMonth() + 1, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 border-x border-t text-center text-xs font-semibold text-slate-500">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <div key={d} className="border-b border-r bg-slate-50 py-2 last:border-r-0">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 border-l border-b text-xs">
                    {monthDays.map((d) => {
                      const isCurrentMonth = d.getMonth() === scheduleMonth.getMonth();
                      const isToday =
                        d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                      const dayEvents = scheduleEvents.filter(
                        (e) =>
                          e.date.getDate() === d.getDate() &&
                          e.date.getMonth() === d.getMonth() &&
                          e.date.getFullYear() === d.getFullYear()
                      );
                      return (
                        <div key={d.toISOString()} className="h-24 border-r border-t p-1.5 last:border-r-0">
                          <div className={`mb-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] ${isToday ? "bg-slate-900 text-white" : isCurrentMonth ? "text-slate-700" : "text-slate-300"}`}>
                            {d.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 2).map((e) => (
                              <div key={`${e.shipmentId}-${e.type}`} className="truncate rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
                                {e.type}: {e.shipmentId.slice(0, 6)}
                              </div>
                            ))}
                            {dayEvents.length > 2 && <div className="text-[10px] text-slate-500">+{dayEvents.length - 2} more</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Week Planner</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    {weekRange.start.toLocaleDateString("en-US", { day: "2-digit", month: "short" })} -{" "}
                    {weekRange.end.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                  {weekEvents.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
                      No ETD/ETA events in this week.
                    </div>
                  ) : (
                    weekEvents.map((e) => (
                      <div key={`${e.shipmentId}-${e.type}-${e.date.toISOString()}`} className="rounded-xl border bg-white p-3 text-sm">
                        <div className="font-medium text-slate-800">{e.label}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {e.date.toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short" })}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="space-y-4">
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setToast("PDF report export triggered.")}>Export PDF</Button>
                <Button variant="outline" onClick={() => setToast("Excel report export triggered.")}>Export Excel</Button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-2xl">
                  <CardHeader><CardTitle className="text-base">Monthly Deliveries & Delayed Shipments</CardTitle></CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={220}>
                      <BarChart data={monthlyDeliveries}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                      <Bar dataKey="deliveries" fill={BRAND.navy} radius={[6, 6, 0, 0]} />
                        <Bar dataKey="delayed" fill="#dc2626" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl">
                  <CardHeader><CardTitle className="text-base">Delivery Performance & Shipment Volume</CardTitle></CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={220}>
                      <LineChart data={monthlyDeliveries}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line dataKey="deliveries" stroke="#16a34a" strokeWidth={3} />
                        <Line dataKey="volume" stroke={BRAND.navySoft} strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              <Card className="rounded-2xl">
                <CardHeader><CardTitle className="text-base">Top Destination Ports</CardTitle></CardHeader>
                <CardContent>
                  {filteredShipments.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
                      No shipment data available.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Destination Port</TableHead>
                          <TableHead className="text-right">Shipment Volume</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(
                          filteredShipments.reduce<Record<string, number>>((acc, s) => {
                            const key = s.destinationPort || "-";
                            acc[key] = (acc[key] || 0) + 1;
                            return acc;
                          }, {})
                        )
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([destination, count]) => (
                            <TableRow key={destination}>
                              <TableCell>{destination}</TableCell>
                              <TableCell className="text-right">{count}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">QR Tracking</span>
            <Badge variant="outline">Auto-generated per shipment</Badge>
            <Button type="button" size="sm" variant="outline" onClick={() => openQrForShipment()}>
              Generate QR
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock3 className="h-4 w-4" />
            <span>Real-time activity logs enabled</span>
            <Box className="ml-3 h-4 w-4" />
            <span>Auto document numbering active</span>
          </div>
        </div>
      </div>

      <Dialog open={openTimeline} onOpenChange={setOpenTimeline}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shipment Timeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {shipmentSteps.map((step, idx) => (
              <div key={step} className="flex items-center gap-3 rounded-lg border bg-slate-50 p-3">
                <div className={`h-2.5 w-2.5 rounded-full ${idx <= 2 ? "bg-green-500" : "bg-slate-300"}`} />
                <div className="text-sm text-slate-700">{step}</div>
              </div>
            ))}
            {selectedShipment && (
              <div className="rounded-lg border p-3 text-sm text-slate-600">
                Tracking details for {selectedShipment.containerNumber || selectedShipment.billOfLading}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openQrTracking} onOpenChange={setOpenQrTracking}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Shipment Tracking</DialogTitle>
          </DialogHeader>
          {selectedShipment ? (
            <div className="space-y-3">
              <div className="rounded-lg border bg-white p-3 text-sm">
                <p className="font-medium text-slate-800">{selectedShipment.containerNumber || selectedShipment.billOfLading}</p>
                <p className="text-xs text-slate-500">{selectedShipment.originPort} {"->"} {selectedShipment.destinationPort}</p>
              </div>
              <div className="flex justify-center rounded-lg border bg-slate-50 p-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(getTrackingUrl(selectedShipment))}`}
                  alt="Shipment tracking QR"
                  className="h-52 w-52 rounded"
                />
              </div>
              <div className="rounded border bg-slate-50 px-3 py-2 text-xs text-slate-700 break-all">{getTrackingUrl(selectedShipment)}</div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={copyTrackingLink}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copy Link
                </Button>
                <Button type="button" variant="outline" onClick={() => window.open(getTrackingUrl(selectedShipment), "_blank")}>
                  <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={openDoView} onOpenChange={setOpenDoView}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Delivery Order Detail</DialogTitle>
          </DialogHeader>
          {selectedShipment ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Container</span><p className="font-medium">{selectedShipment.containerNumber || "-"}</p></div>
              <div><span className="text-slate-500">BL</span><p className="font-medium">{selectedShipment.billOfLading || "-"}</p></div>
              <div><span className="text-slate-500">Origin</span><p className="font-medium">{selectedShipment.originPort || "-"}</p></div>
              <div><span className="text-slate-500">Destination</span><p className="font-medium">{selectedShipment.destinationPort || "-"}</p></div>
              <div><span className="text-slate-500">ETD</span><p className="font-medium">{formatDate(selectedShipment.etd)}</p></div>
              <div><span className="text-slate-500">ETA</span><p className="font-medium">{formatDate(selectedShipment.eta)}</p></div>
              <div><span className="text-slate-500">Status</span><div className="mt-1"><Badge variant={statusVariant(selectedShipment.status) as any}>{selectedShipment.status.replaceAll("_", " ")}</Badge></div></div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={openDoEdit} onOpenChange={setOpenDoEdit}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Delivery Order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5"><Label>Container Number</Label><Input value={doEditForm.containerNumber} onChange={(e) => setDoEditForm((v) => ({ ...v, containerNumber: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Bill of Lading</Label><Input value={doEditForm.billOfLading} onChange={(e) => setDoEditForm((v) => ({ ...v, billOfLading: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Origin</Label><Input value={doEditForm.originPort} onChange={(e) => setDoEditForm((v) => ({ ...v, originPort: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Destination</Label><Input value={doEditForm.destinationPort} onChange={(e) => setDoEditForm((v) => ({ ...v, destinationPort: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>ETD</Label><Input type="date" value={doEditForm.etd} onChange={(e) => setDoEditForm((v) => ({ ...v, etd: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>ETA</Label><Input type="date" value={doEditForm.eta} onChange={(e) => setDoEditForm((v) => ({ ...v, eta: e.target.value }))} /></div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Status</Label>
              <Select value={doEditForm.status} onValueChange={(value) => setDoEditForm((v) => ({ ...v, status: value || "PENDING" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="IN_TRANSIT">IN_TRANSIT</SelectItem>
                  <SelectItem value="ARRIVED">ARRIVED</SelectItem>
                  <SelectItem value="DELIVERED">DELIVERED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenDoEdit(false)}>Cancel</Button>
            <Button onClick={saveDoEdit} disabled={savingDoEdit}>{savingDoEdit ? "Saving..." : "Save Changes"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Delete shipment {pendingDelete?.containerNumber || pendingDelete?.billOfLading}?</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
