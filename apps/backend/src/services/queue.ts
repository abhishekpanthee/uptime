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
const queue: Job[] = [];
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

  queue.push(job);
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
      const delay = Math.pow(5, job.attempts) * 1000;
      job.nextRetryAt = Date.now() + delay;
      queue.push(job);
    } else {
      console.error(`[Queue] Job ${job.id} (${job.type}) exhausted retries`);
    }
  }
}

export function startQueueProcessor(intervalMs = 1000): void {
  setInterval(async () => {
    if (processing) return;
    processing = true;

    try {
      const job = queue.shift();
      if (!job) return;

      if (job.nextRetryAt && Date.now() < job.nextRetryAt) {
        queue.push(job);
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
