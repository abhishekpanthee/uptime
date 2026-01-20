import { cron } from '@elysiajs/cron';
import { db } from '../db';
import { ownership, analytics, averageHour } from '../db/schema';
import { sql, eq, and } from 'drizzle-orm';

export const monitorService = cron({
    name: 'uptime-check',
    pattern: '*/5 * * * *', // Every 5 minutes
    async run() {
        console.log('Running 5-minute check...');
        const sites = await db.select().from(ownership);

        // Parallel HTTP Requests
        await Promise.all(sites.map(async (site) => {
            const start = performance.now();
            let ping: number | null = null;
            try {
                const res = await fetch(site.website_url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
                if (res.ok) ping = Math.floor(performance.now() - start);
            } catch (e) { ping = null; }

            // Record raw ping
            await db.insert(analytics).values({
                website_url: site.website_url,
                ping5: ping
            });

            // Update Hourly Aggregate (If ping successful)
            if (ping !== null) {
                const now = new Date();
                const hourId = now.toISOString().slice(0, 13).replace(/[-T]/g, ''); // YYYYMMDDHH
                
                // Upsert Logic for Table 4.5
                await db.insert(averageHour)
                    .values({
                        website_url: site.website_url,
                        hour_id: hourId,
                        avg: ping,
                        sample_count: 1,
                        checked_at: now
                    })
                    .onConflictDoUpdate({
                        target: [averageHour.website_url, averageHour.hour_id],
                        set: {
                            // Calculate rolling average
                            avg: sql`(${averageHour.avg} * ${averageHour.sample_count} + ${ping}) / (${averageHour.sample_count} + 1)`,
                            sample_count: sql`${averageHour.sample_count} + 1`,
                            checked_at: now
                        }
                    });
            }
        }));
    }
});