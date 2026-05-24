import { Elysia, t } from "elysia";
import { supabase } from "../db";
import {
  jwtConfig,
  extractBearerToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeAllUserTokens,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from "../middleware/auth";

export const auth = new Elysia({ prefix: "/auth" })
  .use(jwtConfig)

  .post("/register", async ({ body, jwt, set }) => {
    const { name, email, password } = body;

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
      .insert({ name, email, password: hashedPassword })
      .select("id, name, email")
      .single();

    if (error || !newUser) {
      set.status = 500;
      throw new Error(error?.message || "Failed to create account.");
    }

    const accessToken = await jwt.sign({ id: newUser.id });
    const refreshToken = await generateRefreshToken(newUser.id);

    return {
      message: "User registered successfully",
      token: accessToken,
      refreshToken,
      user: newUser,
    };
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 38 }),
      email: t.String({ format: "email" }),
      password: t.String({ minLength: 6, maxLength: 128 }),
    })
  })

  .post("/login", async ({ body, jwt, set }) => {
    const { email, password } = body;

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      set.status = 401;
      throw new Error("Invalid email or password");
    }

    const isMatch = await Bun.password.verify(password, user.password);

    if (!isMatch) {
      set.status = 401;
      throw new Error("Invalid email or password");
    }

    const accessToken = await jwt.sign({ id: user.id });
    const refreshToken = await generateRefreshToken(user.id);

    return {
      message: "Login successful",
      token: accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    })
  })

  .post("/refresh", async ({ body, jwt, set }) => {
    const result = await rotateRefreshToken(body.refreshToken);

    if (!result) {
      set.status = 401;
      return { error: "Invalid or expired refresh token" };
    }

    const accessToken = await jwt.sign({ id: result.userId });

    return {
      token: accessToken,
      refreshToken: result.newToken,
    };
  }, {
    body: t.Object({
      refreshToken: t.String(),
    })
  })

  .post("/logout", async ({ body, headers, jwt, set }) => {
    const token = extractBearerToken(headers);
    if (token) {
      const profile = await jwt.verify(token);
      if (profile) {
        await revokeAllUserTokens(Number(profile.id));
      }
    }
    return { message: "Logged out successfully" };
  })

  .post("/forgot-password", async ({ body, set }) => {
    const { email } = body;

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: "If that email exists, a reset link has been sent." };
    }

    const resetToken = await generatePasswordResetToken(user.id);

    // TODO: Send email with reset link containing resetToken
    // For now, log it (remove in production)
    console.log(`Password reset token for ${email}: ${resetToken}`);

    return { message: "If that email exists, a reset link has been sent." };
  }, {
    body: t.Object({
      email: t.String({ format: "email" }),
    })
  })

  .post("/reset-password", async ({ body, set }) => {
    const { token, newPassword } = body;

    const userId = await verifyPasswordResetToken(token);

    if (!userId) {
      set.status = 400;
      return { error: "Invalid or expired reset token" };
    }

    const hashedPassword = await Bun.password.hash(newPassword);

    const { error } = await supabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("id", userId);

    if (error) {
      set.status = 500;
      return { error: "Failed to update password" };
    }

    // Revoke all refresh tokens to force re-login
    await revokeAllUserTokens(userId);

    return { message: "Password reset successfully. Please log in again." };
  }, {
    body: t.Object({
      token: t.String(),
      newPassword: t.String({ minLength: 6, maxLength: 128 }),
    })
  })

  .get("/me", async ({ headers, jwt, set }) => {
    const token = extractBearerToken(headers);

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