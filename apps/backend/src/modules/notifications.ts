import { Elysia, t } from "elysia";
import { db } from "../db";
import { jwtConfig, extractBearerToken } from "../middleware/auth";
import {
  sendEmail,
  alertDownEmail,
  alertRecoveryEmail,
  incidentUpdateEmail,
  maintenanceNoticeEmail,
  subscriberVerificationEmail,
} from "../services/email";
import { registerJobHandler, enqueueJob } from "../services/queue";
import { logAudit } from "./audit";
import crypto from "crypto";

const getUserId = async (headers: Record<string, string | undefined>, jwt: any) => {
  const token = extractBearerToken(headers);
  if (!token) return null;
  const profile = await jwt.verify(token);
  return profile ? Number(profile.id) : null;
};

// -- Notification Channel CRUD --

export const notifications = new Elysia({ prefix: "/notifications" })
  .use(jwtConfig)

  // List channels
  .get("/channels", async ({ headers, jwt, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("notification_channels").select("*").order("created_at", { ascending: false });
    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  })

  // Create channel
  .post("/channels", async ({ headers, jwt, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("notification_channels").insert({
      name: body.name,
      type: body.type,
      config: body.config,
    }).select().single();

    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(userId, "create", "notification_channel", String(data.id));
    return data;
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 100 }),
      type: t.Union([t.Literal("discord"), t.Literal("email")]),
      config: t.Object({}, { additionalProperties: true }),
    }),
  })

  // Update channel
  .patch("/channels/:id", async ({ headers, jwt, params, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("notification_channels")
      .update({ name: body.name, config: body.config })
      .eq("id", params.id).select().single();

    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(userId, "update", "notification_channel", String(params.id));
    return data;
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      config: t.Optional(t.Object({}, { additionalProperties: true })),
    }),
  })

  // Delete channel
  .delete("/channels/:id", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { error } = await db.from("notification_channels").delete().eq("id", params.id);
    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(userId, "delete", "notification_channel", String(params.id));
    return { message: "Channel deleted" };
  })

  // Test channel
  .post("/channels/:id/test", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data: channel } = await db.from("notification_channels").select("*").eq("id", params.id).single();
    if (!channel) { set.status = 404; return { error: "Channel not found" }; }

    const success = await sendToChannel(channel, {
      type: "test",
      title: "Test Notification",
      message: "This is a test notification from Uptime Monitor.",
      severity: "minor",
      timestamp: new Date().toISOString(),
    });

    if (success) {
      await db.from("notification_channels").update({ is_verified: true }).eq("id", params.id);
    }

    return { success };
  })

  // -- Alert Rules CRUD --

  .get("/rules", async ({ headers, jwt, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("alert_rules").select("*, notification_channels(name, type)").order("created_at", { ascending: false });
    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  })

  .post("/rules", async ({ headers, jwt, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("alert_rules").insert({
      monitor_url: body.monitor_url,
      channel_id: body.channel_id,
      on_down: body.on_down ?? true,
      on_degraded: body.on_degraded ?? false,
      on_recovery: body.on_recovery ?? true,
      on_ssl_expiry: body.on_ssl_expiry ?? false,
      ssl_expiry_threshold_days: body.ssl_expiry_threshold_days,
      quiet_hours_start: body.quiet_hours_start,
      quiet_hours_end: body.quiet_hours_end,
      repeat_interval_minutes: body.repeat_interval_minutes,
      escalation_level: body.escalation_level ?? 1,
    }).select().single();

    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(userId, "create", "alert_rule", String(data.id));
    return data;
  }, {
    body: t.Object({
      monitor_url: t.String(),
      channel_id: t.Number(),
      on_down: t.Optional(t.Boolean()),
      on_degraded: t.Optional(t.Boolean()),
      on_recovery: t.Optional(t.Boolean()),
      on_ssl_expiry: t.Optional(t.Boolean()),
      ssl_expiry_threshold_days: t.Optional(t.Number()),
      quiet_hours_start: t.Optional(t.String()),
      quiet_hours_end: t.Optional(t.String()),
      repeat_interval_minutes: t.Optional(t.Number()),
      escalation_level: t.Optional(t.Number()),
    }),
  })

  .delete("/rules/:id", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { error } = await db.from("alert_rules").delete().eq("id", params.id);
    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(userId, "delete", "alert_rule", String(params.id));
    return { message: "Rule deleted" };
  })

  // -- Alert History --

  .get("/history", async ({ headers, jwt, query, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const limit = Math.min(100, Number((query as any)?.limit) || 50);
    const { data, error } = await db.from("alert_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  })

  // Acknowledge alert
  .post("/history/:id/acknowledge", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("alert_history")
      .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: userId })
      .eq("id", params.id).select().single();

    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  })

  // -- Public Subscriber Endpoints --

  .post("/subscribe", async ({ body, set }) => {
    const { data: existing } = await db.from("subscribers")
      .select("id, verified, unsubscribed_at")
      .eq("email", body.email)
      .is("unsubscribed_at", null)
      .single();

    if (existing && existing.verified) {
      return { message: "Already subscribed" };
    }

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const unsubscribeToken = crypto.randomBytes(32).toString("hex");

    if (existing && !existing.verified) {
      await db.from("subscribers").update({ verify_token: verifyToken }).eq("id", existing.id);
    } else {
      await db.from("subscribers").insert({
        email: body.email,
        verify_token: verifyToken,
        unsubscribe_token: unsubscribeToken,
      });
    }

    const baseUrl = Bun.env.APP_URL || "http://localhost:3000";
    const emailData = subscriberVerificationEmail(`${baseUrl}/verify-subscription?token=${verifyToken}`);
    emailData.to = body.email;
    await sendEmail(emailData);

    return { message: "Verification email sent. Please check your inbox." };
  }, {
    body: t.Object({
      email: t.String({ format: "email" }),
    }),
  })

  .get("/verify", async ({ query, set }) => {
    const token = (query as any)?.token;
    if (!token) { set.status = 400; return { error: "Missing token" }; }

    const { data, error } = await db.from("subscribers")
      .update({ verified: true, verified_at: new Date().toISOString(), verify_token: null })
      .eq("verify_token", token)
      .select().single();

    if (error || !data) { set.status = 400; return { error: "Invalid or expired token" }; }
    return { message: "Subscription confirmed" };
  })

  .get("/unsubscribe", async ({ query, set }) => {
    const token = (query as any)?.token;
    if (!token) { set.status = 400; return { error: "Missing token" }; }

    const { error } = await db.from("subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("unsubscribe_token", token);

    if (error) { set.status = 400; return { error: "Invalid token" }; }
    return { message: "Unsubscribed successfully" };
  });

// -- Channel Delivery --

interface AlertEvent {
  type: string;
  title?: string;
  message?: string;
  severity?: string;
  monitorUrl?: string;
  monitorName?: string;
  statusCode?: number;
  ping?: number;
  timestamp?: string;
  [key: string]: unknown;
}

async function sendToChannel(channel: any, event: AlertEvent): Promise<boolean> {
  try {
    if (channel.type === "discord") {
      return await sendDiscordAlert(channel.config, event);
    }
    if (channel.type === "email") {
      return await sendEmailAlert(channel.config, event);
    }
    return false;
  } catch (err: any) {
    console.error(`[Alert] Failed to send via ${channel.type}:`, err.message);
    return false;
  }
}

async function sendDiscordAlert(config: any, event: AlertEvent): Promise<boolean> {
  const webhookUrl = config.webhook_url;
  if (!webhookUrl) return false;

  const colors: Record<string, number> = {
    down: 0xdc2626,
    recovery: 0x16a34a,
    degraded: 0xf59e0b,
    ssl_expiry: 0xf97316,
    test: 0x3b82f6,
    incident: 0xf97316,
    maintenance: 0x3b82f6,
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{
        title: event.title || `Monitor ${event.type}`,
        description: event.message || "",
        color: colors[event.type] || 0x6b7280,
        fields: [
          ...(event.monitorUrl ? [{ name: "URL", value: event.monitorUrl, inline: true }] : []),
          ...(event.statusCode ? [{ name: "Status", value: String(event.statusCode), inline: true }] : []),
          ...(event.ping ? [{ name: "Response Time", value: `${event.ping}ms`, inline: true }] : []),
        ],
        timestamp: event.timestamp || new Date().toISOString(),
      }],
    }),
  });

  return res.ok;
}

