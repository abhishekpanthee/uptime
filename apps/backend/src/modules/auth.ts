import { Elysia, t } from 'elysia';
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import { eq } from 'drizzle-orm';
import { jwt } from '@elysiajs/jwt';

export const auth = new Elysia({ prefix: '/auth' })
    .use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET! }))

    .post('/register', async ({ body, set }) => {
        const hashedPassword = await Bun.password.hash(body.password);
        try {
            await db.insert(users).values({
                name: body.name,
                email: body.email,
                password: hashedPassword,
            });
            return { message: "User created" };
        } catch (e) {
            set.status = 400;
            return { error: "Email exists" };
        }
    }, {
        body: t.Object({ name: t.String(), email: t.String(), password: t.String() })
    })

    .post('/login', async ({ body, set, jwt }) => {
        const [user] = await db.select().from(users).where(eq(users.email, body.email));
        if (!user || !(await Bun.password.verify(body.password, user.password))) {
            set.status = 401;
            return { error: "Invalid credentials" };
        }

        const accessToken = await jwt.sign({ id: user.id });
        const refreshToken = crypto.randomUUID();
        
        await db.insert(refreshTokens).values({
            user_id: user.id,
            token: refreshToken,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        return { accessToken, refreshToken };
    }, {
        body: t.Object({ email: t.String(), password: t.String() })
    })

    .post('/logout', async ({ body }) => {
        await db.update(refreshTokens)
            .set({ revoked_at: new Date() })
            .where(eq(refreshTokens.token, body.refreshToken));
        return { message: "Logged out" };
    }, {
        body: t.Object({ refreshToken: t.String() })
    });