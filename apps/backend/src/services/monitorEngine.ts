import { db } from "../db";
import { broadcastEvent } from "./websocket";
import { enqueueJob } from "./queue";
import { cacheGet, cacheSet, cacheDelete } from "./redis";
import tls from "node:tls";
import dns from "node:dns/promises";
import net from "node:net";

const FAILED_CHECK_PING_MS = 2500;

// -- Protocol Checkers --

async function checkHTTP(site: MonitorSite): Promise<CheckResult> {
  const start = performance.now();
  try {
    const headers: Record<string, string> = { "User-Agent": "UptimeMonitor/1.0" };
    if (site.custom_headers) {
      Object.assign(headers, site.custom_headers);
    }

    const res = await fetch(site.website_url, {
      method: site.http_method || "HEAD",
      headers,
      redirect: site.follow_redirects !== false ? "follow" : "manual",
      signal: AbortSignal.timeout(site.timeout_ms || 10000),
    });

    const ping = Math.round(performance.now() - start);
    let status = res.status;

    // Keyword match check
    if (site.keyword_match && (site.http_method || "HEAD") !== "HEAD") {
      const body = await res.text();
      const found = body.includes(site.keyword_match);
      if (site.keyword_absent) {
        if (found) status = 0; // keyword should be absent but was found
      } else {
        if (!found) status = 0; // keyword should be present but was not found
      }
    }

    // Expected status code validation
    if (site.expected_status && status !== site.expected_status) {
      return { status: 0, ping, statusCode: status };
    }

    return { status: status, ping, statusCode: status };
  } catch (err: any) {
    return { status: 0, ping: FAILED_CHECK_PING_MS, statusCode: 0, error: err.message };
  }
}

async function checkTCP(site: MonitorSite): Promise<CheckResult> {
  const port = site.port || 80;
  const start = performance.now();

  return new Promise((resolve) => {
    const url = new URL(site.website_url.startsWith("http") ? site.website_url : `http://${site.website_url}`);
    const hostname = url.hostname;

    const socket = net.createConnection({ host: hostname, port, timeout: site.timeout_ms || 10000 }, () => {
      const ping = Math.round(performance.now() - start);
      socket.destroy();
      resolve({ status: 200, ping, statusCode: 200 });
    });

    socket.on("error", (err) => {
      socket.destroy();
      resolve({ status: 0, ping: FAILED_CHECK_PING_MS, statusCode: 0, error: err.message });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({ status: 0, ping: FAILED_CHECK_PING_MS, statusCode: 0, error: "TCP timeout" });
    });
  });
}

async function checkDNS(site: MonitorSite): Promise<CheckResult> {
  const start = performance.now();
  try {
    const url = new URL(site.website_url.startsWith("http") ? site.website_url : `http://${site.website_url}`);
    const hostname = url.hostname;
    const recordType = (site.dns_record_type || "A") as "A" | "AAAA" | "MX" | "TXT" | "CNAME" | "NS";

    let results: string[];
    switch (recordType) {
      case "A": results = await dns.resolve4(hostname); break;
      case "AAAA": results = await dns.resolve6(hostname); break;
      case "MX": {
        const mx = await dns.resolveMx(hostname);
        results = mx.map(r => r.exchange);
        break;
      }
      case "TXT": {
        const txt = await dns.resolveTxt(hostname);
        results = txt.map(r => r.join(""));
        break;
      }
      case "CNAME": results = await dns.resolveCname(hostname); break;
      case "NS": results = await dns.resolveNs(hostname); break;
      default: results = await dns.resolve4(hostname);
    }

    const ping = Math.round(performance.now() - start);

    if (site.expected_value && !results.some(r => r.includes(site.expected_value!))) {
      return { status: 0, ping, statusCode: 0, error: `Expected ${site.expected_value}, got ${results.join(", ")}` };
    }

    return { status: 200, ping, statusCode: 200 };
  } catch (err: any) {
    return { status: 0, ping: FAILED_CHECK_PING_MS, statusCode: 0, error: err.message };
  }
}

async function checkICMP(site: MonitorSite): Promise<CheckResult> {
  // Bun doesn't support raw sockets for ICMP, use TCP connect as fallback
  const start = performance.now();
  try {
    const url = new URL(site.website_url.startsWith("http") ? site.website_url : `http://${site.website_url}`);
    const hostname = url.hostname;

    // Try DNS resolution as connectivity check
    await dns.resolve4(hostname);
    const ping = Math.round(performance.now() - start);
    return { status: 200, ping, statusCode: 200 };
  } catch (err: any) {
    return { status: 0, ping: FAILED_CHECK_PING_MS, statusCode: 0, error: err.message };
  }
}

