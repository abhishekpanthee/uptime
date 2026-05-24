import { Elysia, t } from "elysia";
import { db } from "../db";
import { jwtConfig, extractBearerToken } from "../middleware/auth";
import { logAudit } from "./audit";
import crypto from "crypto";

const getUserId = async (headers: Record<string, string | undefined>, jwt: any) => {
  const token = extractBearerToken(headers);
  if (!token) return null;
  const profile = await jwt.verify(token);
  return profile ? Number(profile.id) : null;
};

// -- API Key Management --

export const apiKeys = new Elysia({ prefix: "/api-keys" })
  .use(jwtConfig)

  .get("/", async ({ headers, jwt, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("api_keys")
      .select("id, name, key_prefix, scopes, last_used_at, expires_at, created_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  })

  .post("/", async ({ headers, jwt, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    // Generate API key
    const rawKey = `um_${crypto.randomBytes(32).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.substring(0, 10);

    const { data, error } = await db.from("api_keys").insert({
      user_id: userId,
      name: body.name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes: body.scopes || ["read"],
      expires_at: body.expires_at || null,
    }).select("id, name, key_prefix, scopes, created_at").single();

    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(userId, "create", "api_key", String(data.id));

    // Return the raw key only on creation (it's never shown again)
    return { ...data, key: rawKey };
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 100 }),
      scopes: t.Optional(t.Array(t.String())),
      expires_at: t.Optional(t.String()),
    }),
  })

  .delete("/:id", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { error } = await db.from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("user_id", userId);

    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(userId, "revoke", "api_key", String(params.id));
    return { message: "API key revoked" };
  });

// -- API Key Auth Middleware --

export async function authenticateApiKey(request: Request): Promise<{ userId: number; scopes: string[] } | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer um_")) return null;

  const rawKey = authHeader.slice(7);
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const { data: apiKey } = await db.from("api_keys")
    .select("id, user_id, scopes, expires_at, revoked_at")
    .eq("key_hash", keyHash)
    .single();

  if (!apiKey || apiKey.revoked_at) return null;
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) return null;

  // Update last used
  await db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", apiKey.id);

  return { userId: apiKey.user_id, scopes: apiKey.scopes };
}
