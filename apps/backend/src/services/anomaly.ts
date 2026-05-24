import { db } from "../db";
import { cacheGet, cacheSet } from "../services/redis";
import { broadcastEvent } from "../services/websocket";

interface Baseline {
  monitorUrl: string;
  avgResponseTime: number;
  stdDevResponseTime: number;
  avgUptime: number;
  p95ResponseTime: number;
  sampleSize: number;
}

// Learn baseline from historical data
async function learnBaseline(monitorUrl: string, days: number = 14): Promise<Baseline | null> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: checks } = await db.from("analytics")
    .select("ping5, status")
    .eq("website_url", monitorUrl)
    .gte("checked_at", since)
    .not("ping5", "is", null);

  if (!checks || checks.length < 50) return null; // Need sufficient data

  const pings = checks.filter((c: any) => c.ping5 !== null).map((c: any) => Number(c.ping5));
  const total = checks.length;
  const up = checks.filter((c: any) => c.status === 200).length;

  const avg = pings.reduce((a, b) => a + b, 0) / pings.length;
  const variance = pings.reduce((sum, p) => sum + (p - avg) ** 2, 0) / pings.length;
  const stdDev = Math.sqrt(variance);

  const sorted = [...pings].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  return {
    monitorUrl,
    avgResponseTime: Math.round(avg * 100) / 100,
    stdDevResponseTime: Math.round(stdDev * 100) / 100,
    avgUptime: Math.round((up / total) * 10000) / 100,
    p95ResponseTime: p95,
    sampleSize: checks.length,
  };
}

// Store/update baseline in DB
async function storeBaseline(baseline: Baseline): Promise<void> {
  await db.from("anomaly_baselines").upsert({
    monitor_url: baseline.monitorUrl,
    avg_response_time: baseline.avgResponseTime,
    stddev_response_time: baseline.stdDevResponseTime,
    p95_response_time: baseline.p95ResponseTime,
    avg_uptime: baseline.avgUptime,
    sample_size: baseline.sampleSize,
    computed_at: new Date().toISOString(),
  }, {
    onConflict: "monitor_url",
  });
}

// Get cached or stored baseline
async function getBaseline(monitorUrl: string): Promise<Baseline | null> {
  const cached = await cacheGet(`baseline:${monitorUrl}`);
  if (cached) return JSON.parse(cached);

  const { data } = await db.from("anomaly_baselines")
    .select("*")
    .eq("monitor_url", monitorUrl)
    .single();

  if (!data) return null;

  const baseline: Baseline = {
    monitorUrl: data.monitor_url,
    avgResponseTime: data.avg_response_time,
    stdDevResponseTime: data.stddev_response_time,
    avgUptime: data.avg_uptime,
    p95ResponseTime: data.p95_response_time,
    sampleSize: data.sample_size,
  };

  await cacheSet(`baseline:${monitorUrl}`, JSON.stringify(baseline), 3600);
  return baseline;
}

// Check a single data point for anomaly
export async function detectAnomaly(
  monitorUrl: string,
  responseTime: number,
  status: number
): Promise<{ isAnomaly: boolean; type?: string; severity?: string; detail?: string }> {
  const baseline = await getBaseline(monitorUrl);
  if (!baseline) return { isAnomaly: false };

  // Z-score based detection for response time
  if (baseline.stdDevResponseTime > 0 && responseTime > 0) {
    const zScore = (responseTime - baseline.avgResponseTime) / baseline.stdDevResponseTime;

    if (zScore > 4) {
      const event = {
        isAnomaly: true,
        type: "response_time_spike",
        severity: "critical",
        detail: `Response time ${responseTime}ms is ${zScore.toFixed(1)} std devs above baseline (avg: ${baseline.avgResponseTime}ms)`,
      };
      await recordAnomalyEvent(monitorUrl, event);
      return event;
    }

    if (zScore > 3) {
      const event = {
        isAnomaly: true,
        type: "response_time_spike",
        severity: "warning",
        detail: `Response time ${responseTime}ms is ${zScore.toFixed(1)} std devs above baseline (avg: ${baseline.avgResponseTime}ms)`,
      };
      await recordAnomalyEvent(monitorUrl, event);
      return event;
    }
  }

  // Absolute threshold: > 3x P95
  if (baseline.p95ResponseTime > 0 && responseTime > baseline.p95ResponseTime * 3) {
    const event = {
      isAnomaly: true,
      type: "response_time_extreme",
      severity: "critical" as const,
      detail: `Response time ${responseTime}ms exceeds 3x P95 (${baseline.p95ResponseTime}ms)`,
    };
    await recordAnomalyEvent(monitorUrl, event);
    return event;
  }

  return { isAnomaly: false };
}

// Record anomaly event
async function recordAnomalyEvent(
  monitorUrl: string,
  event: { type?: string; severity?: string; detail?: string }
): Promise<void> {
  await db.from("anomaly_events").insert({
    monitor_url: monitorUrl,
    event_type: event.type,
    severity: event.severity,
    detail: event.detail,
    detected_at: new Date().toISOString(),
  });

  broadcastEvent("anomaly", {
    monitor_url: monitorUrl,
    type: event.type,
    severity: event.severity,
    detail: event.detail,
  });
}

// -- Scheduled Tasks --

// Re-compute baselines for all monitors (run daily)
export async function recomputeAllBaselines(): Promise<void> {
  const { data: monitors } = await db.from("ownership").select("website_url");
  if (!monitors) return;

  let computed = 0;
  for (const m of monitors) {
    const baseline = await learnBaseline(m.website_url);
    if (baseline) {
      await storeBaseline(baseline);
      computed++;
    }
  }
  console.log(`[Anomaly] Recomputed ${computed}/${monitors.length} baselines`);
}

let baselineInterval: ReturnType<typeof setInterval> | null = null;

export function startAnomalyDetection(): void {
  // Compute baselines on startup, then daily
  setTimeout(() => recomputeAllBaselines(), 30000);
  baselineInterval = setInterval(() => recomputeAllBaselines(), 24 * 60 * 60 * 1000);
  console.log("[Anomaly] Detection started - baselines recompute daily");
}

export function stopAnomalyDetection(): void {
  if (baselineInterval) {
    clearInterval(baselineInterval);
    baselineInterval = null;
  }
}
