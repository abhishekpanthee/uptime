import { Elysia, t } from "elysia";
import { db } from "../db";
import { jwtConfig, extractBearerToken } from "../middleware/auth";
import { enqueueJob } from "../services/queue";
import { logAudit } from "./audit";

const getUserId = async (headers: Record<string, string | undefined>, jwt: any) => {
  const token = extractBearerToken(headers);
  if (!token) return null;
  const profile = await jwt.verify(token);
  return profile ? Number(profile.id) : null;
};

export const maintenance = new Elysia({ prefix: "/maintenance" })
  .use(jwtConfig)

  // List maintenance windows
  .get("/", async ({ headers, jwt, query, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const statusFilter = (query as any)?.status;
    let q = db.from("maintenance_windows").select("*").order("scheduled_start", { ascending: true });
    if (statusFilter) q = q.eq("status", statusFilter);

    const { data, error } = await q;
    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  })

  // Get single maintenance window
  .get("/:id", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data: mw } = await db.from("maintenance_windows").select("*").eq("id", params.id).single();
    if (!mw) { set.status = 404; return { error: "Not found" }; }

    const { data: monitors } = await db.from("maintenance_monitors").select("monitor_url").eq("maintenance_id", params.id);

    return { ...mw, affected_monitors: monitors?.map((m: any) => m.monitor_url) || [] };
  })

  // Create maintenance window
  .post("/", async ({ headers, jwt, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data: mw, error } = await db.from("maintenance_windows").insert({
      title: body.title,
      description: body.description,
      scheduled_start: body.scheduled_start,
      scheduled_end: body.scheduled_end,
      auto_complete: body.auto_complete ?? true,
      created_by: userId,
    }).select().single();

    if (error || !mw) { set.status = 500; return { error: error?.message || "Failed" }; }

    // Link affected monitors
    if (body.monitor_urls && body.monitor_urls.length > 0) {
      const links = body.monitor_urls.map((url: string) => ({
        maintenance_id: mw.id,
        monitor_url: url,
      }));
      await db.from("maintenance_monitors").insert(links);
    }

    // Schedule subscriber notification
    enqueueJob("notify_subscribers", {
      type: "maintenance_scheduled",
      maintenance: mw,
    });

    logAudit(userId, "create", "maintenance_window", String(mw.id), { title: body.title });
    return mw;
  }, {
    body: t.Object({
      title: t.String({ minLength: 1, maxLength: 255 }),
      description: t.Optional(t.String()),
      scheduled_start: t.String(),
      scheduled_end: t.String(),
      auto_complete: t.Optional(t.Boolean()),
      monitor_urls: t.Optional(t.Array(t.String())),
    }),
  })

  // Update maintenance window
  .patch("/:id", async ({ headers, jwt, params, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const updateData: any = {};
    if (body.title) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status) {
      updateData.status = body.status;
      if (body.status === "in_progress") updateData.actual_start = new Date().toISOString();
      if (body.status === "completed") updateData.actual_end = new Date().toISOString();
    }

    const { data, error } = await db.from("maintenance_windows").update(updateData).eq("id", params.id).select().single();
    if (error) { set.status = 500; return { error: error.message }; }

    logAudit(userId, "update", "maintenance_window", String(params.id), updateData);
    return data;
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      status: t.Optional(t.String()),
    }),
  })

  // Delete maintenance window
  .delete("/:id", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { error } = await db.from("maintenance_windows").delete().eq("id", params.id);
    if (error) { set.status = 500; return { error: error.message }; }

    logAudit(userId, "delete", "maintenance_window", String(params.id));
    return { message: "Deleted" };
  });

// Check if a monitor is currently in a maintenance window
export async function isInMaintenance(monitorUrl: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { data } = await db
    .from("maintenance_monitors")
    .select("maintenance_id, maintenance_windows!inner(status, scheduled_start, scheduled_end)")
    .eq("monitor_url", monitorUrl)
    .in("maintenance_windows.status", ["scheduled", "in_progress"])
    .lte("maintenance_windows.scheduled_start", now)
    .gte("maintenance_windows.scheduled_end", now);

  return !!data && data.length > 0;
}

// Auto-transition maintenance windows
export function startMaintenanceScheduler(): void {
  setInterval(async () => {
    const now = new Date().toISOString();

    // Auto-start scheduled maintenance
    await db.from("maintenance_windows")
      .update({ status: "in_progress", actual_start: now })
      .eq("status", "scheduled")
      .lte("scheduled_start", now);

    // Auto-complete
    const { data: toComplete } = await db.from("maintenance_windows")
      .select("id")
      .eq("status", "in_progress")
      .eq("auto_complete", true)
      .lte("scheduled_end", now);

    if (toComplete) {
      for (const mw of toComplete) {
        await db.from("maintenance_windows")
          .update({ status: "completed", actual_end: now })
          .eq("id", mw.id);
      }
    }
  }, 60000); // Check every minute

  console.log("[Maintenance] Scheduler started");
}
