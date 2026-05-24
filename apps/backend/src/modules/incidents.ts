import { Elysia, t } from "elysia";
import { db } from "../db";
import { jwtConfig, extractBearerToken } from "../middleware/auth";
import { broadcastEvent } from "../services/websocket";
import { enqueueJob } from "../services/queue";
import { logAudit } from "./audit";

const getUserId = async (headers: Record<string, string | undefined>, jwt: any) => {
  const token = extractBearerToken(headers);
  if (!token) return null;
  const profile = await jwt.verify(token);
  return profile ? Number(profile.id) : null;
};

export const incidents = new Elysia({ prefix: "/incidents" })
  .use(jwtConfig)

  // List incidents
  .get("/", async ({ headers, jwt, query, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const statusFilter = (query as any)?.status;
    const severityFilter = (query as any)?.severity;
    const page = Math.max(1, Number((query as any)?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number((query as any)?.limit) || 20));
    const offset = (page - 1) * limit;

    let q = db.from("incidents").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    if (statusFilter) q = q.eq("status", statusFilter);
    if (severityFilter) q = q.eq("severity", severityFilter);

    const { data, error, count } = await q;
    if (error) { set.status = 500; return { error: error.message }; }

    return { incidents: data, total: count, page, limit };
  })

  // Get single incident with updates and affected monitors
  .get("/:id", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data: incident, error } = await db.from("incidents").select("*").eq("id", params.id).single();
    if (error || !incident) { set.status = 404; return { error: "Incident not found" }; }

    const { data: updates } = await db.from("incident_updates").select("*").eq("incident_id", params.id).order("created_at", { ascending: true });
    const { data: monitors } = await db.from("incident_monitors").select("monitor_url").eq("incident_id", params.id);

    return {
      ...incident,
      updates: updates || [],
      affected_monitors: monitors?.map((m: any) => m.monitor_url) || [],
    };
  })

  // Create incident
  .post("/", async ({ headers, jwt, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data: incident, error } = await db.from("incidents").insert({
      title: body.title,
      status: body.status || "investigating",
      severity: body.severity || "major",
      created_by: userId,
      auto_generated: false,
    }).select().single();

    if (error || !incident) { set.status = 500; return { error: error?.message || "Failed to create incident" }; }

    // Link affected monitors
    if (body.monitor_urls && body.monitor_urls.length > 0) {
      const links = body.monitor_urls.map((url: string) => ({
        incident_id: incident.id,
        monitor_url: url,
      }));
      await db.from("incident_monitors").insert(links);
    }

    // Create initial update
    await db.from("incident_updates").insert({
      incident_id: incident.id,
      status: body.status || "investigating",
      message: body.message || `Incident created: ${body.title}`,
      created_by: userId,
    });

    broadcastEvent("incident:created", incident);
    enqueueJob("notify_subscribers", { type: "incident_created", incident });
    logAudit(userId, "create", "incident", String(incident.id), { title: body.title });

    return incident;
  }, {
    body: t.Object({
      title: t.String({ minLength: 1, maxLength: 255 }),
      status: t.Optional(t.String()),
      severity: t.Optional(t.String()),
      message: t.Optional(t.String()),
      monitor_urls: t.Optional(t.Array(t.String())),
    }),
  })

  // Post update to incident
  .post("/:id/updates", async ({ headers, jwt, params, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data: incident } = await db.from("incidents").select("id, status").eq("id", params.id).single();
    if (!incident) { set.status = 404; return { error: "Incident not found" }; }

    // Insert update
    const { data: update, error } = await db.from("incident_updates").insert({
      incident_id: Number(params.id),
      status: body.status,
      message: body.message,
      created_by: userId,
    }).select().single();

    if (error) { set.status = 500; return { error: error.message }; }

    // Update incident status
    const updateData: any = { status: body.status, updated_at: new Date().toISOString() };
    if (body.status === "resolved") {
      updateData.resolved_at = new Date().toISOString();
    }
    await db.from("incidents").update(updateData).eq("id", params.id);

    broadcastEvent("incident:update", { incidentId: params.id, update });
    enqueueJob("notify_subscribers", { type: "incident_updated", incidentId: params.id, update });
    logAudit(userId, "update", "incident", String(params.id), { status: body.status });

    return update;
  }, {
    body: t.Object({
      status: t.String(),
      message: t.String({ minLength: 1 }),
    }),
  })

  // Update incident
  .patch("/:id", async ({ headers, jwt, params, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (body.title) updateData.title = body.title;
    if (body.severity) updateData.severity = body.severity;
    if (body.status) {
      updateData.status = body.status;
      if (body.status === "resolved") updateData.resolved_at = new Date().toISOString();
    }

    const { data, error } = await db.from("incidents").update(updateData).eq("id", params.id).select().single();
    if (error) { set.status = 500; return { error: error.message }; }

    logAudit(userId, "update", "incident", String(params.id), updateData);
    return data;
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      status: t.Optional(t.String()),
      severity: t.Optional(t.String()),
    }),
  })

  // Delete incident
  .delete("/:id", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { error } = await db.from("incidents").delete().eq("id", params.id);
    if (error) { set.status = 500; return { error: error.message }; }

    logAudit(userId, "delete", "incident", String(params.id));
    return { message: "Incident deleted" };
  });

