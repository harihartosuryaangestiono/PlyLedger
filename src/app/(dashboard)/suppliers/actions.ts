"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSuppliers() {
  try {
    return await prisma.supplier.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch suppliers:", error);
    return [];
  }
}

export async function createSupplier(data: { name: string; contactPerson: string; email: string; phone: string; address: string; }) {
  try {
    await prisma.supplier.create({
      data,
    });
    revalidatePath("/suppliers");
    return { success: true };
  } catch (error) {
    console.error("Failed to create supplier:", error);
    return { success: false, error: "Failed to create supplier" };
  }
}

export async function deleteSupplier(id: string) {
  try {
    await prisma.supplier.delete({
      where: { id },
    });
    revalidatePath("/suppliers");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete supplier" };
  }
}
