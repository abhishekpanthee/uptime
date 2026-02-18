import { Elysia } from "elysia";
import { db } from "../db";

const DEFAULT_NOTICE_API = "https://cdn.tcioe.edu.np";

function clampInt(value: string | number | undefined, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const publicRoutes = new Elysia({ prefix: "/public" })
  .get("/announcements", async ({ query, set }) => {
    try {
      const limit = clampInt((query as Record<string, string | undefined>)?.limit, 1, 10, 6);
      const baseUrl = Bun.env.COLLEGE_API_BASE_URL || DEFAULT_NOTICE_API;
      const noticesUrl = new URL("/api/v1/public/notice-mod/notices", baseUrl);
      noticesUrl.searchParams.set("limit", String(limit));
      noticesUrl.searchParams.set("ordering", "-created_at");
      noticesUrl.searchParams.set("is_approved_by_campus", "true");

      const response = await fetch(noticesUrl.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notices (${response.status})`);
      }

      const payload = await response.json();
      const rawResults = Array.isArray(payload?.results) ? payload.results : [];
      const announcements = rawResults
        .filter((notice) => Boolean(notice?.title))
        .map((notice) => ({
          title: String(notice.title),
          slug: notice.slug ? String(notice.slug) : null,
          uuid: notice.uuid ? String(notice.uuid) : null,
          created_at: notice.created_at ? String(notice.created_at) : null,
        }));

      return { announcements };
    } catch (err: any) {
      // Provide resilient fallback so the page stays usable even if upstream notices API fails.
      return {
        announcements: [
          { title: "Public status updates refresh every 60 seconds.", slug: null, uuid: null, created_at: null },
          { title: "For urgent outages, contact campus IT with affected URL and timestamp.", slug: null, uuid: null, created_at: null },
        ],
        error: err?.message || "Failed to load announcements",
      };
    }
  })
  .get("/status", async ({ set }) => {
    try {
      // 1. Fetch all public websites
      const { data: sites, error } = await db
        .from("ownership")
        .select("website_url, ssl_days")
        .eq("is_public", true);

      if (error) throw error;
      if (!sites) return [];
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // 2. Get the latest status for each site
      const statusList = await Promise.all(
        sites.map(async (site) => {
          const { data: latestPing } = await db
            .from("analytics")
            .select("status, ping5, checked_at")
            .eq("website_url", site.website_url)
            .order("checked_at", { ascending: false })
            .limit(1)
            .single();

          const { data: recentChecks, error: recentChecksError } = await db
            .from("analytics")
            .select("status")
            .eq("website_url", site.website_url)
            .gte("checked_at", since24h);

          if (recentChecksError) throw recentChecksError;

          const checks24h = recentChecks?.length || 0;
          const up24h = recentChecks?.filter((item) => item.status === 200).length || 0;

          return {
            url: site.website_url,
            ssl_days: site.ssl_days,
            status: latestPing?.status || 0,
            ping: latestPing?.ping5 || null,
            last_checked: latestPing?.checked_at || null,
            checks_24h: checks24h,
            uptime_24h: checks24h > 0 ? Math.round((up24h / checks24h) * 10000) / 100 : null,
          };
        })
      );

      return statusList;
    } catch (err: any) {
      set.status = 500;
      return { error: err.message };
    }
  })
  .get("/status/:url/history", async ({ params, query, set }) => {
    try {
      const targetUrl = decodeURIComponent(params.url);
      const days = clampInt((query as Record<string, string | undefined>)?.days, 1, 30, 30);

      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      start.setUTCDate(start.getUTCDate() - (days - 1));

      const { data: checks, error } = await db
        .from("analytics")
        .select("checked_at, ping5, status")
        .eq("website_url", targetUrl)
        .gte("checked_at", start.toISOString())
        .order("checked_at", { ascending: true });

      if (error) throw error;

      const buckets = new Map<
        string,
        { total: number; up: number; pingTotal: number; pingCount: number }
      >();

      for (let i = 0; i < days; i += 1) {
        const day = new Date(start);
        day.setUTCDate(start.getUTCDate() + i);
        buckets.set(toDayKey(day), { total: 0, up: 0, pingTotal: 0, pingCount: 0 });
      }

      for (const row of checks ?? []) {
        const key = toDayKey(new Date(row.checked_at));
        const bucket = buckets.get(key);
        if (!bucket) continue;
        bucket.total += 1;
        if (row.status === 200) bucket.up += 1;
        if (row.ping5 !== null && row.ping5 !== undefined) {
          bucket.pingTotal += Number(row.ping5);
          bucket.pingCount += 1;
        }
      }

      const history = Array.from(buckets.entries()).map(([date, bucket]) => ({
        date,
        checks: bucket.total,
        avg_ping: bucket.pingCount > 0 ? Math.round(bucket.pingTotal / bucket.pingCount) : null,
        uptime_percentage:
          bucket.total > 0 ? Math.round((bucket.up / bucket.total) * 10000) / 100 : null,
      }));

      return { url: targetUrl, days, history };
    } catch (err: any) {
      set.status = 500;
      return { error: err?.message || "Failed to load daily history" };
    }
  })
  .get("/status/:url/history/:day", async ({ params, set }) => {
    try {
      const targetUrl = decodeURIComponent(params.url);
      const day = params.day;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        set.status = 400;
        return { error: "Invalid day format. Use YYYY-MM-DD." };
      }

      const start = new Date(`${day}T00:00:00.000Z`);
      const end = new Date(`${day}T23:59:59.999Z`);

      const { data: checks, error } = await db
        .from("analytics")
        .select("checked_at, ping5, status")
        .eq("website_url", targetUrl)
        .gte("checked_at", start.toISOString())
        .lte("checked_at", end.toISOString())
        .order("checked_at", { ascending: true });

      if (error) throw error;

      const hourly = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        label: `${String(hour).padStart(2, "0")}:00`,
        checks: 0,
        up: 0,
        pingTotal: 0,
        pingCount: 0,
      }));

      for (const row of checks ?? []) {
        const hour = new Date(row.checked_at).getUTCHours();
        const bucket = hourly[hour];
        if (!bucket) continue;
        bucket.checks += 1;
        if (row.status === 200) bucket.up += 1;
        if (row.ping5 !== null && row.ping5 !== undefined) {
          bucket.pingTotal += Number(row.ping5);
          bucket.pingCount += 1;
        }
      }

      return {
        url: targetUrl,
        day,
        timezone: "UTC",
        timeline: (checks ?? []).map((row) => ({
          checked_at: row.checked_at,
          ping: row.ping5 !== null && row.ping5 !== undefined ? Number(row.ping5) : null,
          status: row.status ?? null,
        })),
        hourly: hourly.map((item) => ({
          hour: item.hour,
          label: item.label,
          checks: item.checks,
          avg_ping: item.pingCount > 0 ? Math.round(item.pingTotal / item.pingCount) : null,
          uptime_percentage:
            item.checks > 0 ? Math.round((item.up / item.checks) * 10000) / 100 : null,
        })),
      };
    } catch (err: any) {
      set.status = 500;
      return { error: err?.message || "Failed to load hourly history" };
    }
  });
