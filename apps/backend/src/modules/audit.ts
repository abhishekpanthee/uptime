import { db } from "../db";

export async function logAudit(
  userId: number | null,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  try {
    const ipAddress = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request?.headers.get("x-real-ip")
      || null;
    const userAgent = request?.headers.get("user-agent") || null;

    await db.from("audit_logs").insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId || null,
      details: details || null,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (err: any) {
    console.error("[Audit] Failed to log:", err.message);
  }
}
