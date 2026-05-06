import { Pool } from 'pg'
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  try {
    const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'Product';`)
    console.log(res.rows)
  } catch (e) {
    console.error(e)
  } finally {
    await pool.end()
  }
}
main()
