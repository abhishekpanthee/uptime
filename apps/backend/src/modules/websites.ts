import { Elysia, t } from 'elysia';
import { db } from '../db';
import { jwt } from '@elysiajs/jwt';

// Helper to check the user's token
const getUserId = async (headers: any, jwt: any) => {
    const auth = headers['authorization'];
    const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return null;
    const profile = await jwt.verify(token);
    return profile ? profile.id : null;
};

export const websites = new Elysia({ prefix: '/websites' })
    .use(jwt({ name: 'jwt', secret: Bun.env.JWT_SECRET! }))

    // GET /websites - List all sites
    .get('/', async ({ headers, jwt, set }) => {
        const userId = await getUserId(headers, jwt);
        if (!userId) { set.status = 401; return { error: "Unauthorized" }; }
        
        const { data, error } = await db.from('ownership').select('*').eq('owner_id', userId);
        if (error) { set.status = 500; throw error; }
        
        return data;
    })
    
    // POST /websites - Add a new site
    .post('/', async ({ headers, jwt, body, set }) => {
        const userId = await getUserId(headers, jwt);
        if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

        const { data: existing } = await db.from('ownership')
            .select('*')
            .match({ owner_id: userId, website_url: body.url })
            .single();

        if (existing) {
            set.status = 409; 
            return { message: "You are already monitoring this website." };
        }

        const { error } = await db.from('ownership').insert({
            website_url: body.url,
            owner_id: userId,
            site_name: body.site_name || null,
            is_public: body.is_public ?? false 
        });

        if (error) {
            set.status = 422; 
            return { message: error.message };
        }

        return { message: "Website added" };
    }, {
        body: t.Object({ 
            url: t.String(), 
            site_name: t.Optional(t.String()),
            is_public: t.Optional(t.Boolean()) 
        })
    })

    // PUT /websites - Update public status (Legacy)
    .put('/', async ({ headers, jwt, body, set }) => {
        const userId = await getUserId(headers, jwt);
        if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

        const { data } = await db.from('ownership')
            .update({ is_public: body.is_public })
            .match({ website_url: body.url, owner_id: userId }) 
            .select();
            
        return data?.[0] || { error: "Not found" };
    }, {
        body: t.Object({ 
            url: t.String(),
            is_public: t.Boolean() 
        })
    })

    // DELETE /websites - Remove a site
    .delete('/', async ({ headers, jwt, body, set }) => {
        const userId = await getUserId(headers, jwt);
        if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

        const { error } = await db.from('ownership')
            .delete()
            .match({ website_url: body.url, owner_id: userId });

        if (error) { set.status = 500; return { error: error.message }; }

        return { message: "Deleted" };
    }, {
        body: t.Object({ url: t.String() })
    })

    // ==========================================
    // NEW ROUTES ADDED BELOW
    // ==========================================

    // GET /websites/:url/stats - Get dynamic chart data (1h, 24h, 7d, 30d)
    .get('/:url/stats', async ({ headers, jwt, params, query, set }) => {
        const userId = await getUserId(headers, jwt);
        if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

        const targetUrl = decodeURIComponent(params.url);
        const range = query.range || "24h";
        const timeAgo = new Date();

        if (range === "1h") timeAgo.setHours(timeAgo.getHours() - 1);
        else if (range === "7d") timeAgo.setDate(timeAgo.getDate() - 7);
        else if (range === "30d") timeAgo.setDate(timeAgo.getDate() - 30);
        else timeAgo.setHours(timeAgo.getHours() - 24); 

        const isoTimeAgo = timeAgo.toISOString();

        try {
            // 1. Verify the user actually owns this website
            const { data: siteInfo, error: siteError } = await db
                .from('ownership')
                .select('*')
                .match({ website_url: targetUrl, owner_id: userId })
                .single();

            if (siteError || !siteInfo) {
                set.status = 404;
                return { error: "Website not found or access denied" };
            }

            // 2. Fetch the pings strictly within the requested timeframe
            const { data: pings, error: pingError } = await db
                .from('analytics')
                .select('ping5, status, checked_at')
                .eq('website_url', targetUrl)
                .gte('checked_at', isoTimeAgo)
                .order('checked_at', { ascending: true });

            if (pingError) throw pingError;

            // 3. Calculate the Aggregates
            const totalChecks = pings?.length || 0;
            const successfulChecks = pings?.filter(p => p.status === 200).length || 0;
            
            const uptimePercentage = totalChecks > 0 
                ? ((successfulChecks / totalChecks) * 100).toFixed(2) 
                : "100.00";

            const pingsWithTime = pings?.filter(p => p.ping5 !== null) || [];
            const avgPing = pingsWithTime.length > 0 
                ? Math.round(pingsWithTime.reduce((acc, curr) => acc + curr.ping5!, 0) / pingsWithTime.length)
                : 0;

            // 4. Downsampling for charts (prevent browser freezing)
            let chartData = pings || [];
            if (chartData.length > 1500) {
                 const skipFactor = Math.ceil(chartData.length / 500); 
                 chartData = chartData.filter((_, index) => index % skipFactor === 0);
            }

            return {
                site: siteInfo,
                stats: {
                    range_requested: range,
                    uptime_percentage: parseFloat(uptimePercentage),
                    avg_ping: avgPing,
                    total_checks: totalChecks
                },
                history: chartData 
            };
        } catch (err: any) {
            set.status = 500;
            return { error: err.message };
        }
    })

    // PATCH /websites/:url/toggle-public - Toggle public visibility
    .patch('/:url/toggle-public', async ({ headers, jwt, params, body, set }) => {
        const userId = await getUserId(headers, jwt);
        if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

        const targetUrl = decodeURIComponent(params.url);
        
        try {
            const { data, error } = await db.from('ownership')
                .update({ is_public: body.is_public })
                .match({ website_url: targetUrl, owner_id: userId })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err: any) {
            set.status = 500;
            return { error: err.message };
        }
    }, {
        body: t.Object({
            is_public: t.Boolean()
        })
    });