import prisma from './src/lib/prisma'

async function main() {
  try {
    console.log("Truncating tables...")
    const query = `
      TRUNCATE TABLE "AuditLog", "JournalEntry", "Payment", "Invoice", "Shipment", "SalesItem", "SalesOrder", "PurchaseItem", "PurchaseOrder", "Product", "Customer", "Supplier", "ExchangeRateSnapshot" CASCADE;
    `
    await prisma.$executeRawUnsafe(query)
    console.log("Successfully truncated all business tables.")
  } catch (e) {
    console.error("Error truncating:", e)
  } finally {
    process.exit(0)
  }
}
main()
