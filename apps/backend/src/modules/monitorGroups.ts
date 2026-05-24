import { Elysia, t } from "elysia";
import { db } from "../db";
import { jwtConfig, extractBearerToken } from "../middleware/auth";

const getUserId = async (headers: Record<string, string | undefined>, jwt: any) => {
  const token = extractBearerToken(headers);
  if (!token) return null;
  const profile = await jwt.verify(token);
  return profile ? Number(profile.id) : null;
};

export const monitorGroups = new Elysia({ prefix: "/monitor-groups" })
  .use(jwtConfig)

  .get("/", async ({ headers, jwt, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("monitor_groups")
      .select("*, monitor_group_members(monitor_url)")
      .order("created_at", { ascending: false });

    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  })

  .post("/", async ({ headers, jwt, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("monitor_groups").insert({
      name: body.name,
      description: body.description,
      sort_order: body.sort_order || 0,
    }).select().single();

    if (error) { set.status = 500; return { error: error.message }; }

    // Add members if provided
    if (body.monitor_urls?.length) {
      const members = body.monitor_urls.map((url: string) => ({
        group_id: data.id,
        monitor_url: url,
      }));
      await db.from("monitor_group_members").insert(members);
    }

    return data;
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 100 }),
      description: t.Optional(t.String()),
      sort_order: t.Optional(t.Number()),
      monitor_urls: t.Optional(t.Array(t.String())),
    }),
  })

  .patch("/:id", async ({ headers, jwt, params, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;

    const { data, error } = await db.from("monitor_groups").update(updateData).eq("id", params.id).select().single();
    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      description: t.Optional(t.String()),
      sort_order: t.Optional(t.Number()),
    }),
  })

  .delete("/:id", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { error } = await db.from("monitor_groups").delete().eq("id", params.id);
    if (error) { set.status = 500; return { error: error.message }; }
    return { message: "Group deleted" };
  })

  // -- Group Members --

  .post("/:id/members", async ({ headers, jwt, params, body, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { data, error } = await db.from("monitor_group_members").insert({
      group_id: Number(params.id),
      monitor_url: body.monitor_url,
    }).select().single();

    if (error) { set.status = 500; return { error: error.message }; }
    return data;
  }, {
    body: t.Object({ monitor_url: t.String() }),
  })

  .delete("/:id/members/:memberUrl", async ({ headers, jwt, params, set }) => {
    const userId = await getUserId(headers, jwt);
    if (!userId) { set.status = 401; return { error: "Unauthorized" }; }

    const { error } = await db.from("monitor_group_members")
      .delete()
      .eq("group_id", params.id)
      .eq("monitor_url", decodeURIComponent(params.memberUrl));

    if (error) { set.status = 500; return { error: error.message }; }
    return { message: "Member removed" };
  });
