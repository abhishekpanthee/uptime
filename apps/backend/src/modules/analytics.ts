import { Elysia } from 'elysia';
import { db } from '../db';
import { analytics, ownership } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export const analyticsRoutes = new Elysia()

    .get('/status/:url', async ({ params }) => {
        const decodedUrl = decodeURIComponent(params.url);
        const [last] = await db.select()
            .from(analytics)
            .where(eq(analytics.website_url, decodedUrl))
            .orderBy(desc(analytics.checked_at))
            .limit(1);
        return last || { status: 0, ping5: null };
    })

    .get('/analytics/:url', async ({ params }) => {
        const decodedUrl = decodeURIComponent(params.url);

        console.log(`Fetching raw history for: ${decodedUrl}`);

        return await db.select()
            .from(analytics)
            .where(eq(analytics.website_url, decodedUrl))
            .orderBy(desc(analytics.checked_at))
            .limit(50);
    })

    .get('/public/status', async () => {
        return await db.select()
            .from(ownership)
            .where(eq(ownership.is_public, true));
    });