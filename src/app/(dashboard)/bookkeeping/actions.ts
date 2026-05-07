"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { canEdit, hasAccess } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { BankTxnStatus, Prisma } from "@prisma/client";

type ImportRow = {
  orderNo?: number | null;
  txnDate: string; // ISO date string (YYYY-MM-DD)
  description: string;
  branch?: string | null;
  debit: number;
  credit: number;
  balance?: number | null;
  invoiceNumber?: string | null;
};

const DEFAULT_CATEGORIES = [
  "Sales Income",
  "Supplier Payment",
  "Shipping Cost",
  "Admin Fee",
  "Salary",
  "Tax",
  "Operational Expense",
] as const;

function normalizeText(s: string) {
  return (s || "").trim().replace(/\s+/g, " ");
}

function toNumber(n: unknown) {
  if (typeof n === "number" && Number.isFinite(n)) return n;
  if (typeof n === "string") {
    const cleaned = n.replace(/[^\d.-]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function computeFingerprint(r: ImportRow) {
  const base = [
    r.orderNo == null ? "" : String(r.orderNo),
    r.txnDate,
    normalizeText(r.description).toLowerCase(),
    r.branch == null ? "" : normalizeText(r.branch).toLowerCase(),
    String(Math.round(toNumber(r.debit) * 100) / 100),
    String(Math.round(toNumber(r.credit) * 100) / 100),
    r.balance == null ? "" : String(Math.round(toNumber(r.balance) * 100) / 100),
  ].join("|");
  return crypto.createHash("sha256").update(base).digest("hex");
}

function suggestCategory(description: string): string | null {
  const d = normalizeText(description).toLowerCase();
  if (!d) return null;
  if (/(fee|admin|biaya admin|adm)/.test(d)) return "Admin Fee";
  if (/(gaji|salary|payroll)/.test(d)) return "Salary";
  if (/(pajak|tax|ppn|pph)/.test(d)) return "Tax";
  if (/(ongkir|shipping|freight|logistics)/.test(d)) return "Shipping Cost";
  if (/(supplier|vendor|pabrik|manufactur)/.test(d)) return "Supplier Payment";
  if (/(invoice|inv|customer|buyer|pembayaran|payment)/.test(d)) return "Sales Income";
  return null;
}

function getBookkeepingDelegates() {
  const p = prisma as unknown as {
    bankCategory?: typeof prisma.bankCategory;
    bankImportBatch?: typeof prisma.bankImportBatch;
    bankTransaction?: typeof prisma.bankTransaction;
  };
  return {
    bankCategory: p.bankCategory,
    bankImportBatch: p.bankImportBatch,
    bankTransaction: p.bankTransaction,
    isReady: Boolean(p.bankCategory && p.bankImportBatch && p.bankTransaction),
  };
}

export async function getBookkeepingOverview() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "bookkeeping")) {
    throw new Error("Unauthorized");
  }

  const { bankCategory, bankImportBatch, isReady } = getBookkeepingDelegates();
  if (!isReady || !bankCategory || !bankImportBatch) {
    // Prevent 500 when Prisma client/database is not migrated yet.
    return { categories: [], latestBatches: [], setupRequired: true };
  }

  const [categories, latestBatches] = await Promise.all([
    bankCategory.findMany({ orderBy: { name: "asc" } }),
    bankImportBatch.findMany({
      orderBy: { importedAt: "desc" },
      take: 10,
    }),
  ]);

  return { categories, latestBatches, setupRequired: false };
}

export async function getBankTransactions(params?: {
  from?: string;
  to?: string;
  status?: string;
  q?: string;
  minAmount?: number;
  maxAmount?: number;
  onlyUnmatched?: boolean;
}) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "bookkeeping")) {
    throw new Error("Unauthorized");
  }

  const { bankTransaction, isReady } = getBookkeepingDelegates();
  if (!isReady || !bankTransaction) {
    return [];
  }

  const from = params?.from ? new Date(params.from) : undefined;
  const to = params?.to ? new Date(params.to) : undefined;
  const q = normalizeText(params?.q || "");

  const where: Prisma.BankTransactionWhereInput = {};
  if (from || to) {
    where.txnDate = {};
    if (from) where.txnDate.gte = from;
    if (to) where.txnDate.lte = to;
  }
  if (params?.status && params.status !== "all") {
    where.status = params.status as BankTxnStatus;
  }
  if (params?.onlyUnmatched) {
    where.status = "UNMATCHED";
  }
  if (q) {
    where.OR = [
      { description: { contains: q, mode: "insensitive" } },
      { matchedInvoice: { invoiceNumber: { contains: q, mode: "insensitive" } } },
    ];
  }

  const txns = await bankTransaction.findMany({
    where,
    include: {
      category: true,
      importBatch: true,
      matchedInvoice: true,
    },
    orderBy: [{ txnDate: "desc" }, { createdAt: "desc" }],
    take: 1000,
  });

  return txns;
}

