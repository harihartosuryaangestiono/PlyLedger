import { parse } from 'pg-connection-string'
const config = parse(process.env.DATABASE_URL!)
console.log(config)
