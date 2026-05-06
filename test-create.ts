import prisma from './src/lib/prisma'

async function main() {
  try {
    const data = {
      name: "Test Plywood",
      sku: "",
      type: "MR",
      thickness: "18mm",
      grade: "OVL",
      size: "1220x2440",
    }
    const skuValue = data.sku && data.sku.trim() !== "" ? data.sku.trim() : null;
    
    console.log("Inserting:", { ...data, sku: skuValue });
    const product = await prisma.product.create({
      data: {
        ...data,
        sku: skuValue
      },
    })
    console.log("Success:", product)
    
    // Cleanup
    await prisma.product.delete({ where: { id: product.id } })
  } catch (e) {
    console.error("Error:", e)
  } finally {
    process.exit(0)
  }
}
main()
