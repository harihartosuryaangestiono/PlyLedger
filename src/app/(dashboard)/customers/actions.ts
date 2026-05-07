"use server";

import { canEdit, hasAccess } from "@/lib/permissions";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCustomers() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "customers")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

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
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "customers")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

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
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "customers")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

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

export async function updateCustomer(
  id: string,
  data: {
    name: string;
    contactPerson: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  }
) {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "customers")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
      },
    });

    revalidatePath("/customers");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update customer" };
  }
}
