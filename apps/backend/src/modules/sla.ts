import { Elysia, t } from "elysia";
import { db } from "../db";
import { jwtConfig, extractBearerToken } from "../middleware/auth";
import { logAudit } from "./audit";

const getUserId = async (headers: Record<string, string | undefined>, jwt: any) => {
  const token = extractBearerToken(headers);
  if (!token) return null;
  const profile = await jwt.verify(token);
  return profile ? Number(profile.id) : null;
};

export const sla = new Elysia({ prefix: "/sla" })
  .use(jwtConfig)

  // List SLA definitions
  .get("/", async ({ headers, jwt, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("sla_definitions").select("*").order("created_at", { ascending: false });
    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  })

  // Create SLA definition
  .post("/", async ({ headers, jwt, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("sla_definitions").insert({
      monitor_url: body.monitor_url || null,
      group_id: body.group_id || null,
      target_uptime: body.target_uptime,
      period: body.period || "monthly",
    }).select().single();

    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(userId, "create", "sla_definition", String(data.id));
    return data;
  }, {
    body: t.Object({
      monitor_url: t.Optional(t.String()),
      group_id: t.Optional(t.Number()),
      target_uptime: t.Number({ minimum: 0, maximum: 100 }),
      period: t.Optional(t.String()),
    }),
  })

  // Delete SLA definition
  .delete("/:id", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { error } = await db.from("sla_definitions").delete().eq("id", params.id);
    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(userId, "delete", "sla_definition", String(params.id));
    return { message: "Deleted" };
  })

  // Get SLA reports for a definition
  .get("/:id/reports", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("sla_reports")
      .select("*")
      .eq("sla_id", params.id)
      .order("period_start", { ascending: false });

    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  })

  // Get error budget for a monitor
  .get("/budget/:monitorUrl", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const monitorUrl = decodeURIComponent(params.monitorUrl);

    const { data: slaDef } = await db.from("sla_definitions")
      .select("*")
      .eq("monitor_url", monitorUrl)
      .single();

    if (!slaDef) return { error: "No SLA defined for this monitor", budget: null };

    // Calculate current period budget
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    if (slaDef.period === "monthly") {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (slaDef.period === "quarterly") {
      const quarter = Math.floor(now.getMonth() / 3);
      periodStart = new Date(now.getFullYear(), quarter * 3, 1);
      periodEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59);
    } else {
      periodStart = new Date(now.getFullYear(), 0, 1);
      periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    }

    const totalPeriodSeconds = (periodEnd.getTime() - periodStart.getTime()) / 1000;
    const allowedDowntimeSeconds = totalPeriodSeconds * (1 - slaDef.target_uptime / 100);

    // Get actual downtime from analytics
    const { data: checks } = await db.from("analytics")
      .select("status, checked_at")
      .eq("website_url", monitorUrl)
      .gte("checked_at", periodStart.toISOString())
      .lte("checked_at", periodEnd.toISOString());

    const totalChecks = checks?.length || 0;
    const failedChecks = checks?.filter((c: any) => c.status !== 200).length || 0;
    const checkInterval = 60; // seconds
    const consumedDowntimeSeconds = failedChecks * checkInterval;
    const remainingBudgetSeconds = Math.max(0, allowedDowntimeSeconds - consumedDowntimeSeconds);
    const budgetPercentUsed = allowedDowntimeSeconds > 0 ? (consumedDowntimeSeconds / allowedDowntimeSeconds) * 100 : 0;
    const actualUptime = totalChecks > 0 ? ((totalChecks - failedChecks) / totalChecks) * 100 : 100;

    return {
      sla: slaDef,
      period: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
      budget: {
        allowed_downtime_seconds: Math.round(allowedDowntimeSeconds),
        consumed_downtime_seconds: consumedDowntimeSeconds,
        remaining_budget_seconds: Math.round(remainingBudgetSeconds),
        budget_percent_used: Math.round(budgetPercentUsed * 100) / 100,
        actual_uptime: Math.round(actualUptime * 1000) / 1000,
        target_uptime: slaDef.target_uptime,
        met: actualUptime >= slaDef.target_uptime,
      },
    };
  });

// SLA report generation job (runs daily)
export async function generateSLAReports(): Promise<void> {
  const { data: definitions } = await db.from("sla_definitions").select("*");
  if (!definitions) return;

  const now = new Date();

  for (const slaDef of definitions) {
    if (!slaDef.monitor_url) continue;

    // Only generate for completed periods
    let periodStart: Date;
    let periodEnd: Date;

    if (slaDef.period === "monthly") {
      periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (slaDef.period === "quarterly") {
      const quarter = Math.floor(now.getMonth() / 3);
      const prevQuarter = quarter === 0 ? 3 : quarter - 1;
      const prevYear = quarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
      periodStart = new Date(prevYear, prevQuarter * 3, 1);
      periodEnd = new Date(prevYear, prevQuarter * 3 + 3, 0, 23, 59, 59);
    } else {
      periodStart = new Date(now.getFullYear() - 1, 0, 1);
      periodEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    }

    // Skip if report already exists
    const { data: existing } = await db.from("sla_reports")
      .select("id")
      .eq("sla_id", slaDef.id)
      .eq("period_start", periodStart.toISOString())
      .single();

    if (existing) continue;

    const { data: checks } = await db.from("analytics")
      .select("status")
      .eq("website_url", slaDef.monitor_url)
      .gte("checked_at", periodStart.toISOString())
      .lte("checked_at", periodEnd.toISOString());

    const total = checks?.length || 0;
    const failed = checks?.filter((c: any) => c.status !== 200).length || 0;
    const actualUptime = total > 0 ? ((total - failed) / total) * 100 : 100;
    const downtimeSeconds = failed * 60;

    // Count incidents
    const { count: incidentCount } = await db.from("incidents")
      .select("id", { count: "exact" })
      .gte("created_at", periodStart.toISOString())
      .lte("created_at", periodEnd.toISOString());

    await db.from("sla_reports").insert({
      sla_id: slaDef.id,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      actual_uptime: Math.round(actualUptime * 1000) / 1000,
      target_uptime: slaDef.target_uptime,
      met: actualUptime >= slaDef.target_uptime,
      total_downtime_seconds: downtimeSeconds,
      incident_count: incidentCount || 0,
    });
  }

  console.log("[SLA] Report generation completed");
}

// Start SLA report scheduler
export function startSLAScheduler(): void {
  // Generate SLA reports daily at 1 AM
  setInterval(generateSLAReports, 24 * 60 * 60 * 1000);
  // Initial run after 30 seconds
  setTimeout(generateSLAReports, 30000);
  console.log("[SLA] Scheduler started");
}
