// import { Elysia } from "elysia";
// import { db } from "../db";

// export const monitorService = new Elysia({ name: "monitor-service" })
//   .onStart(async () => {
//     console.log("Monitor Service Started. Waiting 5 seconds for first check...");
//     setTimeout(runCheck, 5000);
//     setInterval(runCheck, 60000);
//   });

// async function runCheck() {
//   try {
//     const { data: sites, error: fetchError } = await db
//       .from("ownership")
//       .select("*");

//     if (fetchError) throw fetchError;

//     if (!sites || sites.length === 0) return;

//     console.log(`Starting 1-minute check for ${sites.length} websites...`);

//     for (const site of sites) {
//       const start = performance.now();
//       let status = 0;
//       let ping: number | null = null;

//       try {
//         console.log(`Pinging ${site.website_url}...`);
//         const res = await fetch(site.website_url, {
//           method: "HEAD",
//           signal: AbortSignal.timeout(10000),
//         });

//         status = res.status;
//         const end = performance.now();
//         ping = Math.round(end - start);

//         console.log(`Status: ${status}, Ping: ${ping}ms`);
//       } catch (err: any) {
//         console.log(`Failed: ${err.message}`);
//         status = 0;
//         ping = null;
//       }

//       try {
//         const { error: insertError } = await db
//           .from("analytics")
//           .insert(
//             {
//               website_url: site.website_url,
//               ping5: ping,
//               status,
//               checked_at: new Date().toISOString(),
//             },
//           );

//         if (insertError) throw insertError;

//         console.log(`Saved result for ${site.website_url}`);
//       } catch (dbErr: any) {
//         console.error(`DB save failed:`, dbErr.message);
//       }
//     }
//   } catch (error) {
//     console.error("Monitor error:", error);
//   }

// }


import { Elysia } from "elysia";
import { db } from "../db";
import https from "https";
import tls from "node:tls";

// --- NEW FEATURE: SSL Checker ---
// This function reaches out to a server and reads its security certificate
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
          console.log(`   🟡 [SSL Debug] ${target.hostname}: Certificate is empty!`);
          socket.end();
          return resolve(null);
        }

        if (cert.valid_to) {
          const expiryDate = new Date(cert.valid_to);
          const daysLeft = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          socket.end();
          return resolve(daysLeft);
        } else {
          console.log(`   🟡 [SSL Debug] ${target.hostname}: No 'valid_to'. Available keys:`, Object.keys(cert));
          socket.end();
          return resolve(null);
        }
      });

      socket.on('error', (err) => {
        console.log(`   🔴 [SSL Debug] ${target.hostname} Error: ${err.message}`);
        resolve(null);
      });

      socket.setTimeout(5000, () => {
        console.log(`   ⏳ [SSL Debug] ${target.hostname} Timeout`);
        socket.destroy();
        resolve(null);
      });

    } catch (err: any) {
      console.log(`   💥 [SSL Debug] Catch Error: ${err.message}`);
      resolve(null);
    }
  });
}

export const monitorService = new Elysia({ name: "monitor-service" })
  .onStart(async () => {
    console.log("⏰ Monitor Service Started! Running every 60 seconds...");
    setTimeout(runCheck, 5000); // Run first check after 5 seconds
    setInterval(runCheck, 60000); // Then run every 60 seconds
  });

async function runCheck() {
  console.log("\n----------------------------------------");
  console.log("🔎 Starting 1-minute check...");

  try {
    const { data: sites, error: fetchError } = await db.from("ownership").select("*");

    if (fetchError) throw fetchError;
    console.log(`📡 Found ${sites?.length || 0} websites to check.`);

    if (!sites || sites.length === 0) return;

    for (const site of sites) {
      const start = performance.now();
      let status = 0;
      let ping: number | null = null;
      let sslDays: number | null = null;

      try {
        console.log(`🌍 Pinging ${site.website_url}...`);
        
        // 1. Check if the website is online (Standard Ping)
        const res = await fetch(site.website_url, {
          method: "HEAD",
          signal: AbortSignal.timeout(10000),
        });

        status = res.status;
        ping = Math.round(performance.now() - start);

        // 2. NEW: Check the SSL Certificate
        sslDays = await checkSSL(site.website_url);

        console.log(`   ✅ Status: ${status} | Ping: ${ping}ms | SSL: ${sslDays !== null ? sslDays + ' days left' : 'N/A'}`);
      } catch (err: any) {
        console.log(`   ❌ Failed: ${err.message}`);
        status = 0;
        ping = null;
      }

      // 3. Save the ping to Analytics table
      // 3. Save the ping to Analytics table
      await db.from("analytics").insert({
        website_url: site.website_url,
        ping5: ping,
        status,
        checked_at: new Date().toISOString(),
      });

      // --- NEW FEATURE 1: DISCORD/SLACK ALERTS ---
      // If the website goes down, fire off a webhook
      if (status !== 200) {
        const webhookUrl = Bun.env.DISCORD_WEBHOOK_URL;
        if (webhookUrl) {
          const name = site.site_name || site.website_url;
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              content: `🚨 **URGENT ALERT:** \`${name}\` is DOWN! \nStatus Code: ${status}\nTime: ${new Date().toLocaleTimeString()}` 
            })
          }).catch((err) => console.log("Webhook failed", err));
        }
      }

      // 4. Update the Ownership table with the latest SSL info
      if (sslDays !== null) {
        await db.from("ownership")
          .update({ ssl_days: sslDays })
          .eq("website_url", site.website_url);
      }
    } // <-- End of your existing for...of loop

    // --- NEW FEATURE 2: DATA RETENTION (CLEANUP) ---
    // After checking all sites, delete any ping data older than 30 days
    // This guarantees your PostgreSQL database will NEVER bloat or crash.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error: cleanupError } = await db
      .from("analytics")
      .delete()
      .lt("checked_at", thirtyDaysAgo);
      
    if (!cleanupError) {
       console.log("🧹 Routine database cleanup completed.");
    }

  } catch (error) {
    console.error("Monitor error:", error);
  }
}