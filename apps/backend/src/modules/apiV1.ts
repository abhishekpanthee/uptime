import { Elysia, t } from "elysia";
import { db } from "../db";
import { authenticateApiKey } from "./apiKeys";
import { cacheGet, cacheSet } from "../services/redis";

// API v1 - Public REST API authenticated via API keys
export const apiV1 = new Elysia({ prefix: "/v1" })
  .onBeforeHandle(async ({ request, set }) => {
    // Try API key auth first, then JWT
    const apiKeyAuth = await authenticateApiKey(request);
    if (apiKeyAuth) {
      (request as any)._apiUser = apiKeyAuth;
      return;
    }

    // Allow JWT auth as fallback (handled by individual routes if needed)
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized. Provide a valid API key or JWT token." };
    }
  })

  // -- Monitors --

  .get("/monitors", async ({ request, set }) => {
    const user = (request as any)._apiUser;
    if (!user) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("ownership").select("*").eq("owner_id", user.userId);
    if (error) { set.status = 500; return { error: error.message }; }
    return { monitors: data };
  })

  .get("/monitors/:id", async ({ request, params, set }) => {
    const user = (request as any)._apiUser;
    if (!user) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("ownership")
      .select("*")
      .eq("id", params.id)
      .eq("owner_id", user.userId)
      .single();

    if (error || !data) { set.status = 404; return { error: "Monitor not found" }; }
    return data;
  })

  .post("/monitors", async ({ request, body, set }) => {
    const user = (request as any)._apiUser;
    if (!user) { set.status = 401; return { error: "Unauthorized" }; }
    if (!user.scopes.includes("write") && !user.scopes.includes("read-write")) {
      set.status = 403; return { error: "Insufficient scope. Requires 'write'." };
    }

    const { data, error } = await db.from("ownership").insert({
      website_url: body.url,
      owner_id: user.userId,
      site_name: body.name,
      monitor_type: body.monitor_type || "http",
      check_interval: body.check_interval || 60,
      is_public: body.is_public ?? false,
    }).select().single();

    if (error) { set.status = 422; return { error: error.message }; }
    return data;
  }, {
    body: t.Object({
      url: t.String({ format: "uri" }),
      name: t.Optional(t.String()),
      monitor_type: t.Optional(t.String()),
      check_interval: t.Optional(t.Number()),
      is_public: t.Optional(t.Boolean()),
    }),
  })

  .put("/monitors/:id", async ({ request, params, body, set }) => {
    const user = (request as any)._apiUser;
    if (!user) { set.status = 401; return { error: "Unauthorized" }; }
    if (!user.scopes.includes("write") && !user.scopes.includes("read-write")) {
      set.status = 403; return { error: "Insufficient scope" };
    }

    const { data, error } = await db.from("ownership")
      .update({
        site_name: body.name,
        check_interval: body.check_interval,
        is_public: body.is_public,
        monitor_type: body.monitor_type,
      })
      .eq("id", params.id)
      .eq("owner_id", user.userId)
      .select().single();

    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      check_interval: t.Optional(t.Number()),
      is_public: t.Optional(t.Boolean()),
      monitor_type: t.Optional(t.String()),
    }),
  })

  .delete("/monitors/:id", async ({ request, params, set }) => {
    const user = (request as any)._apiUser;
    if (!user) { set.status = 401; return { error: "Unauthorized" }; }
    if (!user.scopes.includes("write") && !user.scopes.includes("read-write")) {
      set.status = 403; return { error: "Insufficient scope" };
    }

    const { error } = await db.from("ownership")
      .delete()
      .eq("id", params.id)
      .eq("owner_id", user.userId);

    if (error) { set.status = 500; return { error: error.message }; }
    return { message: "Monitor deleted" };
  })

  .patch("/monitors/:id/pause", async ({ request, params, set }) => {
    const user = (request as any)._apiUser;
    if (!user) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("ownership")
      .update({ monitor_status: "paused" })
      .eq("id", params.id)
      .eq("owner_id", user.userId)
      .select().single();

    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  })

  .patch("/monitors/:id/resume", async ({ request, params, set }) => {
    const user = (request as any)._apiUser;
    if (!user) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("ownership")
      .update({ monitor_status: "active" })
      .eq("id", params.id)
      .eq("owner_id", user.userId)
      .select().single();

    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  })

  // -- Monitor Metrics --

  .get("/monitors/:id/metrics", async ({ request, params, query, set }) => {
    const user = (request as any)._apiUser;
    if (!user) { set.status = 401; return { error: "Unauthorized" }; }

    // Verify ownership
    const { data: monitor } = await db.from("ownership")
      .select("website_url")
      .eq("id", params.id)
      .eq("owner_id", user.userId)
      .single();

    if (!monitor) { set.status = 404; return { error: "Monitor not found" }; }

    const period = (query as any)?.period || "24h";
    const since = new Date();

    switch (period) {
      case "1h": since.setHours(since.getHours() - 1); break;
      case "6h": since.setHours(since.getHours() - 6); break;
      case "24h": since.setHours(since.getHours() - 24); break;
      case "7d": since.setDate(since.getDate() - 7); break;
      case "30d": since.setDate(since.getDate() - 30); break;
      default: since.setHours(since.getHours() - 24);
    }

    const { data: checks } = await db.from("analytics")
      .select("ping5, status, checked_at")
      .eq("website_url", monitor.website_url)
      .gte("checked_at", since.toISOString())
      .order("checked_at", { ascending: true });

    if (!checks || checks.length === 0) {
      return { metrics: { total_checks: 0, uptime: 100, avg_response_time: 0, p95: 0, p99: 0 }, data: [] };
    }

    const pings = checks.filter((c: any) => c.ping5 !== null).map((c: any) => c.ping5).sort((a: number, b: number) => a - b);
    const successful = checks.filter((c: any) => c.status === 200).length;

    return {
      metrics: {
        total_checks: checks.length,
        uptime: Math.round((successful / checks.length) * 10000) / 100,
        avg_response_time: pings.length > 0 ? Math.round(pings.reduce((a: number, b: number) => a + b, 0) / pings.length) : 0,
        p95: pings.length > 0 ? pings[Math.floor(pings.length * 0.95)] : 0,
        p99: pings.length > 0 ? pings[Math.floor(pings.length * 0.99)] : 0,
      },
      data: checks,
    };
  })

  // -- Incidents --

  .get("/incidents", async ({ request, set }) => {
    const user = (request as any)._apiUser;
    if (!user) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("incidents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) { set.status = 500; return { error: error.message }; }
    return { incidents: data };
  })

  .post("/incidents", async ({ request, body, set }) => {
    const user = (request as any)._apiUser;
    if (!user) { set.status = 401; return { error: "Unauthorized" }; }
    if (!user.scopes.includes("write") && !user.scopes.includes("read-write")) {
      set.status = 403; return { error: "Insufficient scope" };
    }

    const { data, error } = await db.from("incidents").insert({
      title: body.title,
      status: body.status || "investigating",
      severity: body.severity || "major",
      created_by: user.userId,
    }).select().single();

    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  }, {
    body: t.Object({
      title: t.String(),
      status: t.Optional(t.String()),
      severity: t.Optional(t.String()),
    }),
  })

  .get("/incidents/:id", async ({ request, params, set }) => {
    const user = (request as any)._apiUser;
    if (!user) { set.status = 401; return { error: "Unauthorized" }; }

    const { data } = await db.from("incidents").select("*").eq("id", params.id).single();
    if (!data) { set.status = 404; return { error: "Not found" }; }

    const { data: updates } = await db.from("incident_updates")
      .select("*").eq("incident_id", params.id).order("created_at", { ascending: true });

    return { ...data, updates: updates || [] };
  })

  .post("/incidents/:id/updates", async ({ request, params, body, set }) => {
    const user = (request as any)._apiUser;
    if (!user) { set.status = 401; return { error: "Unauthorized" }; }
    if (!user.scopes.includes("write")) { set.status = 403; return { error: "Insufficient scope" }; }

    const { data, error } = await db.from("incident_updates").insert({
      incident_id: Number(params.id),
      status: body.status,
      message: body.message,
      created_by: user.userId,
    }).select().single();

    if (error) { set.status = 500; return { error: error.message }; }

    await db.from("incidents").update({
      status: body.status,
      updated_at: new Date().toISOString(),
      ...(body.status === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
    }).eq("id", params.id);

    return data;
  }, {
    body: t.Object({
      status: t.String(),
      message: t.String(),
    }),
  })

  // -- Maintenance --

  .get("/maintenance", async ({ request, set }) => {
    const user = (request as any)._apiUser;
    if (!user) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("maintenance_windows")
      .select("*")
      .order("scheduled_start", { ascending: true });

    if (error) { set.status = 500; return { error: error.message }; }
    return { maintenance: data };
  })

  // -- Status Pages --

  .get("/status-pages", async ({ request, set }) => {
    const user = (request as any)._apiUser;
    if (!user) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("status_pages")
      .select("id, slug, title, is_published, created_at");

    if (error) { set.status = 500; return { error: error.message }; }
    return { status_pages: data };
  });
