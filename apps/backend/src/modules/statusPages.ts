import { Elysia, t } from "elysia";
import { db } from "../db";
import { jwtConfig, extractBearerToken } from "../middleware/auth";
import { cacheGet, cacheSet } from "../services/redis";
import { logAudit } from "./audit";

const getUserId = async (headers: Record<string, string | undefined>, jwt: any) => {
  const token = extractBearerToken(headers);
  if (!token) return null;
  const profile = await jwt.verify(token);
  return profile ? Number(profile.id) : null;
};

export const statusPages = new Elysia({ prefix: "/status-pages" })
  .use(jwtConfig)

  // List status pages (admin)
  .get("/", async ({ headers, jwt, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("status_pages").select("*").order("created_at", { ascending: false });
    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  })

  // Create status page
  .post("/", async ({ headers, jwt, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("status_pages").insert({
      slug: body.slug,
      title: body.title,
      description: body.description,
      theme: body.theme,
      layout: body.layout,
      header_text: body.header_text,
      footer_text: body.footer_text,
      is_published: body.is_published ?? false,
    }).select().single();

    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(userId, "create", "status_page", String(data.id));
    return data;
  }, {
    body: t.Object({
      slug: t.String({ minLength: 1, maxLength: 100 }),
      title: t.String({ minLength: 1, maxLength: 255 }),
      description: t.Optional(t.String()),
      theme: t.Optional(t.Object({}, { additionalProperties: true })),
      layout: t.Optional(t.Object({}, { additionalProperties: true })),
      header_text: t.Optional(t.String()),
      footer_text: t.Optional(t.String()),
      is_published: t.Optional(t.Boolean()),
    }),
  })

  // Update status page
  .patch("/:id", async ({ headers, jwt, params, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (body.title) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.theme) updateData.theme = body.theme;
    if (body.layout) updateData.layout = body.layout;
    if (body.header_text !== undefined) updateData.header_text = body.header_text;
    if (body.footer_text !== undefined) updateData.footer_text = body.footer_text;
    if (body.custom_css !== undefined) updateData.custom_css = body.custom_css;
    if (body.is_published !== undefined) updateData.is_published = body.is_published;
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url;
    if (body.favicon_url !== undefined) updateData.favicon_url = body.favicon_url;

    const { data, error } = await db.from("status_pages").update(updateData).eq("id", params.id).select().single();
    if (error) { set.status = 500; return { error: error.message }; }

    logAudit(userId, "update", "status_page", String(params.id));
    return data;
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      theme: t.Optional(t.Object({}, { additionalProperties: true })),
      layout: t.Optional(t.Object({}, { additionalProperties: true })),
      header_text: t.Optional(t.String()),
      footer_text: t.Optional(t.String()),
      custom_css: t.Optional(t.String()),
      is_published: t.Optional(t.Boolean()),
      logo_url: t.Optional(t.String()),
      favicon_url: t.Optional(t.String()),
    }),
  })

  // Delete status page
  .delete("/:id", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { error } = await db.from("status_pages").delete().eq("id", params.id);
    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(userId, "delete", "status_page", String(params.id));
    return { message: "Deleted" };
  })

  // -- Components Management --

  .get("/:id/components", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("status_page_components")
      .select("*")
      .eq("status_page_id", params.id)
      .order("display_order", { ascending: true });

    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  })

  .post("/:id/components", async ({ headers, jwt, params, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("status_page_components").insert({
      status_page_id: Number(params.id),
      monitor_url: body.monitor_url,
      display_name: body.display_name,
      display_order: body.display_order || 0,
      group_name: body.group_name,
      show_response_time: body.show_response_time ?? true,
      show_uptime: body.show_uptime ?? true,
    }).select().single();

    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  }, {
    body: t.Object({
      monitor_url: t.String(),
      display_name: t.Optional(t.String()),
      display_order: t.Optional(t.Number()),
      group_name: t.Optional(t.String()),
      show_response_time: t.Optional(t.Boolean()),
      show_uptime: t.Optional(t.Boolean()),
    }),
  })

  .delete("/:pageId/components/:id", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { error } = await db.from("status_page_components").delete().eq("id", params.id);
    if (error) { set.status = 500; return { error: error.message }; }
    return { message: "Component removed" };
  });

// -- Public Status Page Endpoints (no auth) --

