import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { supabase } from "../db";
import crypto from "crypto";

const jwtConfig = jwt({
  name: "jwt",
  secret: process.env.JWT_SECRET || "fallback-secret-key-change-me",
  exp: "15m",
});

const refreshJwtConfig = jwt({
  name: "refreshJwt",
  secret: (process.env.JWT_SECRET || "fallback-secret-key-change-me") + "-refresh",
  exp: "7d",
});

export function extractBearerToken(headers: Record<string, string | undefined>): string | null {
  const auth = headers["authorization"];
  return auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

export async function generateRefreshToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(64).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await supabase.from("refresh_tokens").insert({
    user_id: userId,
    token,
    expires_at: expiresAt.toISOString(),
  });

  return token;
}

export async function rotateRefreshToken(oldToken: string): Promise<{ userId: number; newToken: string } | null> {
  const { data: existing } = await supabase
    .from("refresh_tokens")
    .select("id, user_id, expires_at, revoked_at")
    .eq("token", oldToken)
    .single();

  if (!existing || existing.revoked_at) return null;
  if (new Date(existing.expires_at) < new Date()) return null;

  // Revoke the old token
  await supabase
    .from("refresh_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", existing.id);

  // Issue new refresh token
  const newToken = await generateRefreshToken(existing.user_id);
  return { userId: existing.user_id, newToken };
}

export async function revokeAllUserTokens(userId: number): Promise<void> {
  await supabase
    .from("refresh_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("revoked_at", null);
}

export async function generatePasswordResetToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await supabase.from("password_reset_tokens").insert({
    user_id: userId,
    token,
    expires_at: expiresAt.toISOString(),
  });

  return token;
}

export async function verifyPasswordResetToken(token: string): Promise<number | null> {
  const { data } = await supabase
    .from("password_reset_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token", token)
    .single();

  if (!data || data.used_at) return null;
  if (new Date(data.expires_at) < new Date()) return null;

  // Mark as used
  await supabase
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);

  return data.user_id;
}

export { jwtConfig, refreshJwtConfig };
