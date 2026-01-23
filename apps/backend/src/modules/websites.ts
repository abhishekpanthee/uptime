import { Elysia, t } from 'elysia';
import { db } from '../db';
import { ownership } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { jwt } from '@elysiajs/jwt';

const getUserId = async (headers: any, jwt: any) => {
    const auth = headers['authorization'];
    const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return null;
    const profile = await jwt.verify(token);
    return profile ? profile.id : null;
};

export const websites = new Elysia({ prefix: '/websites' })
    .use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET! }))

    .get('/', async ({ headers, jwt, set }) => {
        const userId = await getUserId(headers, jwt);
        if (!userId) { set.status = 401; return { error: "Unauthorized" }; }
        
        return await db.select().from(ownership).where(eq(ownership.owner_id, userId));
    })

    .post('/', async ({ headers, jwt, body, set }) => {
        const userId = await getUserId(headers, jwt);
        if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

        await db.insert(ownership).values({
            website_url: body.url,
            owner_id: userId,
            is_public: body.is_public
        });
        return { message: "Website added" };
    }, {
        body: t.Object({ url: t.String(), is_public: t.Boolean() })
    })

    .put('/:url', async ({ headers, jwt, params, body, set }) => {
        const userId = await getUserId(headers, jwt);
        if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

        const [updated] = await db.update(ownership)
            .set({ is_public: body.is_public })
            .where(and(eq(ownership.website_url, params.url), eq(ownership.owner_id, userId)))
            .returning();
            
        return updated || { error: "Not found" };
    }, {
        body: t.Object({ is_public: t.Boolean() })
    })

    .delete('/:url', async ({ headers, jwt, params, set }) => {
        const userId = await getUserId(headers, jwt);
        if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

        await db.delete(ownership)
            .where(and(eq(ownership.website_url, params.url), eq(ownership.owner_id, userId)));
        return { message: "Deleted" };
    });