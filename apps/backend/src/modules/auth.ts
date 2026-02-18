import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { supabase } from "../db";

const jwtConfig = jwt({
  name: "jwt",
  secret: process.env.JWT_SECRET || "fallback-secret-key-change-me",
});

export const auth = new Elysia({ prefix: "/auth" })
  .use(jwtConfig)

  .post("/register", async ({ body, jwt, set }) => {
    const { name, email, password } = body;

    console.log(`Attempting to register user: ${email}`);

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      set.status = 400;
      throw new Error("Email is already in use.");
    }

    const hashedPassword = await Bun.password.hash(password);

    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        name,
        email,
        password: hashedPassword,
      })
      .select("id, name, email")
      .single();

    if (error || !newUser) {
      console.error("DB Insert Error:", error);
      set.status = 500;
      throw new Error(error?.message || "Failed to create account.");
    }

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

  .post("/login", async ({ body, jwt, set }) => {
    const { email, password } = body;

    console.log(`\nLogin attempt for: ${email}`);

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      console.log("ERROR: Could not find user in database.", error?.message);
      set.status = 401;
      throw new Error("Invalid email or password");
    }

    console.log("User found in DB. Verifying password...");

    const isMatch = await Bun.password.verify(password, user.password);
    
    if (!isMatch) {
      console.log("ERROR: Password did not match the hash!");
      set.status = 401;
      throw new Error("Invalid email or password");
    }

    console.log("Password matched! Generating token...");

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
    })
  });