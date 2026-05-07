"use server";

import { canEdit, hasAccess } from "@/lib/permissions";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSuppliers() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!hasAccess(role, "suppliers")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

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
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "suppliers")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

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
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  if (!canEdit(role, "suppliers")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

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

export async function updateSupplier(
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
  if (!canEdit(role, "suppliers")) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }

  try {
    await prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
      },
    });

    revalidatePath("/suppliers");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update supplier" };
  }
}
