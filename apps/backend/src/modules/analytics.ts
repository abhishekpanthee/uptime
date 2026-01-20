import { Elysia } from 'elysia';
import { db } from '../db';
import { analytics, ownership, averageHour } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

export const analyticsRoutes = new Elysia()
    
    // GET /api/status/:url
    .get('/status/:url', async ({ params }) => {
        const [last] = await db.select()
            .from(analytics)
            .where(eq(analytics.website_url, params.url))
            .orderBy(desc(analytics.checked_at))
            .limit(1);
        return last || { status: "unknown" };
    })

    // GET /api/analytics/:url
    .get('/analytics/:url', async ({ params }) => {
        return await db.select()
            .from(averageHour)
            .where(eq(averageHour.website_url, params.url))
            .orderBy(desc(averageHour.checked_at))
            .limit(24);
    })

    // GET /api/public/status
    .get('/public/status', async () => {
        return await db.select({
            url: ownership.website_url,
            status: analytics.ping5
        })
        .from(ownership)
        .leftJoin(analytics, eq(ownership.website_url, analytics.website_url))
        .where(eq(ownership.is_public, true))
        // Note: Real SQL would likely use DISTINCT ON or a subquery for latest status
    });