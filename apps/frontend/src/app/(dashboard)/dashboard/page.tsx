"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import Link from "next/link";
import {
  Activity,
  Globe,
  Lock,
  Plus,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

interface WebsiteMonitor {
  website_url: string;
  site_name: string | null;
  is_public: boolean;
  ssl_days: number | null;
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [websites, setWebsites] = useState<WebsiteMonitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadMonitors() {
      try {
        const res = await api.get("/websites");
        
        if (Array.isArray(res.data)) {
          setWebsites(res.data);
        } else {
          console.warn("API returned non-array:", res.data);
          setWebsites([]); 
        }
      } catch (err) {
        console.error("Failed to load monitors", err);
        setWebsites([]); 
      } finally {
        setLoading(false);
      }
    }
    loadMonitors();
  }, [isAuthenticated]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-5xl p-2">
        <div className="mb-8 h-8 w-56 animate-pulse rounded bg-[#dbe5f3]" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-[#dbe5f3]" />
          ))}
        </div>
      </div>
    );
  }

  const publicCount = websites.filter((site) => site.is_public).length;
  const sslWarningCount = websites.filter(
    (site) => site.ssl_days !== null && site.ssl_days <= 14
  ).length;

  return (
    <div>
      <div className="surface-panel fade-up mb-6 overflow-hidden">
        <div className="border-b border-[var(--border)] bg-gradient-to-r from-[#0f4c81] to-[#1b6aa8] px-6 py-8 text-white sm:flex sm:items-end sm:justify-between sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d5e9ff]">
              Admin Console
            </p>
            <h1 className="mt-2 text-3xl font-bold">Service Monitoring Dashboard</h1>
            <p className="mt-2 text-sm text-[#d6e8fb]">
              Manage service checks, public visibility, and operational health.
            </p>
          </div>
          <Link href="/dashboard/add" className="btn-primary mt-4 sm:mt-0">
            <Plus className="h-4 w-4" />
            Add Monitor
          </Link>
        </div>
        <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:px-8">
          <DashboardMetric
            label="Total Monitors"
            value={String(websites.length)}
            helper="All configured sites"
          />
          <DashboardMetric
            label="Public on /status"
            value={String(publicCount)}
            helper="Visible to students"
          />
          <DashboardMetric
            label="SSL Warnings"
            value={String(sslWarningCount)}
            helper="<= 14 days remaining"
            tone={sslWarningCount > 0 ? "warning" : "success"}
          />
        </div>
      </div>

      {websites.length === 0 ? (
        <div className="surface-panel text-center">
          <div className="mx-auto max-w-xl px-6 py-16">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eff4fb] text-[#0f4c81]">
              <Activity className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--ink)]">No monitors created yet</h2>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              Add your first monitor to begin tracking uptime for college web services.
            </p>
            <Link href="/dashboard/add" className="btn-primary mt-6">
              <Plus className="h-4 w-4" />
              Create First Monitor
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {websites.map((site, index) => (
            <Link
              key={site.website_url}
              href={`/dashboard/monitor/${encodeURIComponent(site.website_url)}`}
              className="surface-panel fade-up group p-6 hover:-translate-y-0.5 hover:border-[#bfd0e6]"
              style={{ animationDelay: `${Math.min(index * 70, 300)}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eff4fb] text-[#0f4c81]">
                  <Globe className="h-5 w-5" />
                </div>
                {site.is_public ? (
                  <span className="badge bg-[#e9f3ff] text-[#0f4c81]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Public
                  </span>
                ) : (
                  <span className="badge bg-[#f2f5f9] text-[#61748f]">Private</span>
                )}
              </div>

              <h3 className="mt-5 truncate text-lg font-semibold text-[var(--ink)]">
                {site.site_name || site.website_url.replace(/^https?:\/\//, "")}
              </h3>
              <p className="mt-1 truncate text-xs text-[var(--ink-soft)]">{site.website_url}</p>

              <div className="mt-5 space-y-2.5 text-sm text-[var(--ink-soft)]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
                  Active monitor
                </div>
                {site.ssl_days !== null && site.ssl_days !== undefined ? (
                  <SslFlag days={site.ssl_days} />
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <Lock className="h-3.5 w-3.5" />
                    SSL info unavailable
                  </div>
                )}
              </div>

              <div className="mt-5 border-t border-[var(--border)] pt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#0f4c81]">
                Open details
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneColor =
    tone === "success"
      ? "text-[var(--success)]"
      : tone === "warning"
      ? "text-[var(--warning)]"
      : "text-[var(--ink)]";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white px-4 py-3.5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${toneColor}`}>{value}</p>
      <p className="mt-1 text-xs text-[var(--ink-soft)]">{helper}</p>
    </div>
  );
}

function SslFlag({ days }: { days: number }) {
  if (days <= 7) {
    return (
      <p className="inline-flex items-center gap-2 rounded-full bg-[#fdebea] px-2.5 py-1 text-xs font-semibold text-[#b22d24]">
        <TriangleAlert className="h-3.5 w-3.5" />
        SSL {days}d (urgent)
      </p>
    );
  }

  if (days <= 30) {
    return (
      <p className="inline-flex items-center gap-2 rounded-full bg-[#fff3df] px-2.5 py-1 text-xs font-semibold text-[#a36610]">
        <Lock className="h-3.5 w-3.5" />
        SSL {days}d (renew soon)
      </p>
    );
  }

  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-[#e5f7ed] px-2.5 py-1 text-xs font-semibold text-[#0d8a4a]">
      <Lock className="h-3.5 w-3.5" />
      SSL {days}d
    </p>
  );
}