async function sendEmailAlert(config: any, event: AlertEvent): Promise<boolean> {
  const recipients = config.recipients || [];
  if (recipients.length === 0) return false;

  let emailData;
  switch (event.type) {
    case "down":
      emailData = alertDownEmail(event.monitorName || "", event.monitorUrl || "", event.statusCode || 0);
      break;
    case "recovery":
      emailData = alertRecoveryEmail(event.monitorName || "", event.monitorUrl || "", 0);
      break;
    case "incident":
      emailData = incidentUpdateEmail(event.title || "", String(event.severity || ""), event.message || "");
      break;
    default:
      emailData = { to: "", subject: `[${event.type.toUpperCase()}] ${event.title || "Alert"}`, html: `<p>${event.message || ""}</p>` };
  }

  emailData.to = recipients;
  return sendEmail(emailData);
}

// -- Job Handlers (registered at startup) --

export function registerAlertHandlers(): void {
  registerJobHandler("send_alert", async (data: any) => {
    const { type, monitorUrl, monitorName, statusCode, error: errMsg, ping, daysLeft, consecutiveFailures, threshold } = data;

    // Find all matching alert rules for this monitor
    const { data: rules } = await db.from("alert_rules")
      .select("*, notification_channels(*)")
      .eq("monitor_url", monitorUrl);

    if (!rules || rules.length === 0) return;

    for (const rule of rules) {
      // Check if this alert type is enabled
      if (type === "down" && !rule.on_down) continue;
      if (type === "degraded" && !rule.on_degraded) continue;
      if (type === "recovery" && !rule.on_recovery) continue;
      if (type === "ssl_expiry" && !rule.on_ssl_expiry) continue;

      // Check quiet hours
      if (rule.quiet_hours_start && rule.quiet_hours_end) {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const currentTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        if (currentTime >= rule.quiet_hours_start && currentTime <= rule.quiet_hours_end) {
          continue; // Skip during quiet hours
        }
      }

      // Check deduplication
      const { data: recent } = await db.from("alert_history")
        .select("id")
        .eq("monitor_url", monitorUrl)
        .eq("event_type", type)
        .gte("created_at", new Date(Date.now() - (rule.repeat_interval_minutes || 30) * 60000).toISOString())
        .limit(1);

      if (recent && recent.length > 0) continue;

      const channel = (rule as any).notification_channels;
      if (!channel) continue;

      const event: AlertEvent = {
        type,
        title: `${monitorName} - ${type.toUpperCase()}`,
        message: type === "down"
          ? `${monitorName} is not responding. Status: ${statusCode}${errMsg ? `. Error: ${errMsg}` : ""}`
          : type === "recovery"
          ? `${monitorName} has recovered after ${consecutiveFailures || 0} failed checks.`
          : type === "degraded"
          ? `${monitorName} is responding slowly (${ping}ms, threshold: ${threshold}ms).`
          : type === "ssl_expiry"
          ? `SSL certificate for ${monitorName} expires in ${daysLeft} days.`
          : `Alert for ${monitorName}`,
        monitorUrl,
        monitorName,
        statusCode,
        ping,
        severity: type === "down" ? "critical" : "minor",
        timestamp: new Date().toISOString(),
      };

      const success = await sendToChannel(channel, event);

      // Log alert history
      await db.from("alert_history").insert({
        alert_rule_id: rule.id,
        channel_id: channel.id,
        monitor_url: monitorUrl,
        event_type: type,
        status: success ? "sent" : "failed",
        message: event.message,
      });
    }
  });

  registerJobHandler("auto_incident", async (data: any) => {
    const { autoCreateIncident } = await import("./incidents");
    await autoCreateIncident(data.monitorUrl, data.monitorName, data.statusCode);
  });

  registerJobHandler("auto_resolve_incident", async (data: any) => {
    const { autoResolveIncident } = await import("./incidents");
    await autoResolveIncident(data.monitorUrl);
  });

  registerJobHandler("notify_subscribers", async (data: any) => {
    const { data: subscribers } = await db.from("subscribers")
      .select("email, unsubscribe_token")
      .eq("verified", true)
      .is("unsubscribed_at", null);

    if (!subscribers || subscribers.length === 0) return;

    const baseUrl = Bun.env.APP_URL || "http://localhost:3000";

    if (data.type === "incident_created" && data.incident) {
      const emailData = incidentUpdateEmail(data.incident.title, data.incident.status, "A new incident has been reported.");
      for (const sub of subscribers) {
        emailData.to = sub.email;
        emailData.html += `<p style="font-size:12px"><a href="${baseUrl}/unsubscribe?token=${sub.unsubscribe_token}">Unsubscribe</a></p>`;
        await sendEmail(emailData);
      }
    }

    if (data.type === "incident_updated" && data.update) {
      const emailData = incidentUpdateEmail("Incident Update", data.update.status, data.update.message);
      for (const sub of subscribers) {
        emailData.to = sub.email;
        emailData.html += `<p style="font-size:12px"><a href="${baseUrl}/unsubscribe?token=${sub.unsubscribe_token}">Unsubscribe</a></p>`;
        await sendEmail(emailData);
      }
    }
  });

  console.log("[Notifications] Alert handlers registered");
}
