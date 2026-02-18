"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PingChart } from "@/components/charts/PingChart";
import {
  Activity,
  ArrowLeft,
  Clock3,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Server,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface SiteData {
  is_public: boolean;
  ssl_days: number | null;
  site_name?: string | null;
}

interface StatsData {
  avg_ping: number | null;
  uptime_percentage: number | null;
}

interface HistoryPoint {
  time: string;
  ping: number | null;
  status: number | null;
}

interface RawHistoryItem {
  checked_at: string;
  ping5: number | string | null;
  status: number | null;
}

export default function MonitorDetailsPage() {
  const params = useParams();
  const rawUrl = decodeURIComponent(params.url as string);
  const router = useRouter();
  
  const [range, setRange] = useState("24h");
  const [siteData, setSiteData] = useState<SiteData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this monitor?")) return;
    try {
      await api.delete("/websites", { data: { url: rawUrl } }); 
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to delete monitor", error);
      alert("Failed to delete");
    }
  }

  const togglePublicStatus = async () => {
    if (!siteData) return;

    setToggling(true);
    try {
      const newStatus = !siteData.is_public;
      await api.patch(`/websites/${encodeURIComponent(rawUrl)}/toggle-public`, {
        is_public: newStatus
      });
      setSiteData((prev) => (prev ? { ...prev, is_public: newStatus } : prev));
    } catch (err) {
      console.error("Failed to toggle public status", err);
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await api.get(`/websites/${encodeURIComponent(rawUrl)}/stats?range=${range}`);
        
        setSiteData(res.data.site);
        setStats(res.data.stats);

        const formattedData = (res.data.history as RawHistoryItem[]).map((item) => {
          let rawDate = item.checked_at;
          if (typeof rawDate === "string" && !rawDate.endsWith("Z")) {
             rawDate += "Z";
          }
          const dateObj = new Date(rawDate);
          
          const timeStr =
            range === "7d" || range === "30d"
              ? `${dateObj.toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                })} ${dateObj.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

          return {
            time: timeStr,
            ping: item.ping5 !== null ? Number(item.ping5) : null,
            status: item.status
          };
        });
        
        setHistory(formattedData);
      } catch (error) {
        console.error("Failed to load monitor stats", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 60000); 
    return () => clearInterval(interval);
  }, [rawUrl, range]);

  const lastItem = history.length > 0 ? history[history.length - 1] : null;
  const isCurrentlyUp = lastItem ? lastItem.status === 200 : true;

  if (loading && !siteData) {
    return (
      <div className="surface-panel flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-[#0f4c81]" />
        <p className="text-sm font-medium text-[var(--ink-soft)]">Analyzing monitor data...</p>
      </div>
    );
  }

  const displayName = siteData?.site_name || rawUrl.replace(/^https?:\/\//, "");

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="btn-ghost inline-flex">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <section className="surface-panel fade-up overflow-hidden">
        <div className="border-b border-[var(--border)] bg-gradient-to-r from-[#0f4c81] to-[#1b6aa8] px-6 py-7 text-white sm:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <Globe className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight">{displayName}</h1>
                <a
                  href={rawUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-sm text-[#d6e8fb] underline-offset-4 hover:underline"
                >
                  {rawUrl}
                </a>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`badge ${
                      isCurrentlyUp
                        ? "bg-[#d8f4e4] text-[#0d8a4a]"
                        : "bg-[#fdebea] text-[#b22d24]"
                    }`}
                  >
                    {isCurrentlyUp ? "Operational" : "Downtime"}
                  </span>
                  <span className="badge bg-white/15 text-white">
                    Range {range.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {siteData && (
                <button
                  onClick={togglePublicStatus}
                  disabled={toggling}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {siteData.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {siteData.is_public ? "Public on /status" : "Set Public"}
                </button>
              )}

              <button
                onClick={handleDelete}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c23b31] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ad3128]"
              >
                <Trash2 className="h-4 w-4" />
                Delete Monitor
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current Latency"
          value={
            lastItem?.ping !== null && lastItem?.ping !== undefined ? `${lastItem.ping} ms` : "--"
          }
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label={`Average Ping (${range.toUpperCase()})`}
          value={stats?.avg_ping !== null && stats?.avg_ping !== undefined ? `${stats.avg_ping} ms` : "--"}
          icon={<Clock3 className="h-5 w-5" />}
        />
        <StatCard
          label={`Uptime (${range.toUpperCase()})`}
          value={
            stats?.uptime_percentage !== null && stats?.uptime_percentage !== undefined
              ? `${stats.uptime_percentage}%`
              : "--"
          }
          icon={<Server className="h-5 w-5" />}
        />
        <StatCard
          label="SSL Certificate"
          value={
            siteData?.ssl_days !== null && siteData?.ssl_days !== undefined
              ? `${siteData.ssl_days} days`
              : "N/A"
          }
          icon={<ShieldCheck className="h-5 w-5" />}
          tone={getSslTone(siteData?.ssl_days)}
        />
      </section>

      <section className="surface-panel p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-[var(--ink)]">Response Time History</h2>
          <div className="flex rounded-xl border border-[var(--border)] bg-white p-1">
            {["1h", "24h", "7d", "30d"].map((t) => (
              <button
                key={t}
                onClick={() => setRange(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                  range === t
                    ? "bg-[#0f4c81] text-white"
                    : "text-[var(--ink-soft)] hover:bg-[#eef3fa]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[350px] w-full">
          {loading && history.length === 0 ? (
            <div className="h-full w-full animate-pulse rounded-xl bg-[#dbe5f3]" />
          ) : history.length > 0 ? (
            <PingChart data={history} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--ink-soft)]">
              No data collected for this time range yet.
            </div>
          )}
        </div>
      </section>

      <section className="surface-panel p-5 sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
          Recent Checks
        </h3>
        <div className="mt-4 grid gap-2">
          {history.slice(-8).reverse().map((point, index) => (
            <div
              key={`${point.time}-${index}`}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[#fbfcfe] px-4 py-2.5 text-sm"
            >
              <span className="font-medium text-[var(--ink)]">{point.time}</span>
              <span className="text-[var(--ink-soft)]">
                {point.ping !== null ? `${point.ping} ms` : "No latency"}
              </span>
              <span
                className={`badge ${
                  point.status === 200
                    ? "bg-[#e5f7ed] text-[#0d8a4a]"
                    : "bg-[#fdebea] text-[#b22d24]"
                }`}
              >
                {point.status === 200 ? "UP" : "DOWN"}
              </span>
            </div>
          ))}
          {history.length === 0 && (
            <p className="text-sm text-[var(--ink-soft)]">No checks available yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-[var(--success)]"
      : tone === "warning"
      ? "text-[var(--warning)]"
      : tone === "danger"
      ? "text-[var(--danger)]"
      : "text-[var(--ink)]";

  return (
    <article className="surface-panel p-5">
      <div className="mb-3 inline-flex rounded-lg bg-[#eff4fb] p-2.5 text-[#0f4c81]">{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
    </article>
  );
}

function getSslTone(days: number | null | undefined): "neutral" | "success" | "warning" | "danger" {
  if (days === null || days === undefined) return "neutral";
  if (days <= 7) return "danger";
  if (days <= 30) return "warning";
  return "success";
}
