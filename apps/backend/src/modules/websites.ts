import { Elysia, t } from 'elysia';
import { db } from '../db';
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
        
        return await db.from('ownership').select('*').eq('owner_id', userId);
    })


    // adding website 
    .post('/', async ({ headers, jwt, body, set }) => {
        const userId = await getUserId(headers, jwt);
        if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

        await db.from('ownership').insert({
            website_url: body.url,
            owner_id: userId,
            is_public: body.is_public
        });
        return { message: "Website added" };
    }, {
        body: t.Object({ url: t.String(), is_public: t.Boolean() })
    })

    // website is_public change 
    .put('/:url', async ({ headers, jwt, params, body, set }) => {
        const userId = await getUserId(headers, jwt);
        if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

        const {data,error} = await db.from('ownership')
            .update({ is_public: body.is_public })
            .eq('website_url', params.url)
            .eq('owner_id', userId)
            .select();
            
        return data?.[0] || { error: "Not found" };
    }, {
        body: t.Object({ is_public: t.Boolean() })
    })


    // delete website 
    .delete('/:url', async ({ headers, jwt, params, set }) => {
        const userId = await getUserId(headers, jwt);
        if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

        await db.from('ownership')
            .delete()
            .eq('website_url', params.url)
            .eq('owner_id', userId);
        return { message: "Deleted" };
    });