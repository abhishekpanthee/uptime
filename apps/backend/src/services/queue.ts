import { getRedis, isRedisConnected } from "./redis";

interface Job {
  id: string;
  type: string;
  data: unknown;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  nextRetryAt?: number;
}

type JobHandler = (data: unknown) => Promise<void>;

const handlers = new Map<string, JobHandler>();
const QUEUE_KEY = "uptime:job_queue";
const FAILED_KEY = "uptime:job_failed";
let processing = false;

export function registerJobHandler(type: string, handler: JobHandler): void {
  handlers.set(type, handler);
}

export async function enqueueJob(type: string, data: unknown, maxAttempts = 3): Promise<string> {
  const id = crypto.randomUUID();
  const job: Job = {
    id,
    type,
    data,
    attempts: 0,
    maxAttempts,
    createdAt: Date.now(),
  };

  const redis = getRedis();
  if (redis && isRedisConnected()) {
    await redis.rpush(QUEUE_KEY, JSON.stringify(job));
  } else {
    // Fallback: process immediately in-memory
    processJob(job);
  }

  return id;
}

async function processJob(job: Job): Promise<void> {
  const handler = handlers.get(job.type);
  if (!handler) {
    console.error(`[Queue] No handler for job type: ${job.type}`);
    return;
  }

  try {
    job.attempts++;
    await handler(job.data);
  } catch (err: any) {
    console.error(`[Queue] Job ${job.id} (${job.type}) failed:`, err.message);

    if (job.attempts < job.maxAttempts) {
      // Exponential backoff: 5s, 25s, 125s...
      const delay = Math.pow(5, job.attempts) * 1000;
      job.nextRetryAt = Date.now() + delay;

      const redis = getRedis();
      if (redis && isRedisConnected()) {
        await redis.rpush(QUEUE_KEY, JSON.stringify(job));
      } else {
        setTimeout(() => processJob(job), delay);
      }
    } else {
      console.error(`[Queue] Job ${job.id} (${job.type}) exhausted retries`);
      const redis = getRedis();
      if (redis && isRedisConnected()) {
        await redis.rpush(FAILED_KEY, JSON.stringify(job));
      }
    }
  }
}

export function startQueueProcessor(intervalMs = 1000): void {
  setInterval(async () => {
    if (processing) return;
    processing = true;

    try {
      const redis = getRedis();
      if (!redis || !isRedisConnected()) return;

      const raw = await redis.lpop(QUEUE_KEY);
      if (!raw) return;

      const job: Job = JSON.parse(raw);

      // Check if job needs to wait before retry
      if (job.nextRetryAt && Date.now() < job.nextRetryAt) {
        await redis.rpush(QUEUE_KEY, raw);
        return;
      }

      await processJob(job);
    } catch (err: any) {
      console.error("[Queue] Processor error:", err.message);
    } finally {
      processing = false;
    }
  }, intervalMs);

  console.log("[Queue] Processor started");
}