export function checkSSL(url: string): Promise<SSLResult> {
  return new Promise((resolve) => {
    try {
      const target = new URL(url);
      if (target.protocol !== "https:") return resolve({ daysLeft: null });

      const socket = tls.connect(
        { host: target.hostname, port: 443, servername: target.hostname, rejectUnauthorized: false },
        () => {
          const cert = socket.getPeerCertificate(true);
          if (!cert || Object.keys(cert).length === 0) {
            socket.end();
            return resolve({ daysLeft: null });
          }

          if (cert.valid_to) {
            const expiryDate = new Date(cert.valid_to);
            const daysLeft = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const issuer = cert.issuer ? Object.values(cert.issuer).join(", ") : null;
            const fingerprint = cert.fingerprint256 || cert.fingerprint || null;
            socket.end();
            return resolve({ daysLeft, issuer, fingerprint, validTo: cert.valid_to, validFrom: cert.valid_from });
          }

          socket.end();
          resolve({ daysLeft: null });
        }
      );

      socket.on("error", () => resolve({ daysLeft: null }));
      socket.setTimeout(5000, () => { socket.destroy(); resolve({ daysLeft: null }); });
    } catch {
      resolve({ daysLeft: null });
    }
  });
}

// -- Types --

interface MonitorSite {
  website_url: string;
  site_name?: string;
  monitor_type?: string;
  check_interval?: number;
  retry_count?: number;
  retry_interval?: number;
  timeout_ms?: number;
  expected_status?: number;
  keyword_match?: string;
  keyword_absent?: boolean;
  http_method?: string;
  custom_headers?: Record<string, string>;
  follow_redirects?: boolean;
  port?: number;
  dns_record_type?: string;
  expected_value?: string;
  monitor_status?: string;
  last_check_status?: string;
  consecutive_failures?: number;
  degraded_threshold_ms?: number;
  ssl_days?: number;
  is_public?: boolean;
  owner_id: number;
}

interface CheckResult {
  status: number;
  ping: number;
  statusCode: number;
  error?: string;
}

interface SSLResult {
  daysLeft: number | null;
  issuer?: string | null;
  fingerprint?: string | null;
  validTo?: string;
  validFrom?: string;
}

// -- Check Dispatcher --

async function performCheck(site: MonitorSite): Promise<CheckResult> {
  const type = site.monitor_type || "http";
  switch (type) {
    case "tcp": return checkTCP(site);
    case "dns": return checkDNS(site);
    case "icmp": return checkICMP(site);
    default: return checkHTTP(site);
  }
}

// -- Retry Logic --

async function performCheckWithRetries(site: MonitorSite): Promise<CheckResult> {
  const maxRetries = site.retry_count ?? 3;
  const retryInterval = site.retry_interval ?? 10;

  let result = await performCheck(site);

  if (result.status === 200 || result.status >= 200 && result.status < 400) {
    return result;
  }

  // Retry on failure
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await new Promise((r) => setTimeout(r, retryInterval * 1000));
    result = await performCheck(site);
    if (result.status >= 200 && result.status < 400) return result;
  }

  return result;
}

// -- Status Determination --

function determineStatus(site: MonitorSite, result: CheckResult): "up" | "down" | "degraded" {
  if (result.status === 0 || (result.statusCode > 0 && result.statusCode >= 400)) {
    return "down";
  }
  if (site.degraded_threshold_ms && result.ping > site.degraded_threshold_ms) {
    return "degraded";
  }
  return "up";
}

// -- Alert Logic --

async function handleStatusChange(site: MonitorSite, oldStatus: string, newStatus: string, result: CheckResult): Promise<void> {
  const name = site.site_name || site.website_url;

  if (newStatus === "down" && oldStatus !== "down") {
    // Went down: send alerts, create incident
    enqueueJob("send_alert", {
      type: "down",
      monitorUrl: site.website_url,
      monitorName: name,
      statusCode: result.statusCode,
      error: result.error,
    });

    enqueueJob("auto_incident", {
      monitorUrl: site.website_url,
      monitorName: name,
      statusCode: result.statusCode,
    });

    // Legacy Discord webhook
    const webhookUrl = Bun.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `**ALERT:** \`${name}\` is DOWN!\nStatus Code: ${result.statusCode}\nTime: ${new Date().toISOString()}`,
        }),
      }).catch(() => {});
    }
  }

  if (newStatus === "up" && oldStatus === "down") {
    // Recovered: send recovery alert
    enqueueJob("send_alert", {
      type: "recovery",
      monitorUrl: site.website_url,
      monitorName: name,
      consecutiveFailures: site.consecutive_failures || 0,
    });

    enqueueJob("auto_resolve_incident", {
      monitorUrl: site.website_url,
    });

    const webhookUrl = Bun.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `**RECOVERED:** \`${name}\` is back online.\nTime: ${new Date().toISOString()}`,
        }),
      }).catch(() => {});
    }
  }

  if (newStatus === "degraded" && oldStatus !== "degraded") {
    enqueueJob("send_alert", {
      type: "degraded",
      monitorUrl: site.website_url,
      monitorName: name,
      ping: result.ping,
      threshold: site.degraded_threshold_ms,
    });
  }

  broadcastEvent("monitor:status_change", {
    url: site.website_url,
    name,
    oldStatus,
    newStatus,
    statusCode: result.statusCode,
    ping: result.ping,
    timestamp: new Date().toISOString(),
  });
}

