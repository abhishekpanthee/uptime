import { Elysia } from "elysia";
import { db } from "../db";
import { jwtConfig, extractBearerToken } from "./auth";

type Role = "owner" | "admin" | "editor" | "viewer";

const PERMISSIONS: Record<string, Role[]> = {
  "manage_org": ["owner", "admin"],
  "manage_members": ["owner", "admin"],
  "create_monitor": ["owner", "admin", "editor"],
  "delete_monitor": ["owner", "admin", "editor"],
  "create_incident": ["owner", "admin", "editor"],
  "update_incident": ["owner", "admin", "editor"],
  "manage_alerts": ["owner", "admin", "editor"],
  "manage_maintenance": ["owner", "admin", "editor"],
  "view_dashboard": ["owner", "admin", "editor", "viewer"],
  "view_status": ["owner", "admin", "editor", "viewer"],
  "manage_billing": ["owner"],
  "manage_api_keys": ["owner", "admin"],
  "view_audit_log": ["owner", "admin"],
};

export function hasPermission(role: Role, permission: string): boolean {
  const allowed = PERMISSIONS[permission];
  return !!allowed && allowed.includes(role);
}

export async function getUserOrgRole(userId: number, orgId: number): Promise<Role | null> {
  const { data } = await db
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .single();

  return data ? (data.role as Role) : null;
}

export async function requirePermission(
  headers: Record<string, string | undefined>,
  jwt: any,
  permission: string,
  orgId?: number
): Promise<{ userId: number; role: Role } | null> {
  const token = extractBearerToken(headers);
  if (!token) return null;

  const profile = await jwt.verify(token);
  if (!profile) return null;

  const userId = Number(profile.id);

  if (!orgId) {
    // If no org specified, check if user has any org with the permission
    const { data: memberships } = await db
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", userId);

    if (!memberships || memberships.length === 0) {
      // No org memberships - treat as owner of a virtual personal workspace
      return { userId, role: "owner" };
    }

    // Check if any membership grants the permission
    for (const m of memberships) {
      if (hasPermission(m.role as Role, permission)) {
        return { userId, role: m.role as Role };
      }
    }
    return null;
  }

  const role = await getUserOrgRole(userId, orgId);
  if (!role) return null;
  if (!hasPermission(role, permission)) return null;

  return { userId, role };
}
