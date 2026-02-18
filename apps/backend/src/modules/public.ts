import { Elysia } from "elysia";
import { db } from "../db";

export const publicRoutes = new Elysia({ prefix: "/public" })
  .get("/status", async ({ set }) => {
    try {
      // 1. Fetch all public websites
      const { data: sites, error } = await db
        .from("ownership")
        .select("website_url, ssl_days")
        .eq("is_public", true);

      if (error) throw error;
      if (!sites) return [];

      // 2. Get the latest status for each site
      const statusList = await Promise.all(
        sites.map(async (site) => {
          const { data: latestPing } = await db
            .from("analytics")
            .select("status, ping5, checked_at")
            .eq("website_url", site.website_url)
            .order("checked_at", { ascending: false })
            .limit(1)
            .single();

          return {
            url: site.website_url,
            ssl_days: site.ssl_days,
            status: latestPing?.status || 0,
            ping: latestPing?.ping5 || null,
            last_checked: latestPing?.checked_at || null,
          };
        })
      );

      return statusList;
    } catch (err: any) {
      set.status = 500;
      return { error: err.message };
    }
  });