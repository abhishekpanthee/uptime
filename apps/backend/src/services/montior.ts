import { Elysia } from "elysia";
import { db } from "../db";
import https from "https";
import tls from "node:tls";

const FAILED_CHECK_PING_MS = 10000;

function checkSSL(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const target = new URL(url);
      
      if (target.protocol !== 'https:') {
        return resolve(null);
      }

      const socket = tls.connect({
        host: target.hostname,
        port: 443,
        servername: target.hostname,
        rejectUnauthorized: false,
      }, () => {
        const cert = socket.getPeerCertificate(true);
        
        if (!cert || Object.keys(cert).length === 0) {
          console.log(`   [SSL Debug][WARN] ${target.hostname}: Certificate is empty!`);
          socket.end();
          return resolve(null);
        }

        if (cert.valid_to) {
          const expiryDate = new Date(cert.valid_to);
          const daysLeft = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          socket.end();
          return resolve(daysLeft);
        } else {
          console.log(`   [SSL Debug][WARN] ${target.hostname}: No 'valid_to'. Available keys:`, Object.keys(cert));
          socket.end();
          return resolve(null);
        }
      });

      socket.on('error', (err) => {
        console.log(`   [SSL Debug][ERROR] ${target.hostname} Error: ${err.message}`);
        resolve(null);
      });

      socket.setTimeout(5000, () => {
        console.log(`   [SSL Debug] ${target.hostname} Timeout`);
        socket.destroy();
        resolve(null);
      });

    } catch (err: any) {
      console.log(`   [SSL Debug][ERROR] Catch Error: ${err.message}`);
      resolve(null);
    }
  });
}

export const monitorService = new Elysia({ name: "monitor-service" })
  .onStart(async () => {
    console.log("Monitor Service Started! Running every 60 seconds...");
    setTimeout(runCheck, 5000);
    setInterval(runCheck, 60000);
  });

async function runCheck() {
  console.log("\n----------------------------------------");
  console.log("Starting 1-minute check...");

  try {
    const { data: sites, error: fetchError } = await db.from("ownership").select("*");

    if (fetchError) throw fetchError;
    console.log(`Found ${sites?.length || 0} websites to check.`);

    if (!sites || sites.length === 0) return;

    for (const site of sites) {
      const start = performance.now();
      let status = 0;
      let ping: number | null = null;
      let sslDays: number | null = null;

      try {
        console.log(`Pinging ${site.website_url}...`);

        const res = await fetch(site.website_url, {
          method: "HEAD",
          signal: AbortSignal.timeout(10000),
        });

        status = res.status;
        ping = Math.round(performance.now() - start);

        sslDays = await checkSSL(site.website_url);

        console.log(`   Status: ${status} | Ping: ${ping}ms | SSL: ${sslDays !== null ? sslDays + ' days left' : 'N/A'}`);
      } catch (err: any) {
        console.log(`   Failed: ${err.message}`);
        status = 0;
        ping = FAILED_CHECK_PING_MS;
      }

      await db.from("analytics").insert({
        website_url: site.website_url,
        ping5: ping,
        status,
        checked_at: new Date().toISOString(),
      });

      if (status !== 200) {
        const webhookUrl = Bun.env.DISCORD_WEBHOOK_URL;
        if (webhookUrl) {
          const name = site.site_name || site.website_url;
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              content: `**URGENT ALERT:** \`${name}\` is DOWN! \nStatus Code: ${status}\nTime: ${new Date().toLocaleTimeString()}` 
            })
          }).catch((err) => console.log("Webhook failed", err));
        }
      }

      if (sslDays !== null) {
        await db.from("ownership")
          .update({ ssl_days: sslDays })
          .eq("website_url", site.website_url);
      }
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error: cleanupError } = await db
      .from("analytics")
      .delete()
      .lt("checked_at", thirtyDaysAgo);
      
    if (!cleanupError) {
       console.log(" Routine database cleanup completed.");
    }

  } catch (error) {
    console.error("Monitor error:", error);
  }
}
