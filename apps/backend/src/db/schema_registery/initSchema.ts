import client from '../client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// readFileSync takes url from which dir the command is run not from this file so it needs to be absolute path
const user_schema = fs.readFileSync(path.join(__dirname, "../schemas/User.sql"), "utf8")
const  ownership_schema = fs.readFileSync(path.join(__dirname, "../schemas/Ownership.sql"), "utf8")
const analytics_schema = fs.readFileSync(path.join(__dirname, "../schemas/Analytics.sql"), "utf8")
const avgday_schema = fs.readFileSync(path.join(__dirname, "../schemas/AvgDay.sql"), "utf8")
const avghour_schema = fs.readFileSync(path.join(__dirname, "../schemas/AvgHour.sql"), "utf8")
const password_reset_schema = fs.readFileSync(path.join(__dirname, "../schemas/PasswordReset.sql"), "utf8")
const refresh_token_schema = fs.readFileSync(path.join(__dirname, "../schemas/RefreshToken.sql"), "utf8")



export async function registerDbSchema() {
  try{
        await client.unsafe(user_schema)
        await client.unsafe(ownership_schema)
        await client.unsafe(analytics_schema)
        await client.unsafe(avgday_schema)
        await client.unsafe(avghour_schema)
        await client.unsafe(password_reset_schema)
        await client.unsafe(refresh_token_schema)

        console.log("All schema registered successfully")

  } catch (error) {
    console.error("Error registering schema:", error)
  }
}
