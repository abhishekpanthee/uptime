// import { Elysia, t } from 'elysia';
// import { db } from '../db';
// import { jwt } from '@elysiajs/jwt';

// export const auth = new Elysia({ prefix: '/auth' })
//     .use(jwt({ name: 'jwt', secret: Bun.env.JWT_SECRET! }))


//     // register 
//     .post('/register', async ({ body, set }) => {
//         const hashedPassword = await Bun.password.hash(body.password);
//         try {
//             await db.from('users').insert({
//                 name: body.name,
//                 email: body.email,
//                 password: hashedPassword,
//             })
//             return { message: "User created" };
//         } catch (e) {
//             set.status = 400;
//             return { error: "Email already exists" };
//         }
//     }, {
//         body: t.Object({ name: t.String(), email: t.String(), password: t.String() })
//     })


//     // login
//     .post('/login', async ({ body, set, jwt }) => {
//         const {data:users,error} = await db
//         .from('users')
//         .select()
//         .eq('email', body.email);

//         if (error){throw error}
//         const user = users?.[0];

//         if (!user || !(await Bun.password.verify(body.password, user.password))) {
//             set.status = 401;
//             return { error: "Invalid credentials" };
//         }

//         const accessToken = await jwt.sign({ id: user.id });
//         const refreshToken = crypto.randomUUID();
        
//         const { error: refreshError } = await db
//             .from('refresh_tokens')
//             .insert({
//             user_id: user.id,
//             token: refreshToken,
//             expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
//         })

//         if (refreshError) {throw refreshError}
//         return { accessToken, refreshToken };
//     }, {
//         body: t.Object({
//             email: t.String(),
//             password: t.String() })
//     })

//     // logout
//     .post('/logout', async ({ body }) => {
//         await db.from('refresh_tokens')
//         .update({ revoked_at: new Date() })
//         .eq('token', body.refreshToken);
//         return { message: "Logged out" };
//     }, {
//         body: t.Object({ refreshToken: t.String() })
//     });

import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { supabase } from "../db";

// Reusable JWT Config
const jwtConfig = jwt({
  name: "jwt",
  secret: process.env.JWT_SECRET || "fallback-secret-key-change-me",
});

export const auth = new Elysia({ prefix: "/auth" })
  .use(jwtConfig)

  // POST /api/auth/register
  .post("/register", async ({ body, jwt, set }) => {
    const { name, email, password } = body;

    console.log(`👤 Attempting to register user: ${email}`);

    // 1. Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      set.status = 400;
      throw new Error("Email is already in use.");
    }

    // 2. Hash Password (using Bun's lightning-fast native hasher)
    const hashedPassword = await Bun.password.hash(password);

    // 3. Save User to Supabase
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        name,
        email,
        password: hashedPassword,
      })
      .select("id, name, email") // Return these fields after insert
      .single();

    if (error || !newUser) {
      console.error("DB Insert Error:", error);
      set.status = 500;
      throw new Error(error?.message || "Failed to create account.");
    }

    // 4. Generate JWT Token
    const token = await jwt.sign({ id: newUser.id });

    return {
      message: "User registered successfully",
      token,
      user: newUser,
    };
  }, {
    body: t.Object({
      name: t.String(),
      email: t.String({ format: "email" }),
      password: t.String({ minLength: 6 }),
    })
  })

  // POST /api/auth/login
  .post("/login", async ({ body, jwt, set }) => {
    const { email, password } = body;

    console.log(`\n🔐 Login attempt for: ${email}`);

    // 1. Find user by email
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      console.log("❌ ERROR: Could not find user in database.", error?.message);
      set.status = 401;
      throw new Error("Invalid email or password");
    }

    console.log("✅ User found in DB. Verifying password...");

    // 2. Verify Password
    const isMatch = await Bun.password.verify(password, user.password);
    
    if (!isMatch) {
      console.log("❌ ERROR: Password did not match the hash!");
      set.status = 401;
      throw new Error("Invalid email or password");
    }

    console.log("✅ Password matched! Generating token...");

    // 3. Generate JWT Token
    const token = await jwt.sign({ id: user.id });

    return {
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String()
    })  })

  // GET /api/auth/me - Get current user profile
  .get("/me", async ({ headers, jwt, set }) => {
    const auth = headers['authorization'];
    const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
    
    if (!token) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const profile = await jwt.verify(token);
    if (!profile) {
      set.status = 401;
      return { error: "Invalid token" };
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", profile.id)
      .single();

    if (error || !user) {
      set.status = 404;
      return { error: "User not found" };
    }

    return { user };  })

  // GET /api/auth/me - Get current user profile
  .get("/me", async ({ headers, jwt, set }) => {
    const auth = headers['authorization'];
    const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
    
    if (!token) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const profile = await jwt.verify(token);
    if (!profile) {
      set.status = 401;
      return { error: "Invalid token" };
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", profile.id)
      .single();

    if (error || !user) {
      set.status = 404;
      return { error: "User not found" };
    }

    return { user };
  });