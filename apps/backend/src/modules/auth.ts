import { Elysia, t } from 'elysia';
import { db } from '../db';
import { jwt } from '@elysiajs/jwt';

export const auth = new Elysia({ prefix: '/auth' })
    .use(jwt({ name: 'jwt', secret: Bun.env.JWT_SECRET! }))


    // register 
    .post('/register', async ({ body, set }) => {
        const hashedPassword = await Bun.password.hash(body.password);
        try {
            await db.from('users').insert({
                name: body.name,
                email: body.email,
                password: hashedPassword,
            })
            return { message: "User created" };
        } catch (e) {
            set.status = 400;
            return { error: "Email already exists" };
        }
    }, {
        body: t.Object({ name: t.String(), email: t.String(), password: t.String() })
    })


    // login
    .post('/login', async ({ body, set, jwt }) => {
        const {data:users,error} = await db
        .from('users')
        .select()
        .eq('email', body.email);

        if (error){throw error}
        const user = users?.[0];

        if (!user || !(await Bun.password.verify(body.password, user.password))) {
            set.status = 401;
            return { error: "Invalid credentials" };
        }

        const accessToken = await jwt.sign({ id: user.id });
        const refreshToken = crypto.randomUUID();
        
        const { error: refreshError } = await db
            .from('refresh_tokens')
            .insert({
            user_id: user.id,
            token: refreshToken,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        if (refreshError) {throw refreshError}
        return { accessToken, refreshToken };
    }, {
        body: t.Object({
            email: t.String(),
            password: t.String() })
    })

    // logout
    .post('/logout', async ({ body }) => {
        await db.from('refresh_tokens')
        .update({ revoked_at: new Date() })
        .eq('token', body.refreshToken);
        return { message: "Logged out" };
    }, {
        body: t.Object({ refreshToken: t.String() })
    });