import postgres from 'postgres'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// readFileSync takes url from which dir the command is run not from this file so it needs to be absolute path
const fullPath= path.join(__dirname, "../schemas/User.sql")
const user_sql = fs.readFileSync(fullPath, "utf8")

const client = postgres(process.env.AIVEN_DATABASE_URL!, {
  ssl: 'require'
})

export async function registerDbSchema() {
  await client.unsafe(user_sql)
  await client.end()
  console.log("User schema registered")
}
