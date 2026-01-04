import client from "./db/client.js"
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const migrationFilesPath= path.join(__dirname, "./db/migrations")
const migrationFiles = fs.readdirSync(migrationFilesPath).sort();

export async function runMigrations() {
   for (const file of migrationFiles) {
     const filePath = path.join(migrationFilesPath, file);
     const sql = fs.readFileSync(filePath, "utf8");
     try {
       await client.unsafe(sql);
     }
     catch (error) {
       console.error(`Error running migration ${file}:`, error);
       throw error; 
     }
    }
}