// Auto-incident creation from monitor engine
export async function autoCreateIncident(monitorUrl: string, monitorName: string, statusCode: number): Promise<void> {
  // Check for existing open incident for this monitor
  const { data: existing } = await db
    .from("incident_monitors")
    .select("incident_id, incidents!inner(id, status)")
    .eq("monitor_url", monitorUrl)
    .in("incidents.status", ["investigating", "identified", "monitoring"]);

  if (existing && existing.length > 0) {
    // Add update to existing incident instead of creating new one
    const incidentId = (existing[0] as any).incident_id;
    await db.from("incident_updates").insert({
      incident_id: incidentId,
      status: "investigating",
      message: `Monitor check failed again. Status code: ${statusCode}`,
    });
    return;
  }

  // Create new incident
  const { data: incident } = await db.from("incidents").insert({
    title: `${monitorName} is down`,
    status: "investigating",
    severity: "major",
    auto_generated: true,
  }).select().single();

  if (!incident) return;

  await db.from("incident_monitors").insert({
    incident_id: incident.id,
    monitor_url: monitorUrl,
  });

  await db.from("incident_updates").insert({
    incident_id: incident.id,
    status: "investigating",
    message: `Automatically detected: ${monitorName} is not responding. Status code: ${statusCode}`,
  });

  broadcastEvent("incident:created", incident);
  enqueueJob("notify_subscribers", { type: "incident_created", incident });
}

// Auto-resolve when monitor recovers
export async function autoResolveIncident(monitorUrl: string): Promise<void> {
  const { data: linked } = await db
    .from("incident_monitors")
    .select("incident_id")
    .eq("monitor_url", monitorUrl);

  if (!linked) return;

  for (const link of linked) {
    const { data: incident } = await db
      .from("incidents")
      .select("id, status, auto_generated")
      .eq("id", link.incident_id)
      .single();

    if (!incident || incident.status === "resolved") continue;

    // Only auto-resolve auto-generated incidents
    if (!incident.auto_generated) continue;

    // Check if all linked monitors are up
    const { data: allLinked } = await db
      .from("incident_monitors")
      .select("monitor_url")
      .eq("incident_id", incident.id);

    if (!allLinked) continue;

    const { data: monitors } = await db
      .from("ownership")
      .select("website_url, last_check_status")
      .in("website_url", allLinked.map((l: any) => l.monitor_url));

    const allUp = monitors?.every((m: any) => m.last_check_status === "up");
    if (!allUp) continue;

    await db.from("incidents").update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", incident.id);

    await db.from("incident_updates").insert({
      incident_id: incident.id,
      status: "resolved",
      message: "All affected monitors have recovered. Incident auto-resolved.",
    });

    broadcastEvent("incident:resolved", { incidentId: incident.id });
    enqueueJob("notify_subscribers", { type: "incident_resolved", incidentId: incident.id });
  }
}
