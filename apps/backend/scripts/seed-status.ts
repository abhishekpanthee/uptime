import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "../src/db";

interface SiteSeedConfig {
  url: string;
  site_name?: string;
  is_public?: boolean;
  base_ping?: number;
  uptime?: number;
  ssl_days?: number;
}

interface SeedConfig {
  ownerEmail: string;
  ownerName?: string;
  ownerPassword?: string;
  days?: number;
  checkIntervalMinutes?: number;
  resetExisting?: boolean;
  sites: SiteSeedConfig[];
}

interface UserRecord {
  id: number;
  email: string;
}

const DEFAULT_CONFIG_PATH = "scripts/seed-status.config.json";
const DEFAULT_OWNER_PASSWORD = "ChangeMe123!";
const DEFAULT_DAYS = 30;
const DEFAULT_INTERVAL_MINUTES = 60;
const INSERT_CHUNK_SIZE = 500;

function parseArgs(argv: string[]) {
  const args = {
    configPath: DEFAULT_CONFIG_PATH,
    reset: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config" && argv[i + 1]) {
      args.configPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--reset") {
      args.reset = true;
    }
  }

  return args;
}

function seededNoise(...nums: number[]) {
  let sum = 0;
  for (const n of nums) sum += n;
  const x = Math.sin(sum * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toIso(date: Date) {
  return new Date(date).toISOString();
}

async function getTableColumns(tableName: string) {
  const { data, error } = await db
    .schema("information_schema")
    .from("columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", tableName);

  if (error) {
    throw new Error(`Failed reading metadata for table "${tableName}": ${error.message}`);
  }

  return new Set((data || []).map((row) => row.column_name));
}

async function ensureUser(config: SeedConfig): Promise<UserRecord> {
  const { data: existingUser, error: lookupError } = await db
    .from("users")
    .select("id, email")
    .eq("email", config.ownerEmail)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to check owner user: ${lookupError.message}`);
  }

  if (existingUser) {
    return existingUser as UserRecord;
  }

  const passwordToHash = config.ownerPassword || DEFAULT_OWNER_PASSWORD;
  const hashedPassword = await Bun.password.hash(passwordToHash);

  const { data: insertedUser, error: insertError } = await db
    .from("users")
    .insert({
      name: config.ownerName || "Status Seed User",
      email: config.ownerEmail,
      password: hashedPassword,
    })
    .select("id, email")
    .single();

  if (insertError || !insertedUser) {
    throw new Error(`Failed creating owner user: ${insertError?.message || "Unknown error"}`);
  }

  return insertedUser as UserRecord;
}

async function upsertOwnershipRows(
  owner: UserRecord,
  config: SeedConfig,
  ownershipColumns: Set<string>
) {
  const rows = config.sites.map((site) => {
    const payload: Record<string, unknown> = {
      website_url: site.url,
    };

    if (ownershipColumns.has("owner_id")) {
      payload.owner_id = owner.id;
    } else if (ownershipColumns.has("owner_email")) {
      payload.owner_email = owner.email;
    } else {
      throw new Error("ownership table has neither owner_id nor owner_email column");
    }

    if (ownershipColumns.has("is_public")) {
      payload.is_public = site.is_public ?? true;
    }
    if (ownershipColumns.has("site_name")) {
      payload.site_name = site.site_name || site.url.replace(/^https?:\/\//, "");
    }
    if (ownershipColumns.has("ssl_days") && site.ssl_days !== undefined) {
      payload.ssl_days = site.ssl_days;
    }

    return payload;
  });

  const { error } = await db.from("ownership").upsert(rows, {
    onConflict: "website_url",
  });

  if (error) {
    throw new Error(`Failed upserting ownership rows: ${error.message}`);
  }
}

function generateAnalyticsRows(
  config: SeedConfig,
  analyticsColumns: Set<string>
) {
  const days = Math.max(1, Math.floor(config.days || DEFAULT_DAYS));
  const intervalMinutes = clamp(
    Math.floor(config.checkIntervalMinutes || DEFAULT_INTERVAL_MINUTES),
    1,
    1440
  );

  const steps = Math.max(1, Math.floor((days * 24 * 60) / intervalMinutes));
  const now = new Date();

  const allRows: Record<string, unknown>[] = [];

  config.sites.forEach((site, siteIndex) => {
    const basePing = Math.max(30, Math.floor(site.base_ping ?? 220));
    const uptimePct = clamp(site.uptime ?? 99.5, 70, 100);
    const uptimeProbability = uptimePct / 100;

    for (let step = steps - 1; step >= 0; step -= 1) {
      const timestamp = new Date(now.getTime() - step * intervalMinutes * 60 * 1000);
      const tick = steps - step;

      const dailyWave = Math.sin((tick / 24) * 0.45) * 26;
      const jitter = (seededNoise(siteIndex + 1, tick) - 0.5) * 110;
      const spikeChance = seededNoise(siteIndex + 3, tick, 77);
      const spike = spikeChance > 0.988 ? 220 + seededNoise(tick, siteIndex) * 520 : 0;

      const successRoll = seededNoise(siteIndex + 11, tick, 19);
      const isUp = successRoll <= uptimeProbability;
      const statusCode = isUp ? 200 : spikeChance > 0.5 ? 503 : 500;
      const ping = isUp ? Math.max(20, Math.round(basePing + dailyWave + jitter + spike)) : null;

      const row: Record<string, unknown> = {
        website_url: site.url,
        ping5: ping,
        checked_at: toIso(timestamp),
      };

      if (analyticsColumns.has("status")) {
        row.status = statusCode;
      }

      allRows.push(row);
    }
  });

  return allRows;
}

async function insertAnalyticsRows(rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE);
    const { error } = await db.from("analytics").insert(chunk);
    if (error) {
      throw new Error(`Failed inserting analytics chunk ${i}-${i + chunk.length}: ${error.message}`);
    }
  }
}

async function main() {
  const { configPath, reset } = parseArgs(process.argv.slice(2));
  const absoluteConfigPath = resolve(process.cwd(), configPath);

  const configRaw = await readFile(absoluteConfigPath, "utf8");
  const config = JSON.parse(configRaw) as SeedConfig;

  if (!config.ownerEmail) {
    throw new Error("Missing ownerEmail in config");
  }
  if (!Array.isArray(config.sites) || config.sites.length === 0) {
    throw new Error("Config must include at least one site");
  }
  for (const site of config.sites) {
    if (!site.url || !/^https?:\/\//i.test(site.url)) {
      throw new Error(`Invalid site url "${site.url}". Use full http/https URL.`);
    }
  }

  const shouldReset = Boolean(reset || config.resetExisting);
  const urls = config.sites.map((site) => site.url);

  console.log(`\n[seed-status] Reading config: ${absoluteConfigPath}`);
  console.log(`[seed-status] Sites: ${urls.length}`);
  console.log(`[seed-status] Reset existing data: ${shouldReset ? "yes" : "no"}`);

  const ownershipColumns = await getTableColumns("ownership");
  const analyticsColumns = await getTableColumns("analytics");

  const owner = await ensureUser(config);
  await upsertOwnershipRows(owner, config, ownershipColumns);

  if (shouldReset) {
    const { error: analyticsDeleteError } = await db
      .from("analytics")
      .delete()
      .in("website_url", urls);
    if (analyticsDeleteError) {
      throw new Error(`Failed deleting existing analytics: ${analyticsDeleteError.message}`);
    }
  }

  const analyticsRows = generateAnalyticsRows(config, analyticsColumns);
  await insertAnalyticsRows(analyticsRows);

  console.log(`[seed-status] Owner user: ${owner.email} (id=${owner.id})`);
  console.log(`[seed-status] Inserted analytics rows: ${analyticsRows.length}`);
  console.log("[seed-status] Done.");
}

main().catch((error) => {
  console.error("[seed-status] Failed:", error?.message || error);
  process.exit(1);
});