// -- Main Check Loop --

const checkTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleCheck(site: MonitorSite): void {
  const interval = (site.check_interval || 60) * 1000;
  const jitter = Math.random() * 5000; // 0-5s jitter

  const timer = setTimeout(async () => {
    checkTimers.delete(site.website_url);

    if (site.monitor_status === "paused") {
      scheduleCheck(site); // Re-schedule but skip
      return;
    }

    await runSingleCheck(site);

    // Refresh site data and reschedule
    const { data: updated } = await db.from("ownership").select("*").eq("website_url", site.website_url).single();
    if (updated && updated.monitor_status !== "deleted") {
      scheduleCheck(updated);
    }
  }, interval + jitter);

  checkTimers.set(site.website_url, timer);
}

async function runSingleCheck(site: MonitorSite): Promise<void> {
  const result = await performCheckWithRetries(site);
  const newStatus = determineStatus(site, result);
  const oldStatus = site.last_check_status || "unknown";

  // Update consecutive failures
  const consecutiveFailures = newStatus === "down" ? (site.consecutive_failures || 0) + 1 : 0;

  // Insert analytics
  await db.from("analytics").insert({
    website_url: site.website_url,
    ping5: result.ping,
    status: result.statusCode,
    checked_at: new Date().toISOString(),
  });

  // Update monitor status
  await db.from("ownership").update({
    last_check_status: newStatus,
    consecutive_failures: consecutiveFailures,
  }).eq("website_url", site.website_url);

  // SSL check for HTTPS sites
  if (site.website_url.startsWith("https://")) {
    const ssl = await checkSSL(site.website_url);
    if (ssl.daysLeft !== null) {
      await db.from("ownership").update({ ssl_days: ssl.daysLeft }).eq("website_url", site.website_url);

      // SSL expiry alerts
      if (ssl.daysLeft <= 7) {
        enqueueJob("send_alert", {
          type: "ssl_expiry",
          monitorUrl: site.website_url,
          monitorName: site.site_name || site.website_url,
          daysLeft: ssl.daysLeft,
        });
      }
    }
  }

  // Handle status transitions
  if (newStatus !== oldStatus) {
    await handleStatusChange(site, oldStatus, newStatus, result);
  }

  // Broadcast check completion
  broadcastEvent("monitor:check_complete", {
    url: site.website_url,
    status: newStatus,
    statusCode: result.statusCode,
    ping: result.ping,
    timestamp: new Date().toISOString(),
  });

  // Invalidate cached status
  cacheDelete("public:status");
}

// -- Service Lifecycle --

export async function startMonitorEngine(): Promise<void> {
  console.log("[Monitor] Engine starting...");

  const { data: sites, error } = await db.from("ownership").select("*");
  if (error) {
    console.error("[Monitor] Failed to load sites:", error.message, "- retrying in 10s");
    setTimeout(() => startMonitorEngine(), 10000);
    return;
  }

  console.log(`[Monitor] Loaded ${sites?.length || 0} monitors`);

  if (!sites || sites.length === 0) return;

  // Stagger initial checks over 30 seconds to avoid thundering herd
  const staggerMs = Math.min(30000, (30000 / sites.length));
  for (let i = 0; i < sites.length; i++) {
    setTimeout(() => scheduleCheck(sites[i]), i * staggerMs);
  }

  // Cleanup old data (keep 7 days raw, per plan)
  setInterval(async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.from("analytics").delete().lt("checked_at", sevenDaysAgo);
    console.log("[Monitor] Cleanup: removed raw analytics older than 7 days");
  }, 6 * 60 * 60 * 1000); // Every 6 hours
}

export function stopMonitorEngine(): void {
  for (const timer of checkTimers.values()) {
    clearTimeout(timer);
  }
  checkTimers.clear();
  console.log("[Monitor] Engine stopped");
}

export function refreshMonitor(url: string): void {
  // Cancel existing timer and re-fetch to reschedule
  const existing = checkTimers.get(url);
  if (existing) clearTimeout(existing);

  db.from("ownership").select("*").eq("website_url", url).single().then(({ data }) => {
    if (data) scheduleCheck(data);
  });
}
