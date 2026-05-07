"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search, Upload, Link2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";

import {
  createCategory,
  createManualBankTransaction,
  getInvoicesForMatching,
  importBankMutation,
  setTransactionChecked,
  updateTransaction,
} from "./actions";

type Category = { id: string; name: string };
type ImportBatch = { accountName: string; fileName: string; importedAt: string | Date };

type Invoice = {
  id: string;
  invoiceNumber: string;
  type: "PAYABLE" | "RECEIVABLE";
  amount: number;
  currency: string;
  status: "UNPAID" | "PARTIALLY_PAID" | "PAID";
};

type Txn = {
  id: string;
  orderNo?: number | null;
  txnDate: string | Date;
  description: string;
  branch?: string | null;
  debit: number;
  credit: number;
  balance: number | null;
  notes: string | null;
  status: "UNMATCHED" | "MATCHED" | "RECONCILED" | "IGNORED";
  adminChecked?: boolean;
  category: Category | null;
  importBatch: ImportBatch;
  matchedInvoice: Invoice | null;
};

type ImportRow = {
  orderNo?: number | null;
  txnDate: string; // YYYY-MM-DD
  description: string;
  branch?: string | null;
  debit: number;
  credit: number;
  balance?: number | null;
  invoiceNumber?: string | null;
};

function formatIDR(n: number) {
  return (n || 0).toLocaleString("id-ID");
}

function toNum(v: unknown) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.-]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeHeader(s: string) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w ]/g, "");
}

