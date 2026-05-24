import { Elysia, t } from "elysia";
import { db } from "../db";
import { jwtConfig, extractBearerToken } from "../middleware/auth";
import { registerJobHandler, enqueueJob } from "../services/queue";
import { logAudit } from "./audit";
import crypto from "crypto";

const getUserId = async (headers: Record<string, string | undefined>, jwt: any) => {
  const token = extractBearerToken(headers);
  if (!token) return null;
  const profile = await jwt.verify(token);
  return profile ? Number(profile.id) : null;
};

export const webhookRoutes = new Elysia({ prefix: "/webhooks" })
  .use(jwtConfig)

  .get("/", async ({ headers, jwt, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("webhooks").select("*").order("created_at", { ascending: false });
    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  })

  .post("/", async ({ headers, jwt, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const secret = crypto.randomBytes(32).toString("hex");

    const { data, error } = await db.from("webhooks").insert({
      url: body.url,
      secret,
      events: body.events || ["monitor.down", "monitor.up"],
      is_active: true,
    }).select().single();

    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(userId, "create", "webhook", String(data.id));
    return { ...data, secret }; // Show secret only on creation
  }, {
    body: t.Object({
      url: t.String({ format: "uri" }),
      events: t.Optional(t.Array(t.String())),
    }),
  })

  .patch("/:id", async ({ headers, jwt, params, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const updateData: any = {};
    if (body.url) updateData.url = body.url;
    if (body.events) updateData.events = body.events;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data, error } = await db.from("webhooks").update(updateData).eq("id", params.id).select().single();
    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(userId, "update", "webhook", String(params.id));
    return data;
  }, {
    body: t.Object({
      url: t.Optional(t.String()),
      events: t.Optional(t.Array(t.String())),
      is_active: t.Optional(t.Boolean()),
    }),
  })

  .delete("/:id", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { error } = await db.from("webhooks").delete().eq("id", params.id);
    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(userId, "delete", "webhook", String(params.id));
    return { message: "Webhook deleted" };
  })

  // Get delivery log for a webhook
  .get("/:id/deliveries", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("webhook_deliveries")
      .select("*")
      .eq("webhook_id", params.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  })

  // Test webhook
  .post("/:id/test", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data: webhook } = await db.from("webhooks").select("*").eq("id", params.id).single();
    if (!webhook) { set.status = 404; return { error: "Webhook not found" }; }

    await deliverWebhook(webhook, "test", {
      message: "This is a test webhook delivery",
      timestamp: new Date().toISOString(),
    });

    return { message: "Test webhook sent" };
  });

// -- Webhook Delivery Engine --

async function deliverWebhook(webhook: any, event: string, payload: any): Promise<boolean> {
  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });

  // HMAC-SHA256 signature
  const signature = crypto
    .createHmac("sha256", webhook.secret)
    .update(body)
    .digest("hex");

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Event": event,
        "User-Agent": "UptimeMonitor-Webhook/1.0",
      },
      body,
      signal: AbortSignal.timeout(10000),
    });

    // Log delivery
    await db.from("webhook_deliveries").insert({
      webhook_id: webhook.id,
      event,
      payload,
      response_status: res.status,
      status: res.ok ? "sent" : "failed",
      attempts: 1,
    });

    return res.ok;
  } catch (err: any) {
    await db.from("webhook_deliveries").insert({
      webhook_id: webhook.id,
      event,
      payload,
      response_status: 0,
      response_body: err.message,
      status: "failed",
      attempts: 1,
    });
    return false;
  }
}

// Dispatch event to all matching webhooks
export async function dispatchWebhookEvent(event: string, payload: any): Promise<void> {
  const { data: webhooks } = await db.from("webhooks")
    .select("*")
    .eq("is_active", true);

  if (!webhooks) return;

  for (const webhook of webhooks) {
    const events: string[] = webhook.events || [];
    if (events.includes(event) || events.includes("*")) {
      enqueueJob("deliver_webhook", { webhookId: webhook.id, event, payload });
    }
  }
}

// Register webhook delivery job handler
export function registerWebhookHandlers(): void {
  registerJobHandler("deliver_webhook", async (data: any) => {
    const { data: webhook } = await db.from("webhooks").select("*").eq("id", data.webhookId).single();
    if (!webhook || !webhook.is_active) return;
    await deliverWebhook(webhook, data.event, data.payload);
  });

  console.log("[Webhooks] Handlers registered");
}
