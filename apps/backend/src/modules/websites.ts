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
        
        const { data, error } = await db.from('ownership').select('*').eq('owner_id', userId);
        if (error) { set.status = 500; throw error; }
        
        return data;
    })

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
            is_public: t.Optional(t.Boolean()) 
        })
    })

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
    });