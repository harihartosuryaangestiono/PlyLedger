"use server";

import prisma from "@/lib/prisma";

export async function getJournalEntries() {
  try {
    return await prisma.journalEntry.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch journal entries:", error);
    return [];
  }
}

export async function getAuditLogs() {
  try {
    return await prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return [];
  }
}
