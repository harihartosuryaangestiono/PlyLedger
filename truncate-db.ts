import { Client } from 'pg'

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })
  try {
    await client.connect()
    console.log("Truncating tables...")
    const query = `
      TRUNCATE TABLE "ActivityLog", "Payment", "Invoice", "Shipment", "SalesItem", "SalesOrder", "PurchaseItem", "PurchaseOrder", "Product", "Customer", "Supplier", "ExchangeRateSnapshot" CASCADE;
    `
    await client.query(query)
    console.log("Successfully truncated all business tables.")
  } catch (e) {
    console.error("Error truncating:", e)
  } finally {
    await client.end()
    process.exit(0)
  }
}
main()
