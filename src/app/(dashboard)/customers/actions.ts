"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCustomers() {
  try {
    return await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    return [];
  }
}

export async function createCustomer(data: { name: string; contactPerson: string; email: string; phone: string; address: string; }) {
  try {
    await prisma.customer.create({
      data,
    });
    revalidatePath("/customers");
    return { success: true };
  } catch (error) {
    console.error("Failed to create customer:", error);
    return { success: false, error: "Failed to create customer" };
  }
}

export async function deleteCustomer(id: string) {
  try {
    await prisma.customer.delete({
      where: { id },
    });
    revalidatePath("/customers");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete customer" };
  }
}