export const publicStatusPages = new Elysia({ prefix: "/s" })

  // Get public status page by slug
  .get("/:slug", async ({ params, set }) => {
    const cached = await cacheGet(`status_page:${params.slug}`);
    if (cached) return JSON.parse(cached);

    const { data: page } = await db.from("status_pages")
      .select("*")
      .eq("slug", params.slug)
      .eq("is_published", true)
      .single();

    if (!page) { set.status = 404; return { error: "Status page not found" }; }

    const { data: components } = await db.from("status_page_components")
      .select("*")
      .eq("status_page_id", page.id)
      .order("display_order", { ascending: true });

    // Get status for each component
    const componentStatuses = await Promise.all(
      (components || []).map(async (comp: any) => {
        const { data: latest } = await db.from("analytics")
          .select("status, ping5, checked_at")
          .eq("website_url", comp.monitor_url)
          .order("checked_at", { ascending: false })
          .limit(1)
          .single();

        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recent } = await db.from("analytics")
          .select("status")
          .eq("website_url", comp.monitor_url)
          .gte("checked_at", since24h);

        const total = recent?.length || 0;
        const up = recent?.filter((r: any) => r.status === 200).length || 0;

        return {
          display_name: comp.display_name || comp.monitor_url,
          group_name: comp.group_name,
          status: latest?.status || 0,
          ping: latest?.ping5 || null,
          last_checked: latest?.checked_at || null,
          uptime_24h: total > 0 ? Math.round((up / total) * 10000) / 100 : null,
          show_response_time: comp.show_response_time,
          show_uptime: comp.show_uptime,
        };
      })
    );

    // Get active incidents
    const { data: activeIncidents } = await db.from("incidents")
      .select("id, title, status, severity, created_at, updated_at")
      .neq("status", "resolved")
      .order("created_at", { ascending: false });

    // Get upcoming maintenance
    const { data: upcomingMaintenance } = await db.from("maintenance_windows")
      .select("id, title, description, status, scheduled_start, scheduled_end")
      .in("status", ["scheduled", "in_progress"])
      .order("scheduled_start", { ascending: true })
      .limit(5);

    const result = {
      page: {
        title: page.title,
        description: page.description,
        logo_url: page.logo_url,
        favicon_url: page.favicon_url,
        theme: page.theme,
        layout: page.layout,
        header_text: page.header_text,
        footer_text: page.footer_text,
        custom_css: page.custom_css,
      },
      components: componentStatuses,
      incidents: activeIncidents || [],
      maintenance: upcomingMaintenance || [],
      overall_status: componentStatuses.every((c) => c.status === 200) ? "operational" :
        componentStatuses.some((c) => c.status === 0) ? "major_outage" : "degraded",
    };

    await cacheSet(`status_page:${params.slug}`, JSON.stringify(result), 60);
    return result;
  })

  // Status badge SVG
  .get("/:slug/badge.svg", async ({ params, set }) => {
    const { data: page } = await db.from("status_pages")
      .select("id")
      .eq("slug", params.slug)
      .eq("is_published", true)
      .single();

    if (!page) { set.status = 404; return "Not found"; }

    const { data: components } = await db.from("status_page_components")
      .select("monitor_url")
      .eq("status_page_id", page.id);

    if (!components || components.length === 0) {
      return generateBadge("unknown", "#9ca3af");
    }

    // Check latest status of all components
    let allUp = true;
    for (const comp of components) {
      const { data: latest } = await db.from("analytics")
        .select("status")
        .eq("website_url", comp.monitor_url)
        .order("checked_at", { ascending: false })
        .limit(1)
        .single();

      if (!latest || latest.status !== 200) {
        allUp = false;
        break;
      }
    }

    set.headers["Content-Type"] = "image/svg+xml";
    set.headers["Cache-Control"] = "max-age=60";

    return allUp
      ? generateBadge("operational", "#16a34a")
      : generateBadge("outage", "#dc2626");
  });

function generateBadge(status: string, color: string): string {
  const textWidth = status.length * 7 + 10;
  const totalWidth = 50 + textWidth;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <rect width="50" height="20" fill="#555" rx="3"/>
  <rect x="50" width="${textWidth}" height="20" fill="${color}" rx="3"/>
  <rect x="50" width="4" height="20" fill="${color}"/>
  <text x="25" y="14" fill="#fff" font-family="sans-serif" font-size="11" text-anchor="middle">status</text>
  <text x="${50 + textWidth / 2}" y="14" fill="#fff" font-family="sans-serif" font-size="11" text-anchor="middle">${status}</text>
</svg>`;
}