export async function getInvoicesForMatching(q: string) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "bookkeeping")) {
    throw new Error("Unauthorized");
  }

  const query = normalizeText(q);
  if (!query) return [];

  return prisma.invoice.findMany({
    where: {
      invoiceNumber: { contains: query, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
}

export async function importBankMutation(data: {
  accountName: string;
  fileName: string;
  rows: ImportRow[];
}) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "bookkeeping")) {
    throw new Error("Unauthorized");
  }

  const { bankCategory, bankImportBatch, bankTransaction, isReady } =
    getBookkeepingDelegates();
  if (!isReady || !bankCategory || !bankImportBatch || !bankTransaction) {
    return {
      success: false,
      error:
        "Bookkeeping tables are not ready yet. Jalankan: npx prisma db push lalu restart dev server.",
    };
  }

  const accountName = normalizeText(data.accountName);
  if (!accountName) return { success: false, error: "Account name is required" };
  if (!data.rows?.length) return { success: false, error: "No rows to import" };

  const normalizedRows: ImportRow[] = data.rows
    .map((r) => ({
      orderNo: r.orderNo == null ? null : Number(r.orderNo) || null,
      txnDate: r.txnDate,
      description: normalizeText(r.description),
      branch: r.branch == null ? null : normalizeText(r.branch),
      debit: Math.max(0, toNumber(r.debit)),
      credit: Math.max(0, toNumber(r.credit)),
      balance: r.balance == null ? null : toNumber(r.balance),
      invoiceNumber: r.invoiceNumber == null ? null : normalizeText(r.invoiceNumber),
    }))
    .filter((r) => r.txnDate && r.description && (r.debit > 0 || r.credit > 0));

  const hashInput = JSON.stringify({
    accountName,
    fileName: data.fileName,
    rows: normalizedRows.map((r) => ({
      ...r,
      debit: Math.round(r.debit * 100) / 100,
      credit: Math.round(r.credit * 100) / 100,
      balance: r.balance == null ? null : Math.round(r.balance * 100) / 100,
    })),
  });
  const fileHash = crypto.createHash("sha256").update(hashInput).digest("hex");

  const existing = await bankImportBatch.findUnique({ where: { fileHash } });
  if (existing) {
    return { success: false, error: "Duplicate upload detected (same file/content already imported)." };
  }

  // Ensure default categories exist
  await prisma.$transaction(async (tx) => {
    for (const name of DEFAULT_CATEGORIES) {
      await tx.bankCategory.upsert({
        where: { name },
        update: {},
        create: { name, isSystem: true },
      });
    }
  });

  try {
    const batch = await bankImportBatch.create({
      data: {
        accountName,
        fileName: data.fileName,
        fileHash,
        createdById: session?.user?.id,
      },
    });

    const categories = await bankCategory.findMany();
    const categoryByName = new Map(categories.map((c) => [c.name, c.id]));

    let inserted = 0;
    let skipped = 0;

    // Insert one-by-one to allow per-row dedupe within batch
    for (const r of normalizedRows) {
      const fingerprint = computeFingerprint(r);
      const suggested = suggestCategory(r.description);
      const categoryId = suggested ? categoryByName.get(suggested) : undefined;
      const matchedInvoiceId = r.invoiceNumber
        ? (
            await prisma.invoice.findFirst({
              where: { invoiceNumber: r.invoiceNumber },
              select: { id: true },
            })
          )?.id
        : undefined;

      try {
        await bankTransaction.create({
          data: {
            importBatchId: batch.id,
            orderNo: r.orderNo ?? null,
            txnDate: new Date(r.txnDate),
            description: r.description,
            branch: r.branch ?? null,
            debit: r.debit,
            credit: r.credit,
            balance: r.balance ?? null,
            fingerprint,
            categoryId,
            matchedInvoiceId,
            status: matchedInvoiceId ? "MATCHED" : undefined,
          } as any,
        });
        inserted++;
      } catch {
        skipped++;
      }
    }

    revalidatePath("/bookkeeping");
    return { success: true, batchId: batch.id, inserted, skipped };
  } catch {
    return { success: false, error: "Failed to import bank mutation" };
  }
}

