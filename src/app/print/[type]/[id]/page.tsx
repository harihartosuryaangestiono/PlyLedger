import prisma from "@/lib/prisma";
import PrintClient from "./client";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ type: string, id: string }> }): Promise<Metadata> {
  const { type } = await params;
  const typeLabel = type.toUpperCase();
  return {
    title: `${typeLabel} Print`,
    description: "Printable transaction document",
  };
}

export default async function PrintPage({ params }: { params: Promise<{ type: string, id: string }> }) {
  const { type, id } = await params;
  let data: any = null;

  if (type === "invoice") {
    data = await prisma.invoice.findUnique({
      where: { id },
      include: {
        salesOrder: { include: { customer: true, items: { include: { product: true } } } },
        purchaseOrder: { include: { supplier: true, items: { include: { product: true } } } },
        payments: true
      }
    });
  } else if (type === "po") {
    data = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, items: { include: { product: true } } }
    });
  } else if (type === "so") {
    data = await prisma.salesOrder.findUnique({
      where: { id },
      include: { customer: true, items: { include: { product: true } } }
    });
  } else if (type === "shipment") {
    data = await prisma.shipment.findUnique({
      where: { id },
      include: { purchaseOrders: { include: { supplier: true } }, salesOrders: { include: { customer: true } } }
    });
  }

  if (!data) return notFound();

  return <PrintClient type={type} data={data} />;
}
