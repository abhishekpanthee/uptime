import { Elysia } from "elysia";
import { db } from "../db";

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

function toNepalDate(date: Date): Date {
  return new Date(date.getTime() + NEPAL_OFFSET_MS);
}

function getHourId(date: Date): string {
  const nepal = toNepalDate(date);
  const y = nepal.getUTCFullYear();
  const m = String(nepal.getUTCMonth() + 1).padStart(2, "0");
  const d = String(nepal.getUTCDate()).padStart(2, "0");
  const h = String(nepal.getUTCHours()).padStart(2, "0");
  return `${y}${m}${d}${h}`;
}

function getDayId(date: Date): string {
  const nepal = toNepalDate(date);
  const y = nepal.getUTCFullYear();
  const m = String(nepal.getUTCMonth() + 1).padStart(2, "0");
  const d = String(nepal.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

async function aggregateHourly() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const hourId = getHourId(oneHourAgo);

  const { data: sites } = await db.from("ownership").select("website_url");
  if (!sites) return;

  for (const site of sites) {
    const { data: checks } = await db
      .from("analytics")
      .select("ping5, status, checked_at")
      .eq("website_url", site.website_url)
      .gte("checked_at", oneHourAgo.toISOString())
      .lt("checked_at", new Date().toISOString());

    if (!checks || checks.length === 0) continue;

    const pings = checks.filter((c) => c.ping5 !== null).map((c) => c.ping5!);
    const avg = pings.length > 0 ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length) : 0;

    await db.from("average_hour").upsert(
      {
        website_url: site.website_url,
        hour_id: hourId,
        avg,
        sample_count: checks.length,
        checked_at: oneHourAgo.toISOString(),
      },
      { onConflict: "website_url,hour_id" }
    );
  }

  console.log(`[Aggregation] Hourly aggregation completed for hour ${hourId}`);
}

async function aggregateDaily() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dayId = getDayId(yesterday);

  const { data: hourlyData } = await db
    .from("average_hour")
    .select("website_url, avg, sample_count")
    .like("hour_id", `${dayId}%`);

  if (!hourlyData || hourlyData.length === 0) return;

  const grouped: Record<string, { totalPing: number; totalSamples: number }> = {};

  for (const row of hourlyData) {
    if (!grouped[row.website_url]) {
      grouped[row.website_url] = { totalPing: 0, totalSamples: 0 };
    }
    grouped[row.website_url].totalPing += row.avg * row.sample_count;
    grouped[row.website_url].totalSamples += row.sample_count;
  }

  for (const [url, data] of Object.entries(grouped)) {
    const avg = data.totalSamples > 0 ? Math.round(data.totalPing / data.totalSamples) : 0;

    await db.from("average_day").upsert(
      {
        website_url: url,
        day_id: dayId,
        avg,
        sample_count: data.totalSamples,
        checked_at: yesterday.toISOString(),
      },
      { onConflict: "website_url,day_id" }
    );
  }

  console.log(`[Aggregation] Daily aggregation completed for day ${dayId}`);
}

export const aggregationService = new Elysia({ name: "aggregation-service" }).onStart(
  async () => {
    console.log("[Aggregation] Service started. Hourly runs every 60 min, daily at midnight NPT.");

    // Run hourly aggregation every 60 minutes
    setInterval(aggregateHourly, 60 * 60 * 1000);

    // Run daily aggregation every 24 hours
    // Schedule first run at next midnight NPT
    const now = new Date();
    const nepalNow = toNepalDate(now);
    const nepalMidnight = new Date(
      Date.UTC(nepalNow.getUTCFullYear(), nepalNow.getUTCMonth(), nepalNow.getUTCDate() + 1, 0, 0, 0, 0)
    );
    const msUntilMidnight = nepalMidnight.getTime() - NEPAL_OFFSET_MS - now.getTime();

    setTimeout(() => {
      aggregateDaily();
      setInterval(aggregateDaily, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    // Run initial aggregation after 10 seconds
    setTimeout(aggregateHourly, 10000);
  }
);