export async function updateTransaction(data: {
  id: string;
  categoryId?: string | null;
  notes?: string | null;
  status?: BankTxnStatus;
  matchedInvoiceId?: string | null;
}) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "bookkeeping")) {
    throw new Error("Unauthorized");
  }

  const { bankTransaction, isReady } = getBookkeepingDelegates();
  if (!isReady || !bankTransaction) {
    return {
      success: false,
      error:
        "Bookkeeping tables are not ready yet. Jalankan: npx prisma db push lalu restart dev server.",
    };
  }

  try {
    await bankTransaction.update({
      where: { id: data.id },
      data: {
        categoryId: data.categoryId === undefined ? undefined : data.categoryId,
        notes: data.notes === undefined ? undefined : data.notes,
        status: data.status ? data.status : undefined,
        matchedInvoiceId:
          data.matchedInvoiceId === undefined ? undefined : data.matchedInvoiceId,
      },
    });
    revalidatePath("/bookkeeping");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update transaction" };
  }
}

export async function createCategory(name: string) {
  const { bankCategory, isReady } = getBookkeepingDelegates();
  if (!isReady || !bankCategory) {
    return {
      success: false,
      error:
        "Bookkeeping tables are not ready yet. Jalankan: npx prisma db push lalu restart dev server.",
    };
  }

  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "bookkeeping")) {
    throw new Error("Unauthorized");
  }

  const n = normalizeText(name);
  if (!n) return { success: false, error: "Name is required" };

  try {
    await bankCategory.create({ data: { name: n } });
    revalidatePath("/bookkeeping");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to create category" };
  }
}

export async function createManualBankTransaction(data: {
  accountName?: string;
  orderNo?: number | null;
  txnDate: string; // YYYY-MM-DD
  description: string;
  branch?: string | null;
  amount: number; // positive = credit, negative = debit
  balance?: number | null;
  invoiceNumber?: string | null;
}) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "bookkeeping")) {
    throw new Error("Unauthorized");
  }

  const { bankImportBatch, bankTransaction, isReady } = getBookkeepingDelegates();
  if (!isReady || !bankImportBatch || !bankTransaction) {
    return {
      success: false,
      error:
        "Bookkeeping tables are not ready yet. Jalankan: npx prisma db push lalu restart dev server.",
    };
  }

  const accountName = normalizeText(data.accountName || "MANUAL");
  const txnDate = normalizeText(data.txnDate);
  const description = normalizeText(data.description);
  const branch = data.branch == null ? null : normalizeText(data.branch);
  const amount = toNumber(data.amount);
  const balance = data.balance == null ? null : toNumber(data.balance);
  const orderNo = data.orderNo == null ? null : Number(data.orderNo) || null;
  const invoiceNumber = data.invoiceNumber == null ? null : normalizeText(data.invoiceNumber);

  if (!txnDate) return { success: false, error: "Tanggal wajib diisi" };
  if (!description) return { success: false, error: "Keterangan wajib diisi" };
  if (!amount || !Number.isFinite(amount)) return { success: false, error: "Jumlah wajib diisi" };

  const debit = amount < 0 ? Math.abs(amount) : 0;
  const credit = amount > 0 ? amount : 0;

  const manualHash = crypto
    .createHash("sha256")
    .update(`manual|${accountName}`)
    .digest("hex");

  const batch =
    (await bankImportBatch.findUnique({ where: { fileHash: manualHash } })) ??
    (await bankImportBatch.create({
      data: {
        accountName,
        fileName: "Manual Entry",
        fileHash: manualHash,
        createdById: session?.user?.id,
      },
    }));

  const matchedInvoiceId = invoiceNumber
    ? (
        await prisma.invoice.findFirst({
          where: { invoiceNumber },
          select: { id: true },
        })
      )?.id
    : null;

  const fingerprint = computeFingerprint({
    orderNo,
    txnDate,
    description,
    branch,
    debit,
    credit,
    balance,
  });

  try {
    const created = await bankTransaction.create({
      data: {
        importBatchId: batch.id,
        orderNo,
        txnDate: new Date(txnDate),
        description,
        branch,
        debit,
        credit,
        balance,
        fingerprint,
        matchedInvoiceId: matchedInvoiceId ?? null,
        status: matchedInvoiceId ? "MATCHED" : "UNMATCHED",
      } as any,
      include: { category: true, importBatch: true, matchedInvoice: true },
    });
    revalidatePath("/bookkeeping");
    return { success: true, txn: created };
  } catch {
    return { success: false, error: "Gagal menambahkan transaksi" };
  }
}

export async function setTransactionChecked(data: { id: string; checked: boolean }) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const { bankTransaction, isReady } = getBookkeepingDelegates();
  if (!isReady || !bankTransaction) {
    return {
      success: false,
      error:
        "Bookkeeping tables are not ready yet. Jalankan: npx prisma db push lalu restart dev server.",
    };
  }

  try {
    await bankTransaction.update({
      where: { id: data.id },
      data: {
        adminChecked: data.checked,
        checkedAt: data.checked ? new Date() : null,
        checkedById: data.checked ? session?.user?.id : null,
      } as any,
    });
    revalidatePath("/bookkeeping");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update checklist" };
  }
}

