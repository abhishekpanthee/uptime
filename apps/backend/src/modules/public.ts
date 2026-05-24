import { Elysia } from "elysia";
import { db } from "../db";

const DEFAULT_NOTICE_API = "https://cdn.tcioe.edu.np";
const DOWN_TIMEOUT_MS = 2500;
const NEPAL_TIMEZONE = "Asia/Kathmandu";
const NEPAL_OFFSET_MINUTES = 5 * 60 + 45;
const NEPAL_OFFSET_MS = NEPAL_OFFSET_MINUTES * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function isMissingSslDaysColumnError(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || "").toLowerCase();
  return message.includes("ssl_days") && message.includes("column");
}

async function selectPublicSitesWithOptionalSsl() {
  const withSsl = await db
    .from("ownership")
    .select("website_url, ssl_days")
    .eq("is_public", true);

  if (!withSsl.error) {
    return withSsl;
  }

  if (!isMissingSslDaysColumnError(withSsl.error)) {
    return withSsl;
  }

  return db.from("ownership").select("website_url").eq("is_public", true);
}

function clampInt(value: string | number | undefined, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toNepalDate(date: Date) {
  return new Date(date.getTime() + NEPAL_OFFSET_MS);
}

function toNepalDayKey(date: Date) {
  const nepal = toNepalDate(date);
  return toDayKey(
    new Date(
      Date.UTC(nepal.getUTCFullYear(), nepal.getUTCMonth(), nepal.getUTCDate(), 0, 0, 0, 0)
    )
  );
}

function toNepalHour(date: Date) {
  return toNepalDate(date).getUTCHours();
}

function nepalDayStartToUtc(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date, 0, 0, 0, 0) - NEPAL_OFFSET_MS);
}

function nepalTodayStartToUtc(now: Date) {
  const nepalNow = toNepalDate(now);
  return new Date(
    Date.UTC(nepalNow.getUTCFullYear(), nepalNow.getUTCMonth(), nepalNow.getUTCDate(), 0, 0, 0, 0) -
      NEPAL_OFFSET_MS
  );
}

function normalizePing(status: number | null | undefined, ping: number | null | undefined) {
  if (ping !== null && ping !== undefined) return Number(ping);
  if (typeof status === "number" && status !== 200) return DOWN_TIMEOUT_MS;
  return null;
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
      const { data: sites, error } = await selectPublicSitesWithOptionalSsl();

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
          const rawSslDays = (site as { ssl_days?: unknown }).ssl_days;
          const sslDays =
            rawSslDays === null || rawSslDays === undefined
              ? null
              : Number.isFinite(Number(rawSslDays))
                ? Number(rawSslDays)
                : null;

          return {
            url: site.website_url,
            ssl_days: sslDays,
            status: latestPing?.status || 0,
            ping: normalizePing(latestPing?.status, latestPing?.ping5),
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

      const todayStartUtc = nepalTodayStartToUtc(new Date());
      const start = new Date(todayStartUtc.getTime() - (days - 1) * DAY_MS);

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
        const day = new Date(start.getTime() + i * DAY_MS);
        buckets.set(toNepalDayKey(day), { total: 0, up: 0, pingTotal: 0, pingCount: 0 });
      }

      for (const row of checks ?? []) {
        const key = toNepalDayKey(new Date(row.checked_at));
        const bucket = buckets.get(key);
        if (!bucket) continue;
        bucket.total += 1;
        if (row.status === 200) bucket.up += 1;
        const normalizedPing = normalizePing(row.status, row.ping5);
        if (normalizedPing !== null) {
          bucket.pingTotal += normalizedPing;
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

      const start = nepalDayStartToUtc(day);
      const end = new Date(start.getTime() + DAY_MS - 1);

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
        const hour = toNepalHour(new Date(row.checked_at));
        const bucket = hourly[hour];
        if (!bucket) continue;
        bucket.checks += 1;
        if (row.status === 200) bucket.up += 1;
        const normalizedPing = normalizePing(row.status, row.ping5);
        if (normalizedPing !== null) {
          bucket.pingTotal += normalizedPing;
          bucket.pingCount += 1;
        }
      }

      return {
        url: targetUrl,
        day,
        timezone: NEPAL_TIMEZONE,
        timeline: (checks ?? []).map((row) => ({
          checked_at: row.checked_at,
          ping: normalizePing(row.status, row.ping5),
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
