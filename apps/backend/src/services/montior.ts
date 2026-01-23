import { Elysia } from "elysia";
import { db } from "../db";
import { ownership, analytics } from "../db/schema";
import { eq } from "drizzle-orm";

export const monitorService = new Elysia({ name: "monitor-service" })
  .onStart(async () => {
    console.log("Monitor Service Started. Waiting 10 seconds for first check...");
    setTimeout(runCheck, 5000);
    setInterval(runCheck, 60000);
  });

async function runCheck() {
  console.log("----------------------------------------");
  console.log("Starting 1-minute check...");
  
  try {
    const sites = await db.select().from(ownership);
    console.log(`Found ${sites.length} websites to check.`);

    if (sites.length === 0) {
      console.log("No websites found in database. Add one in the Dashboard.");
      return;
    }

    for (const site of sites) {
      const start = performance.now();
      let status = 0;
      let ping: number | null = null;

      try {
        console.log(`Pinging ${site.website_url}...`);
        const res = await fetch(site.website_url, { 
          method: "HEAD",
          signal: AbortSignal.timeout(10000) 
        });
        
        status = res.status;
        const end = performance.now();
        ping = Math.round(end - start);

        console.log(`Success. Status: ${status}, Ping: ${ping}ms`);
      } catch (err: any) {
        console.log(`Failed to reach ${site.website_url}: ${err.message}`);
        status = 0;
        ping = null;
      }

      try {
        await db.insert(analytics).values({
          website_url: site.website_url,
          ping5: ping,
        });
        console.log(`Saved result for ${site.website_url}`);
      } catch (dbErr: any) {
        console.error(`Database save failed:`, dbErr.message);
      }
    }
  } catch (error) {
    console.error("Critical monitor error:", error);
  }
  console.log("----------------------------------------");
}