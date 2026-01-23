import { Elysia } from "elysia";
import { db } from "../db";

export const monitorService = new Elysia({ name: "monitor-service" })
  .onStart(async () => {
    console.log("Monitor Service Started. Waiting 5 seconds for first check...");
    setTimeout(runCheck, 5000);
    setInterval(runCheck, 60000);
  });

async function runCheck() {
  console.log("Starting 1-minute check...");

  try {
    const { data: sites, error: fetchError } = await db
      .from("ownership")
      .select("*");

    if (fetchError) throw fetchError;

    console.log(`Found ${sites?.length || 0} websites.`);

    if (!sites || sites.length === 0) return;

    for (const site of sites) {
      const start = performance.now();
      let status = 0;
      let ping: number | null = null;

      try {
        console.log(`Pinging ${site.website_url}...`);
        const res = await fetch(site.website_url, {
          method: "HEAD",
          signal: AbortSignal.timeout(10000),
        });

        status = res.status;
        const end = performance.now();
        ping = Math.round(end - start);

        console.log(`Status: ${status}, Ping: ${ping}ms`);
      } catch (err: any) {
        console.log(`Failed: ${err.message}`);
        status = 0;
        ping = null;
      }

      try {
        const { error: insertError } = await db
          .from("analytics")
          .insert(
            {
              website_url: site.website_url,
              ping5: ping,
              status,
              checked_at: new Date().toISOString(),
            },
          );

        if (insertError) throw insertError;

        console.log(`Saved result for ${site.website_url}`);
      } catch (dbErr: any) {
        console.error(`DB save failed:`, dbErr.message);
      }
    }
  } catch (error) {
    console.error("Monitor error:", error);
  }

}
