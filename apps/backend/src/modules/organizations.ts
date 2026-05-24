import { Elysia, t } from "elysia";
import { db } from "../db";
import { jwtConfig, extractBearerToken } from "../middleware/auth";
import { logAudit } from "./audit";
import { sendEmail } from "../services/email";
import crypto from "crypto";

const getUserId = async (headers: Record<string, string | undefined>, jwt: any) => {
  const token = extractBearerToken(headers);
  if (!token) return null;
  const profile = await jwt.verify(token);
  return profile ? Number(profile.id) : null;
};

export const organizations = new Elysia({ prefix: "/organizations" })
  .use(jwtConfig)

  // List user's organizations
  .get("/", async ({ headers, jwt, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db
      .from("org_members")
      .select("role, organizations(id, name, slug, plan, created_at)")
      .eq("user_id", userId);

    if (error) { set.status = 500; return { error: error.message }; }
    return data?.map((m: any) => ({ ...m.organizations, role: m.role })) || [];
  })

  // Create organization
  .post("/", async ({ headers, jwt, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    // Generate slug from name
    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const { data: org, error } = await db.from("organizations").insert({
      name: body.name,
      slug,
    }).select().single();

    if (error) { set.status = 500; return { error: error.message }; }

    // Add creator as owner
    await db.from("org_members").insert({
      org_id: org.id,
      user_id: userId,
      role: "owner",
      invited_by: userId,
    });

    logAudit(userId, "create", "organization", String(org.id), { name: body.name });
    return org;
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 100 }),
      slug: t.Optional(t.String({ maxLength: 100 })),
    }),
  })

  // Get organization details
  .get("/:id", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data: membership } = await db.from("org_members")
      .select("role").eq("org_id", params.id).eq("user_id", userId).single();
    if (!membership) { set.status = 403; return { error: "Not a member" }; }

    const { data: org } = await db.from("organizations").select("*").eq("id", params.id).single();
    if (!org) { set.status = 404; return { error: "Not found" }; }

    const { data: members } = await db.from("org_members")
      .select("role, joined_at, users(id, name, email)")
      .eq("org_id", params.id);

    return { ...org, members: members || [], your_role: membership.role };
  })

  // Update organization
  .patch("/:id", async ({ headers, jwt, params, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data: membership } = await db.from("org_members")
      .select("role").eq("org_id", params.id).eq("user_id", userId).single();
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      set.status = 403; return { error: "Insufficient permissions" };
    }

    const { data, error } = await db.from("organizations").update({
      name: body.name,
      settings: body.settings,
    }).eq("id", params.id).select().single();

    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(userId, "update", "organization", String(params.id));
    return data;
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      settings: t.Optional(t.Object({}, { additionalProperties: true })),
    }),
  })

  // Delete organization
  .delete("/:id", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data: membership } = await db.from("org_members")
      .select("role").eq("org_id", params.id).eq("user_id", userId).single();
    if (!membership || membership.role !== "owner") {
      set.status = 403; return { error: "Only owner can delete organization" };
    }

    const { error } = await db.from("organizations").delete().eq("id", params.id);
    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(userId, "delete", "organization", String(params.id));
    return { message: "Organization deleted" };
  })

  // -- Member Management --

  // Invite member
  .post("/:id/invite", async ({ headers, jwt, params, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data: membership } = await db.from("org_members")
      .select("role").eq("org_id", params.id).eq("user_id", userId).single();
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      set.status = 403; return { error: "Insufficient permissions" };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { data: invite, error } = await db.from("invitations").insert({
      org_id: Number(params.id),
      email: body.email,
      role: body.role || "viewer",
      token,
      expires_at: expiresAt.toISOString(),
      invited_by: userId,
    }).select().single();

    if (error) { set.status = 500; return { error: error.message }; }

    // Send invitation email
    const baseUrl = Bun.env.APP_URL || "http://localhost:3000";
    const { data: org } = await db.from("organizations").select("name").eq("id", params.id).single();

    await sendEmail({
      to: body.email,
      subject: `Invitation to join ${org?.name || "organization"} - Uptime Monitor`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2>You have been invited</h2>
          <p>You have been invited to join <strong>${org?.name || "an organization"}</strong> as a <strong>${body.role || "viewer"}</strong>.</p>
          <a href="${baseUrl}/accept-invite?token=${token}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">Accept Invitation</a>
          <p style="color:#6b7280;font-size:12px">This invitation expires in 7 days.</p>
        </div>
      `,
    });

    logAudit(userId, "invite", "org_member", body.email, { role: body.role, org_id: params.id });
    return invite;
  }, {
    body: t.Object({
      email: t.String({ format: "email" }),
      role: t.Optional(t.String()),
    }),
  })

  // Accept invitation
  .post("/accept-invite", async ({ body, set }) => {
    const { data: invite } = await db.from("invitations")
      .select("*")
      .eq("token", body.token)
      .is("accepted_at", null)
      .single();

    if (!invite) { set.status = 400; return { error: "Invalid or expired invitation" }; }
    if (new Date(invite.expires_at) < new Date()) {
      set.status = 400; return { error: "Invitation has expired" };
    }

    // Find user by email
    const { data: user } = await db.from("users").select("id").eq("email", invite.email).single();
    if (!user) { set.status = 400; return { error: "Please create an account first with the invited email" }; }

    // Add to org
    await db.from("org_members").insert({
      org_id: invite.org_id,
      user_id: user.id,
      role: invite.role,
      invited_by: invite.invited_by,
    });

    // Mark invitation as accepted
    await db.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

    return { message: "Invitation accepted" };
  }, {
    body: t.Object({
      token: t.String(),
    }),
  })

  // Update member role
  .patch("/:id/members/:userId", async ({ headers, jwt, params, body, set }) => {
    const currentUserId = await getUserId(headers, jwt);
    if (!currentUserId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data: membership } = await db.from("org_members")
      .select("role").eq("org_id", params.id).eq("user_id", currentUserId).single();
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      set.status = 403; return { error: "Insufficient permissions" };
    }

    // Cannot change own role
    if (Number(params.userId) === currentUserId) {
      set.status = 400; return { error: "Cannot change your own role" };
    }

    const { data, error } = await db.from("org_members")
      .update({ role: body.role })
      .eq("org_id", params.id)
      .eq("user_id", params.userId)
      .select().single();

    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(currentUserId, "update_role", "org_member", String(params.userId), { role: body.role, org_id: params.id });
    return data;
  }, {
    body: t.Object({
      role: t.String(),
    }),
  })

  // Remove member
  .delete("/:id/members/:userId", async ({ headers, jwt, params, set }) => {
    const currentUserId = await getUserId(headers, jwt);
    if (!currentUserId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data: membership } = await db.from("org_members")
      .select("role").eq("org_id", params.id).eq("user_id", currentUserId).single();
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      set.status = 403; return { error: "Insufficient permissions" };
    }

    if (Number(params.userId) === currentUserId) {
      set.status = 400; return { error: "Cannot remove yourself" };
    }

    const { error } = await db.from("org_members").delete().eq("org_id", params.id).eq("user_id", params.userId);
    if (error) { set.status = 500; return { error: error.message }; }
    logAudit(currentUserId, "remove", "org_member", String(params.userId), { org_id: params.id });
    return { message: "Member removed" };
  })

  // -- Audit Log --

  .get("/:id/audit", async ({ headers, jwt, params, query, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data: membership } = await db.from("org_members")
      .select("role").eq("org_id", params.id).eq("user_id", userId).single();
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      set.status = 403; return { error: "Insufficient permissions" };
    }

    const limit = Math.min(100, Number((query as any)?.limit) || 50);
    const { data, error } = await db.from("audit_logs")
      .select("*")
      .eq("org_id", params.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  });