function toISODate(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  // common formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
  const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
  const m2 = s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function getStatusBadge(status: Txn["status"]) {
  switch (status) {
    case "RECONCILED":
      return <Badge variant="success">RECONCILED</Badge>;
    case "MATCHED":
      return <Badge variant="info">MATCHED</Badge>;
    case "UNMATCHED":
      return <Badge variant="warning">UNMATCHED</Badge>;
    case "IGNORED":
      return <Badge variant="outline">IGNORED</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function computeDedupeKey(r: ImportRow) {
  const base = [
    r.txnDate,
    (r.description || "").trim().toLowerCase().replace(/\s+/g, " "),
    Math.round(toNum(r.debit) * 100) / 100,
    Math.round(toNum(r.credit) * 100) / 100,
    r.balance == null ? "" : Math.round(toNum(r.balance) * 100) / 100,
  ].join("|");
  return base;
}

export function BookkeepingClient({
  readOnly,
  canChecklist,
  initialTransactions,
  categories,
  latestBatches,
}: {
  readOnly: boolean;
  canChecklist: boolean;
  initialTransactions: Txn[];
  categories: Category[];
  latestBatches: ImportBatch[];
}) {
  const [txns, setTxns] = useState<Txn[]>(initialTransactions);
  const [cats, setCats] = useState<Category[]>(categories);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [accountName, setAccountName] = useState("BCA");
  const [fileName, setFileName] = useState<string>("");
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualOrderNo, setManualOrderNo] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualBranch, setManualBranch] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualBalance, setManualBalance] = useState("");
  const [manualInvoice, setManualInvoice] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editTxn, setEditTxn] = useState<Txn | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<Txn["status"]>("UNMATCHED");
  const [editCategoryId, setEditCategoryId] = useState<string>("none");

  const [matchOpen, setMatchOpen] = useState(false);
  const [matchTxn, setMatchTxn] = useState<Txn | null>(null);
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [invoiceResults, setInvoiceResults] = useState<Invoice[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = minAmount ? Number(minAmount) : undefined;
    const max = maxAmount ? Number(maxAmount) : undefined;
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    return txns.filter((t) => {
      const d = new Date(t.txnDate);
      if (fromDate && d < fromDate) return false;
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      if (filterStatus !== "all" && t.status !== filterStatus) return false;

      const amount = Math.max(t.debit || 0, t.credit || 0);
      if (min != null && amount < min) return false;
      if (max != null && amount > max) return false;

      if (q) {
        const inv = t.matchedInvoice?.invoiceNumber?.toLowerCase() || "";
        if (!t.description.toLowerCase().includes(q) && !inv.includes(q)) return false;
      }
      return true;
    });
  }, [txns, search, filterStatus, from, to, minAmount, maxAmount]);

  const stats = useMemo(() => {
    let unmatched = 0;
    let matched = 0;
    let reconciled = 0;
    for (const t of txns) {
      if (t.status === "UNMATCHED") unmatched++;
      else if (t.status === "MATCHED") matched++;
      else if (t.status === "RECONCILED") reconciled++;
    }
    return { unmatched, matched, reconciled, total: txns.length };
  }, [txns]);

  const handleExport = () => {
    const rows = filtered.map((t) => ({
      date: new Date(t.txnDate).toISOString().slice(0, 10),
      description: t.description,
      category: t.category?.name || "",
      debit: t.debit,
      credit: t.credit,
      balance: t.balance ?? "",
      status: t.status,
      notes: t.notes ?? "",
      invoice: t.matchedInvoice?.invoiceNumber || "",
      account: t.importBatch?.accountName || "",
    }));

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookkeeping_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  async function refreshAfterMutation() {
    // This app generally relies on revalidatePath() + navigation refresh,
    // but we keep it simple by hard reloading client state from server-rendered data on refresh.
    // User can also just refresh page; still, we update local state optimistically where possible.
  }

  function openEdit(t: Txn) {
    setEditTxn(t);
    setEditNotes(t.notes || "");
    setEditStatus(t.status);
    setEditCategoryId(t.category?.id || "none");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editTxn) return;
    const payload = {
      id: editTxn.id,
      notes: editNotes.trim() ? editNotes.trim() : null,
      status: editStatus,
      categoryId: editCategoryId === "none" ? null : editCategoryId,
    };
    const result = await updateTransaction(payload);
    if (!result.success) {
      alert("Error: " + (result.error || "Failed to update"));
      return;
    }
    setTxns((prev) =>
      prev.map((p) =>
        p.id === editTxn.id
          ? {
              ...p,
              notes: payload.notes,
              status: payload.status,
              category:
                payload.categoryId == null
                  ? null
                  : cats.find((c) => c.id === payload.categoryId) || p.category,
            }
          : p
      )
    );
    setEditOpen(false);
    setEditTxn(null);
    await refreshAfterMutation();
  }

  async function runInvoiceSearch(q: string) {
    setInvoiceLoading(true);
    try {
      const invs = await getInvoicesForMatching(q);
      setInvoiceResults(invs as unknown as Invoice[]);
    } finally {
      setInvoiceLoading(false);
    }
  }

  function openMatch(t: Txn) {
    setMatchTxn(t);
    setInvoiceQuery("");
    setInvoiceResults([]);
    setMatchOpen(true);
  }

  async function selectInvoice(inv: Invoice) {
    if (!matchTxn) return;
    const result = await updateTransaction({
      id: matchTxn.id,
      matchedInvoiceId: inv.id,
      status: "MATCHED",
    });
    if (!result.success) {
      alert("Error: " + (result.error || "Failed to match invoice"));
      return;
    }
    setTxns((prev) =>
      prev.map((p) =>
        p.id === matchTxn.id ? { ...p, matchedInvoice: inv, status: "MATCHED" } : p
      )
    );
    setMatchOpen(false);
    setMatchTxn(null);
  }

  async function clearMatch(t: Txn) {
    const ok = confirm("Unmatch invoice from this transaction?");
    if (!ok) return;
    const result = await updateTransaction({
      id: t.id,
      matchedInvoiceId: null,
      status: t.status === "MATCHED" ? "UNMATCHED" : t.status,
    });
    if (!result.success) {
      alert("Error: " + (result.error || "Failed to unmatch"));
      return;
    }
    setTxns((prev) =>
      prev.map((p) =>
        p.id === t.id ? { ...p, matchedInvoice: null, status: p.status === "MATCHED" ? "UNMATCHED" : p.status } : p
      )
    );
  }

  async function addCategory() {
    const name = prompt("New category name");
    if (!name) return;
    const res = await createCategory(name);
    if (!res.success) {
      alert("Error: " + (res.error || "Failed to create category"));
      return;
    }
    // Quick refresh by reloading page data is ideal, but we'll just append optimistically.
    setCats((prev) => [...prev, { id: `tmp-${Date.now()}`, name: name.trim() }]);
  }

  function parseCsv(file: File) {
    return new Promise<ImportRow[]>((resolve, reject) => {
      Papa.parse(
        file as any,
        {
        header: true,
        skipEmptyLines: true,
        complete: (result: Papa.ParseResult<Record<string, unknown>>) => {
          try {
            const raw = result.data as Record<string, unknown>[];
            if (!raw.length) return resolve([]);

            const pick = (row: Record<string, unknown>, candidates: string[]) => {
              for (const c of candidates) {
                const key = Object.keys(row).find((k) => normalizeHeader(k) === c);
                if (key) return row[key];
              }
              return "";
            };

            const rows = raw.map((r, idx) => {
              const date = pick(r, ["date", "tanggal", "trx date", "transaction date"]);
              const desc = pick(r, ["description", "keterangan", "uraian", "deskripsi", "remark", "memo"]);
              const debit = pick(r, ["debit", "db", "debet", "out"]);
              const credit = pick(r, ["credit", "cr", "kredit", "in"]);
              const branch = pick(r, ["cabang", "branch"]);
              const amount = pick(r, ["jumlah", "amount", "mutasi", "nominal"]);
              const bal = pick(r, ["balance", "saldo"]);
              const invoiceNumber = pick(r, ["invoice", "faktur", "no invoice"]);

              const d = toISODate(date);
              const db = toNum(debit);
              const cr = toNum(credit);
              const a = toNum(amount);

              const inferredDebit = db > 0 ? db : a < 0 ? Math.abs(a) : 0;
              const inferredCredit = cr > 0 ? cr : a > 0 ? a : 0;

              return {
                orderNo: idx + 1,
                txnDate: d,
                description: String(desc || "").trim(),
                branch: String(branch || "").trim() || null,
                debit: inferredDebit || 0,
                credit: inferredCredit || 0,
                balance: bal === "" || bal == null ? null : toNum(bal),
                invoiceNumber: String(invoiceNumber || "").trim() || null,
              } satisfies ImportRow;
            });

            resolve(rows);
          } catch (e) {
            reject(e);
          }
        },
          error: (err: Papa.ParseError) => reject(err),
        } as any
      );
    });
  }

  function parseXlsx(file: File) {
    return new Promise<ImportRow[]>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = new Uint8Array(reader.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
          if (!json.length) return resolve([]);

          const pick = (row: Record<string, unknown>, candidates: string[]) => {
            for (const c of candidates) {
              const key = Object.keys(row).find((k) => normalizeHeader(k) === c);
              if (key) return row[key];
            }
            return "";
          };

          const rows = json.map((r, idx) => {
            const date = pick(r, ["date", "tanggal", "trx date", "transaction date"]);
            const desc = pick(r, ["description", "keterangan", "uraian", "deskripsi", "remark", "memo"]);
            const debit = pick(r, ["debit", "db", "debet", "out"]);
            const credit = pick(r, ["credit", "cr", "kredit", "in"]);
            const branch = pick(r, ["cabang", "branch"]);
            const amount = pick(r, ["jumlah", "amount", "mutasi", "nominal"]);
            const bal = pick(r, ["balance", "saldo"]);
            const invoiceNumber = pick(r, ["invoice", "faktur", "no invoice"]);

            const d = toISODate(date);
            const db = toNum(debit);
            const cr = toNum(credit);
            const a = toNum(amount);

            return {
              orderNo: idx + 1,
              txnDate: d,
              description: String(desc || "").trim(),
              branch: String(branch || "").trim() || null,
              debit: db > 0 ? db : 0,
              credit: cr > 0 ? cr : 0,
              balance: bal === "" || bal == null ? null : toNum(bal),
              invoiceNumber: String(invoiceNumber || "").trim() || null,
            } satisfies ImportRow;
          });

          // If worksheet has amount but no debit/credit columns, infer based on sign of amount
          // (best-effort, still validated on import)
          if (rows.every((r) => r.debit === 0 && r.credit === 0)) {
            const inferred = json.map((r) => {
              const date = pick(r, ["date", "tanggal", "trx date", "transaction date"]);
              const desc = pick(r, ["description", "keterangan", "uraian", "deskripsi", "remark", "memo"]);
              const amount = pick(r, ["amount", "mutasi", "nominal"]);
              const branch = pick(r, ["cabang", "branch"]);
              const bal = pick(r, ["balance", "saldo"]);
              const a = toNum(amount);
              return {
                orderNo: null,
                txnDate: toISODate(date),
                description: String(desc || "").trim(),
                branch: String(branch || "").trim() || null,
                debit: a < 0 ? Math.abs(a) : 0,
                credit: a > 0 ? a : 0,
                balance: bal === "" || bal == null ? null : toNum(bal),
              } satisfies ImportRow;
            });
            resolve(inferred);
            return;
          }

          resolve(rows);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  }

  async function toggleChecklist(t: Txn, checked: boolean) {
    // Optimistic UI update
    setTxns((prev) => prev.map((p) => (p.id === t.id ? { ...p, adminChecked: checked } : p)));
    try {
      const res = await setTransactionChecked({ id: t.id, checked });
      if (!res?.success) throw new Error(res?.error || "Failed");
    } catch (e: any) {
      // rollback
      setTxns((prev) => prev.map((p) => (p.id === t.id ? { ...p, adminChecked: !checked } : p)));
      alert("Error: " + (e?.message || "Failed to update checklist"));
    }
  }

  async function saveManual() {
    if (readOnly) return;
    setManualSaving(true);
    try {
      const amount = toNum(manualAmount);
      const bal = manualBalance.trim() ? toNum(manualBalance) : null;
      const orderNo = manualOrderNo.trim() ? Number(manualOrderNo) : null;

      const res = await createManualBankTransaction({
        accountName,
        orderNo: orderNo && Number.isFinite(orderNo) ? orderNo : null,
        txnDate: manualDate,
        description: manualDesc,
        branch: manualBranch.trim() ? manualBranch.trim() : null,
        amount,
        balance: bal,
        invoiceNumber: manualInvoice.trim() ? manualInvoice.trim() : null,
      });
      if (!res?.success) {
        alert("Error: " + (res?.error || "Failed to save"));
        return;
      }
      if (res.txn) {
        setTxns((prev) => [res.txn as unknown as Txn, ...prev]);
      }
      setManualOpen(false);
      setManualOrderNo("");
      setManualDate("");
      setManualDesc("");
      setManualBranch("");
      setManualAmount("");
      setManualBalance("");
      setManualInvoice("");
    } finally {
      setManualSaving(false);
    }
  }

  async function onFileSelected(file: File) {
    setImportError(null);
    setFileName(file.name);
    try {
      let rows: ImportRow[] = [];
      if (file.name.toLowerCase().endsWith(".csv")) {
        rows = await parseCsv(file);
      } else if (file.name.toLowerCase().endsWith(".xlsx")) {
        rows = await parseXlsx(file);
      } else {
        setImportError("Unsupported file type. Please upload .csv or .xlsx");
        return;
      }

      // Basic validation + de-dupe inside file
      const seen = new Set<string>();
      const cleaned = rows
        .map((r) => ({
          txnDate: r.txnDate,
          description: (r.description || "").trim(),
          debit: Math.max(0, toNum(r.debit)),
          credit: Math.max(0, toNum(r.credit)),
          balance: r.balance == null ? null : toNum(r.balance),
        }))
        .filter((r) => r.txnDate && r.description);

      const deduped: ImportRow[] = [];
      for (const r of cleaned) {
        const key = computeDedupeKey(r);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(r);
      }

      setImportRows(deduped);
      if (!deduped.length) setImportError("No valid rows detected. Please check your export columns.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to parse file";
      setImportError(message);
    }
  }

  async function doImport() {
    if (!importRows.length) return;
    setImporting(true);
    const result = await importBankMutation({
      accountName,
      fileName: fileName || "upload",
      rows: importRows,
    });
    setImporting(false);

    if (!result.success) {
      setImportError(result.error || "Import failed");
      return;
    }

    alert(`Imported: ${result.inserted}, skipped duplicates: ${result.skipped}`);
    setImportOpen(false);
    // Easiest: refresh page to get server-revalidated data
    window.location.reload();
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="warning">UNMATCHED: {stats.unmatched}</Badge>
            <Badge variant="info">MATCHED: {stats.matched}</Badge>
            <Badge variant="success">RECONCILED: {stats.reconciled}</Badge>
            <Badge variant="outline">TOTAL: {stats.total}</Badge>
          </div>
          {latestBatches?.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Latest import:{" "}
              <span className="font-medium text-slate-700">
                {latestBatches[0].accountName}
              </span>{" "}
              ({latestBatches[0].fileName})
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search description or invoice..."
              className="pl-8 w-[260px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v || "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="UNMATCHED">UNMATCHED</SelectItem>
              <SelectItem value="MATCHED">MATCHED</SelectItem>
              <SelectItem value="RECONCILED">RECONCILED</SelectItem>
              <SelectItem value="IGNORED">IGNORED</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[155px]" />
            <span className="text-xs text-muted-foreground">to</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[155px]" />
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-[110px]"
            />
            <Input
              type="number"
              placeholder="Max"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-[110px]"
            />
          </div>

          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>

          {!readOnly && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setManualOpen(true)}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Input Manual
              </Button>
              <Button onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Import Mutation
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-card shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#F8FAFC] sticky top-0 border-b border-slate-200">
            <TableRow className="border-none">
              <TableHead className="w-10" />
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">#Order</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Tanggal</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Keterangan</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Cabang</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Jumlah</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Saldo</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Invoice</TableHead>
              <TableHead className="text-xs font-semibold text-slate-900 py-3 uppercase">Status</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-900 py-3 uppercase">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t, idx) => (
                <TableRow key={t.id} className={idx % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]/60"}>
                  <TableCell className="py-3.5 border-b border-slate-100">
                    {canChecklist ? (
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-blue-600"
                        checked={Boolean(t.adminChecked)}
                        disabled={readOnly}
                        onChange={(e) => toggleChecklist(t, e.target.checked)}
                        title="Checklist (Admin)"
                      />
                    ) : null}
                  </TableCell>
                  <TableCell className="text-slate-700 py-3.5 border-b border-slate-100">
                    {t.orderNo ?? filtered.length - idx}
                  </TableCell>
                  <TableCell className="text-slate-700 py-3.5 border-b border-slate-100">
                    {new Date(t.txnDate).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell className="py-3.5 border-b border-slate-100">
                    <div className="font-medium text-slate-900 line-clamp-2">{t.description}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t.importBatch?.accountName} • {t.importBatch?.fileName}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-700 py-3.5 border-b border-slate-100">
                    {t.branch ? t.branch : <span className="text-slate-400">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-medium py-3.5 border-b border-slate-100">
                    {(() => {
                      const amount = (t.credit || 0) - (t.debit || 0);
                      const isOut = amount < 0;
                      const abs = Math.abs(amount);
                      return (
                        <span className={isOut ? "text-red-700" : "text-emerald-700"}>
                          {amount === 0 ? "—" : `${isOut ? "-" : ""}Rp ${formatIDR(abs)}`}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right text-slate-700 py-3.5 border-b border-slate-100">
                    {t.balance != null ? `Rp ${formatIDR(t.balance)}` : "—"}
                  </TableCell>
                  <TableCell className="py-3.5 border-b border-slate-100">
                    {t.matchedInvoice?.invoiceNumber ? (
                      <span className="inline-flex items-center gap-1 text-blue-700">
                        <Link2 className="h-3.5 w-3.5" />
                        {t.matchedInvoice.invoiceNumber}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5 border-b border-slate-100">{getStatusBadge(t.status)}</TableCell>
                  <TableCell className="text-right py-3.5 border-b border-slate-100">
                    <div className="flex justify-end items-center gap-2">
                      {!readOnly ? (
                        <>
                          <Button variant="outline" size="sm" className="h-8" onClick={() => openEdit(t)}>
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" className="h-8" onClick={() => openMatch(t)}>
                            Match
                          </Button>
                          {t.matchedInvoice ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => clearMatch(t)}
                            >
                              Unmatch
                            </Button>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">Read-only</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Manual Input Dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="sm:max-w-3xl w-full">
          <DialogHeader>
            <DialogTitle>Input Manual Mutasi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>#Order (opsional)</Label>
                <Input
                  type="number"
                  placeholder="mis. 1"
                  value={manualOrderNo}
                  onChange={(e) => setManualOrderNo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Keterangan</Label>
                <Input
                  placeholder="mis. TRF DARI ... / BIAYA ADMIN"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Cabang</Label>
                <Input placeholder="mis. KCU ..." value={manualBranch} onChange={(e) => setManualBranch(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Jumlah (isi minus untuk debit)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="mis. -150000 atau 250000"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Saldo (opsional)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="mis. 10000000"
                  value={manualBalance}
                  onChange={(e) => setManualBalance(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice (opsional)</Label>
                <Input
                  placeholder="mis. INV-SO-..."
                  value={manualInvoice}
                  onChange={(e) => setManualInvoice(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setManualOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveManual} disabled={manualSaving || readOnly}>
                {manualSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Bank Mutation (.csv / .xlsx)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g., BCA - Operasional" />
              </div>
              <div className="space-y-2">
                <Label>Upload File</Label>
                <Input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFileSelected(f);
                  }}
                />
              </div>
            </div>

            {importError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
                <XCircle className="h-5 w-5 mt-0.5" />
                <div>{importError}</div>
              </div>
            )}

            {importRows.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Preview: <span className="font-semibold text-slate-900">{importRows.length}</span> rows (deduped within file)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={addCategory} disabled={readOnly}>
                      Add Category
                    </Button>
                    <Button onClick={doImport} disabled={importing}>
                      {importing ? "Importing..." : "Import"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-[#F8FAFC] sticky top-0">
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead>Cabang</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Check</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importRows.slice(0, 50).map((r, idx) => {
                        const ok = !!(r.txnDate && r.description && (r.debit > 0 || r.credit > 0));
                        const amount = (r.credit || 0) - (r.debit || 0);
                        const isOut = amount < 0;
                        const abs = Math.abs(amount);
                        return (
                          <TableRow key={idx}>
                            <TableCell className="text-slate-700">{r.orderNo ?? idx + 1}</TableCell>
                            <TableCell className="font-medium">{r.txnDate}</TableCell>
                            <TableCell className="max-w-[520px]">
                              <div className="line-clamp-2">{r.description}</div>
                            </TableCell>
                            <TableCell>{r.branch || "—"}</TableCell>
                            <TableCell className="text-right">
                              {amount === 0 ? (
                                "—"
                              ) : (
                                <span className={isOut ? "text-red-700" : "text-emerald-700"}>
                                  {`${isOut ? "-" : ""}Rp ${formatIDR(abs)}`}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{r.balance != null ? `Rp ${formatIDR(r.balance)}` : "—"}</TableCell>
                            <TableCell>{r.invoiceNumber || "—"}</TableCell>
                            <TableCell>
                              {ok ? (
                                <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
                                  <CheckCircle2 className="h-4 w-4" /> OK
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-orange-700 text-xs font-medium">
                                  <AlertTriangle className="h-4 w-4" /> Check
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {importRows.length > 50 && (
                  <div className="text-xs text-muted-foreground">Showing first 50 rows in preview.</div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditTxn(null);
        }}
      >
        <DialogContent className="sm:max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Description</div>
              <div className="text-sm font-medium text-slate-900">{editTxn?.description}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editStatus}
                  onValueChange={(v) => setEditStatus(v as Txn["status"])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNMATCHED">UNMATCHED</SelectItem>
                    <SelectItem value="MATCHED">MATCHED</SelectItem>
                    <SelectItem value="RECONCILED">RECONCILED</SelectItem>
                    <SelectItem value="IGNORED">IGNORED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editCategoryId} onValueChange={(v) => setEditCategoryId(v || "none")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {cats
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Optional notes..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveEdit} disabled={!editTxn}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Match Dialog */}
      <Dialog
        open={matchOpen}
        onOpenChange={(v) => {
          setMatchOpen(v);
          if (!v) setMatchTxn(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>Match Transaction to Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border bg-slate-50 p-3">
              <div className="text-xs text-muted-foreground">Transaction</div>
              <div className="text-sm font-medium text-slate-900">{matchTxn?.description}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Amount:{" "}
                <span className="font-semibold text-slate-900">
                  Rp {formatIDR(Math.max(matchTxn?.debit || 0, matchTxn?.credit || 0))}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Search invoice number (e.g., INV-SO-...)"
                value={invoiceQuery}
                onChange={(e) => setInvoiceQuery(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={() => runInvoiceSearch(invoiceQuery)}
                disabled={!invoiceQuery.trim() || invoiceLoading}
              >
                {invoiceLoading ? "Searching..." : "Search"}
              </Button>
            </div>

            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No results.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoiceResults.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>
                          {inv.type === "RECEIVABLE" ? (
                            <Badge variant="info">RECEIVABLE</Badge>
                          ) : (
                            <Badge variant="warning">PAYABLE</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">Rp {formatIDR(inv.amount)}</TableCell>
                        <TableCell>
                          {inv.status === "PAID" ? (
                            <Badge variant="success">PAID</Badge>
                          ) : inv.status === "PARTIALLY_PAID" ? (
                            <Badge variant="warning">PARTIAL</Badge>
                          ) : (
                            <Badge variant="error">UNPAID</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" className="h-8" onClick={() => selectInvoice(inv)}>
                            Select
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

