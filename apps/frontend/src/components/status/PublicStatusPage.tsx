"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  RefreshCw,
  Server,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PublicStatusHeader } from "@/components/layout/PublicStatusHeader";
import { PublicStatusFooter } from "@/components/layout/PublicStatusFooter";
import type {
  DailyHistoryPoint,
  HourlyHistoryPoint,
  PublicSystemStatus,
} from "@/types/status";

interface DailyHistoryResponse {
  history?: DailyHistoryPoint[];
}

interface HourlyHistoryResponse {
  hourly?: HourlyHistoryPoint[];
  timeline?: TimelinePoint[];
}

interface TimelinePoint {
  checked_at: string;
  ping: number | null;
  status: number | null;
}

interface TimelineChartPoint {
  checked_at: string;
  label: string;
  ping: number | null;
  status: number | null;
}

interface DailyTrendPoint extends DailyHistoryPoint {
  label: string;
  trend_ping: number | null;
  has_data: boolean;
  is_estimated: boolean;
}

interface PingStats {
  avg: number | null;
  min: number | null;
  max: number | null;
  points: number;
}

export function PublicStatusPage() {
  const [systems, setSystems] = useState<PublicSystemStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await api.get("/public/status");
        setSystems(res.data);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Failed to load public status", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();

    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const allOperational = systems.length === 0 || systems.every((s) => s.status === 200);

  const sortedSystems = [...systems].sort((a, b) => {
    const aScore = a.status === 200 ? 0 : 1;
    const bScore = b.status === 200 ? 0 : 1;
    return aScore - bScore;
  });

  return (
    <div className="min-h-screen pb-10">
      <PublicStatusHeader />

      <main className="mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6">
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_10px_30px_-24px_rgba(11,40,75,0.4)]">
          <div className="border-b border-[var(--border)] bg-gradient-to-br from-[#1e3a8a] via-[#1f3d8f] to-[#1b2e6a] px-6 py-8 text-white sm:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d6e2ff]">
                  Public Service Health
                </p>
                <h1 className="mt-2 text-4xl font-bold leading-tight">
                  {allOperational ? "All systems operational" : "Partial service disruption"}
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-[#dbe5ff] sm:text-base">
                  Real-time availability and response performance for official digital
                  platforms of Thapathali Campus.
                </p>
              </div>

              <div className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm backdrop-blur-sm">
                <div className="flex items-center gap-2 text-[#edf3ff]">
                  <RefreshCw className="h-4 w-4" />
                  Updates every 60 seconds
                </div>
                <div className="mt-1 text-xs text-[#d6e3ff]">
                  Last refresh:{" "}
                  {lastUpdated
                    ? lastUpdated.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Waiting..."}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white">
            <div className="hidden grid-cols-[1.25fr_0.65fr_0.45fr_0.75fr] border-b border-[var(--border)] bg-[#fbfcff] px-8 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#667186] md:grid">
              <span>Service</span>
              <span>24H Health</span>
              <span>Latency</span>
              <span className="text-right">Status</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-[var(--ink-soft)]">
                <Loader2 className="h-5 w-5 animate-spin" />
                Checking live services...
              </div>
            ) : sortedSystems.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-[var(--ink-soft)]">
                No public systems are configured yet.
              </div>
            ) : (
              sortedSystems.map((site, index) => (
                <ServiceRowWithHistory key={site.url} site={site} index={index} />
              ))
            )}
          </div>
        </section>
      </main>

      <PublicStatusFooter />
    </div>
  );
}

function ServiceRowWithHistory({
  site,
  index,
}: {
  site: PublicSystemStatus;
  index: number;
}) {
  const siteUp = site.status === 200;
  const host = site.url.replace(/^https?:\/\//, "");

  const [expanded, setExpanded] = useState(false);
  const [dailyHistory, setDailyHistory] = useState<DailyHistoryPoint[] | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [detailDay, setDetailDay] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<"24h" | "30d">("24h");

  const [hourlyByDay, setHourlyByDay] = useState<Record<string, HourlyHistoryPoint[]>>({});
  const [timelineByDay, setTimelineByDay] = useState<Record<string, TimelinePoint[]>>({});
  const [loadingDays, setLoadingDays] = useState<Set<string>>(new Set());
  const [hourlyError, setHourlyError] = useState<string | null>(null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);

  const loadDailyHistory = useCallback(async () => {
    if (dailyHistory || dailyLoading) return;
    setDailyLoading(true);
    setDailyError(null);

    try {
      const res = await api.get<DailyHistoryResponse>(
        `/public/status/${encodeURIComponent(site.url)}/history`,
        { params: { days: 30 } }
      );
      const history = Array.isArray(res.data?.history) ? res.data.history : [];
      setDailyHistory(history);

      const mostRecentDay =
        [...history].reverse().find((point) => point.checks > 0)?.date ||
        history[history.length - 1]?.date ||
        null;
      setSelectedDay(mostRecentDay);
    } catch (error) {
      console.error("Failed to load daily history", error);
      setDailyError("Could not load 30-day history.");
    } finally {
      setDailyLoading(false);
    }
  }, [dailyHistory, dailyLoading, site.url]);

  const loadHourlyHistory = useCallback(
    async (day: string) => {
      if (!day || hourlyByDay[day] || loadingDays.has(day)) return;
      setLoadingDays((prev) => new Set(prev).add(day));
      setHourlyError(null);

      try {
        const res = await api.get<HourlyHistoryResponse>(
          `/public/status/${encodeURIComponent(site.url)}/history/${day}`
        );
        const hourly = Array.isArray(res.data?.hourly) ? res.data.hourly : [];
        const timeline = Array.isArray(res.data?.timeline) ? res.data.timeline : [];
        setHourlyByDay((prev) => ({ ...prev, [day]: hourly }));
        setTimelineByDay((prev) => ({ ...prev, [day]: timeline }));
      } catch (error) {
        console.error("Failed to load hourly history", error);
        setHourlyError("Could not load hourly breakdown.");
      } finally {
        setLoadingDays((prev) => {
          const next = new Set(prev);
          next.delete(day);
          return next;
        });
      }
    },
    [hourlyByDay, loadingDays, site.url]
  );

  useEffect(() => {
    if (!detailDay) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDetailDay(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailDay]);

  useEffect(() => {
    if (!expanded || !selectedDay) return;
    void loadHourlyHistory(selectedDay);
  }, [expanded, selectedDay, loadHourlyHistory]);

  useEffect(() => {
    if (!hoverDay) return;
    void loadHourlyHistory(hoverDay);
  }, [hoverDay, loadHourlyHistory]);

  // Pre-fetch all days with data so the hover tooltip is instant
  useEffect(() => {
    if (!dailyHistory) return;
    const daysWithData = dailyHistory
      .filter((d) => (d.checks ?? 0) > 0)
      .map((d) => d.date);
    for (const day of daysWithData) {
      void loadHourlyHistory(day);
    }
    // loadHourlyHistory is intentionally excluded to run only when dailyHistory changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyHistory]);

  const dailyChartData = useMemo(
    () =>
      (dailyHistory || []).map((point) => ({
        ...point,
        label: formatDay(point.date),
      })),
    [dailyHistory]
  );

  const dailyTrendData = useMemo<DailyTrendPoint[]>(() => {
    const known = dailyChartData
      .map((point, index) =>
        typeof point.avg_ping === "number" ? { index, value: point.avg_ping as number } : null
      )
      .filter((entry): entry is { index: number; value: number } => entry !== null);

    return dailyChartData.map((point, index) => {
      const hasData = typeof point.avg_ping === "number";
      if (hasData)
        return {
          ...point,
          trend_ping: point.avg_ping,
          has_data: true,
          is_estimated: false,
        };

      const previous = [...known].reverse().find((entry) => entry.index < index);
      const next = known.find((entry) => entry.index > index);

      let trendPing: number | null = null;
      if (previous && next && next.index !== previous.index) {
        const ratio = (index - previous.index) / (next.index - previous.index);
        trendPing = Math.round(previous.value + (next.value - previous.value) * ratio);
      }

      return {
        ...point,
        trend_ping: trendPing,
        has_data: false,
        is_estimated: trendPing !== null,
      };
    });
  }, [dailyChartData]);

  const dailyDomainMeta = useMemo(() => {
    const values = dailyTrendData
      .map((point) => point.trend_ping)
      .filter((value): value is number => typeof value === "number");

    if (values.length === 0) {
      return {
        domain: [0, 1000] as [number, number],
      };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max(80, Math.round((max - min) * 0.18));
    const lower = Math.max(0, Math.floor((min - padding) / 10) * 10);
    let upper = Math.ceil((max + padding) / 10) * 10;
    if (upper - lower < 240) upper = lower + 240;

    return {
      domain: [lower, upper] as [number, number],
    };
  }, [dailyTrendData]);

  const availableDays = useMemo(() => {
    const daysWithChecks = dailyChartData
      .filter((point) => point.checks > 0 && point.avg_ping !== null)
      .map((point) => point.date);

    if (daysWithChecks.length > 0) return daysWithChecks;
    return dailyChartData.map((point) => point.date);
  }, [dailyChartData]);

  const detailDayIndex = detailDay ? availableDays.indexOf(detailDay) : -1;

  const selectedDaily = selectedDay
    ? (dailyHistory || []).find((item) => item.date === selectedDay) || null
    : null;
  const selectedHourly = selectedDay ? hourlyByDay[selectedDay] || [] : [];
  const selectedTimeline = selectedDay ? timelineByDay[selectedDay] || [] : [];

  const panel24hChartData = useMemo<TimelineChartPoint[]>(() => {
    if (!selectedDay) return [];

    if (selectedTimeline.length > 0) {
      return selectedTimeline.map((point) => ({
        checked_at: point.checked_at,
        ping: point.ping,
        status: point.status,
        label: formatTime(point.checked_at),
      }));
    }

    return selectedHourly.map((point) => ({
      checked_at: `${selectedDay}T${String(point.hour).padStart(2, "0")}:00:00.000Z`,
      ping: point.avg_ping,
      status:
        point.uptime_percentage !== null && point.uptime_percentage !== undefined
          ? point.uptime_percentage >= 99
            ? 200
            : 500
          : null,
      label: point.label,
    }));
  }, [selectedDay, selectedHourly, selectedTimeline]);

  const panel24hStats = useMemo<PingStats>(() => {
    const pings = panel24hChartData
      .map((item) => item.ping)
      .filter((value): value is number => typeof value === "number");

    if (pings.length === 0) {
      return {
        avg: null,
        min: null,
        max: null,
        points: panel24hChartData.length,
      };
    }

    const sum = pings.reduce((acc, value) => acc + value, 0);
    return {
      avg: Math.round(sum / pings.length),
      min: Math.min(...pings),
      max: Math.max(...pings),
      points: panel24hChartData.length,
    };
  }, [panel24hChartData]);

  const modalDaily = detailDay
    ? (dailyHistory || []).find((item) => item.date === detailDay) || null
    : null;

  const modalHourly = detailDay ? hourlyByDay[detailDay] || [] : [];
  const modalTimeline = detailDay ? timelineByDay[detailDay] || [] : [];

  const modalChartData = useMemo<TimelineChartPoint[]>(() => {
    if (!detailDay) return [];

    if (modalTimeline.length > 0) {
      return modalTimeline.map((point) => ({
        checked_at: point.checked_at,
        ping: point.ping,
        status: point.status,
        label: formatTime(point.checked_at),
      }));
    }

    return modalHourly.map((point) => ({
      checked_at: `${detailDay}T${String(point.hour).padStart(2, "0")}:00:00.000Z`,
      ping: point.avg_ping,
      status:
        point.uptime_percentage !== null && point.uptime_percentage !== undefined
          ? point.uptime_percentage >= 99
            ? 200
            : 500
          : null,
      label: point.label,
    }));
  }, [detailDay, modalHourly, modalTimeline]);

  const modalStats = useMemo<PingStats>(() => {
    const pings = modalChartData
      .map((item) => item.ping)
      .filter((value): value is number => typeof value === "number");

    if (pings.length === 0) {
      return {
        avg: null,
        min: null,
        max: null,
        points: modalChartData.length,
      };
    }

    const sum = pings.reduce((acc, value) => acc + value, 0);
    return {
      avg: Math.round(sum / pings.length),
      min: Math.min(...pings),
      max: Math.max(...pings),
      points: modalChartData.length,
    };
  }, [modalChartData]);

  const modalLoading = detailDay ? loadingDays.has(detailDay) : false;

  const openHistoryPanel = () => {
    setExpanded(true);
    void loadDailyHistory();
  };

  const closeHistoryPanel = () => {
    if (!detailDay) {
      setExpanded(false);
    }
  };

  const selectDay = (day: string) => {
    setSelectedDay(day);
    setDetailDay(day);
    void loadHourlyHistory(day);
  };

  const handlePanelDayChange = (day: string) => {
    setSelectedDay(day);
    void loadHourlyHistory(day);
  };

  const openDayDetail = (day: string) => {
    selectDay(day);
  };

  return (
    <div
      className="group border-b border-[var(--border)] last:border-b-0"
      onMouseEnter={openHistoryPanel}
      onMouseLeave={closeHistoryPanel}
    >
      <article
        className="fade-up grid gap-3 px-6 py-4 md:grid-cols-[1.25fr_0.65fr_0.45fr_0.75fr] md:items-center md:px-8"
        style={{ animationDelay: `${Math.min(index * 55, 250)}ms` }}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
              siteUp ? "bg-[var(--success)]" : "bg-[var(--danger)]"
            }`}
          />
          <div>
            <p className="text-xl font-semibold leading-tight text-[var(--ink)] md:text-base">
              {host}
            </p>
            <p className="mt-0.5 text-xs text-[var(--ink-soft)]">{site.url}</p>
          </div>
        </div>

        <div className="space-y-0.5 text-sm">
          <div className="flex items-center gap-2 text-[var(--ink)]">
            <Server className="h-4 w-4 text-[var(--brand)]" />
            <span className="font-semibold">
              {site.uptime_24h !== null && site.uptime_24h !== undefined
                ? `${site.uptime_24h}%`
                : "--"}
            </span>
            <span className="text-xs text-[var(--ink-soft)]">uptime</span>
          </div>
          <p className="text-xs text-[var(--ink-soft)]">
            {site.checks_24h ?? 0} checks (24h)
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-[var(--ink-soft)]">
          <Clock3 className="h-4 w-4 text-[var(--brand)]" />
          {site.ping !== null && site.ping !== undefined
            ? `${site.ping} ms`
            : "No latency"}
        </div>

        <div className="space-y-1.5 md:text-right">
          <div className="flex items-center gap-2 md:justify-end">
            <span
              className={`badge ${
                siteUp ? "bg-[#e6f7ee] text-[#137a42]" : "bg-[#fdeceb] text-[#b12c23]"
              }`}
            >
              {siteUp ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Operational
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Incident
                </>
              )}
            </span>

            <button
              type="button"
              onClick={() => {
                if (expanded) {
                  setExpanded(false);
                  return;
                }
                openHistoryPanel();
              }}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--brand)] hover:bg-[#eef2ff]"
            >
              Trend
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-xs text-[var(--ink-soft)]">
            {site.uptime_24h !== null && site.uptime_24h !== undefined
              ? `${site.uptime_24h}% uptime`
              : "Uptime unavailable"}
            {" • "}
            {site.checks_24h ?? 0} checks
          </p>
        </div>
      </article>

      <div
        className={`overflow-hidden bg-[#f8fbff] transition-all duration-300 ${
          expanded ? "max-h-[360px] border-t border-[var(--border)] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-3 px-5 py-4 md:px-8">
          {dailyLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--ink-soft)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading 30-day history...
            </div>
          ) : dailyError ? (
            <p className="text-sm text-[var(--danger)]">{dailyError}</p>
          ) : dailyTrendData.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">No historical data yet for this monitor.</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    {panelMode === "24h" ? "Last 24 Hours" : "Last 30 Days Trend"}
                  </p>
                  <div className="inline-flex rounded-full border border-[var(--border)] bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setPanelMode("24h")}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                        panelMode === "24h"
                          ? "bg-[var(--brand)] text-white"
                          : "text-[var(--ink-soft)] hover:bg-[#eef2ff]"
                      }`}
                    >
                      24H
                    </button>
                    <button
                      type="button"
                      onClick={() => setPanelMode("30d")}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                        panelMode === "30d"
                          ? "bg-[var(--brand)] text-white"
                          : "text-[var(--ink-soft)] hover:bg-[#eef2ff]"
                      }`}
                    >
                      30D
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[var(--ink-soft)]">
                  {panelMode === "24h"
                    ? ""
                    : "Click a day point to open detailed graph"}
                </p>
              </div>
              {panelMode === "24h" ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {selectedDay ? formatDayLong(selectedDay) : "Select day"}
                    </p>
                    <div className="flex items-center gap-2">
                      <label htmlFor={`panel-day-${host}`} className="text-xs text-[var(--ink-soft)]">
                        Day
                      </label>
                      <select
                        id={`panel-day-${host}`}
                        value={selectedDay ?? availableDays[availableDays.length - 1] ?? ""}
                        onChange={(event) => handlePanelDayChange(event.target.value)}
                        className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--ink)] outline-none focus:border-[#7ea5df]"
                      >
                        {availableDays.map((day) => (
                          <option key={day} value={day}>
                            {formatDayLong(day)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedDay && loadingDays.has(selectedDay) ? (
                    <div className="flex h-[165px] items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--ink-soft)]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading 24-hour chart...
                    </div>
                  ) : hourlyError ? (
                    <p className="text-sm text-[var(--danger)]">{hourlyError}</p>
                  ) : panel24hChartData.length > 0 ? (
                    <div className="h-[165px] rounded-xl border border-[var(--border)] bg-white p-2.5">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={panel24hChartData}>
                          <CartesianGrid strokeDasharray="4 4" stroke="#dbe5f2" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: "#6a7a93" }}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={18}
                          />
                          <YAxis
                            tickFormatter={(value) => `${value}ms`}
                            tick={{ fontSize: 11, fill: "#6a7a93" }}
                            tickLine={false}
                            axisLine={false}
                            width={54}
                          />
                          <Tooltip
                            cursor={{ stroke: "#b9c7dc", strokeDasharray: "4 4" }}
                            contentStyle={{
                              borderRadius: "10px",
                              border: "1px solid #d8e1ef",
                              boxShadow: "0 10px 22px -20px rgba(26,54,93,0.55)",
                              fontSize: "12px",
                            }}
                            labelFormatter={(_label, payload) => {
                              const point = payload?.[0]?.payload as TimelineChartPoint | undefined;
                              if (!point?.checked_at) return point?.label || "Time";
                              return formatTime(point.checked_at);
                            }}
                            formatter={(value: unknown, _name, item) => {
                              const point = item?.payload as TimelineChartPoint | undefined;
                              const pingLabel =
                                typeof value === "number" ? `${Math.round(value)} ms` : "No response";
                              const statusLabel = formatStatusLabel(point?.status);
                              return [pingLabel, statusLabel];
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="ping"
                            stroke="#1f4d95"
                            strokeWidth={2.3}
                            dot={(props: any) => {
                              const point = props?.payload as TimelineChartPoint | undefined;
                              if (!isIncidentStatus(point?.status)) return null;
                              if (typeof props?.cx !== "number" || typeof props?.cy !== "number") return null;
                              return (
                                <circle
                                  cx={props.cx}
                                  cy={props.cy}
                                  r={2.8}
                                  fill="#dc2626"
                                  stroke="#fff"
                                  strokeWidth={1.1}
                                />
                              );
                            }}
                            activeDot={{ r: 3.4, stroke: "#fff", strokeWidth: 1.6 }}
                            connectNulls={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-[165px] items-center justify-center rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--ink-soft)]">
                      No 24-hour checks available.
                    </div>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    <InlineMetric label="Checks" value={String(selectedDaily?.checks ?? panel24hStats.points)} />
                    <InlineMetric
                      label="Uptime"
                      value={
                        selectedDaily?.uptime_percentage !== null &&
                        selectedDaily?.uptime_percentage !== undefined
                          ? `${selectedDaily.uptime_percentage}%`
                          : "--"
                      }
                    />
                    <InlineMetric
                      label="Avg ping"
                      value={panel24hStats.avg !== null ? `${panel24hStats.avg} ms` : "--"}
                    />
                    <InlineMetric
                      label="Peak ping"
                      value={panel24hStats.max !== null ? `${panel24hStats.max} ms` : "--"}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedDay) openDayDetail(selectedDay);
                      }}
                      className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand)] hover:bg-[#eef2ff]"
                    >
                      Open Daily Graph
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-[165px] rounded-xl border border-[var(--border)] bg-white p-2.5">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={dailyTrendData}
                        onClick={(state: any) => {
                          const payload = state?.activePayload?.[0]?.payload as DailyTrendPoint | undefined;
                          if (payload?.date) {
                            openDayDetail(payload.date);
                          }
                        }}
                        onMouseMove={(state: any) => {
                          const payload = state?.activePayload?.[0]?.payload as DailyTrendPoint | undefined;
                          const day = payload?.date && payload.has_data ? payload.date : null;
                          setHoverDay((prev) => (prev === day ? prev : day));
                        }}
                        onMouseLeave={() => setHoverDay(null)}
                      >
                        <CartesianGrid strokeDasharray="4 4" stroke="#dbe5f2" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: "#6a7a93" }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={14}
                        />
                        <YAxis
                          tickFormatter={(value) => `${value}ms`}
                          domain={dailyDomainMeta.domain}
                          tick={{ fontSize: 11, fill: "#6a7a93" }}
                          tickLine={false}
                          axisLine={false}
                          width={54}
                        />
                        <Tooltip
                          cursor={{ stroke: "#b9c7dc", strokeDasharray: "4 4" }}
                          content={(props: any) => (
                            <ThirtyDayHoverTooltip
                              active={props.active}
                              payload={props.payload}
                              hourlyByDay={hourlyByDay}
                              timelineByDay={timelineByDay}
                              loadingDays={loadingDays}
                            />
                          )}
                        />
                        <Line
                          type="monotone"
                          dataKey="trend_ping"
                          stroke="#1f4d95"
                          strokeWidth={2.3}
                          dot={(props: any) => {
                            const payload = props?.payload as DailyTrendPoint | undefined;
                            const day = payload?.date;
                            const checks = payload?.checks ?? 0;
                            if (!payload?.has_data) return null;
                            if (typeof props?.cx !== "number" || typeof props?.cy !== "number") {
                              return null;
                            }

                            const isSelected = day === selectedDay;
                            const hasIncident =
                              payload?.uptime_percentage !== null &&
                              payload?.uptime_percentage !== undefined &&
                              payload.uptime_percentage < 100;
                            const fill = isSelected
                              ? "#f97316"
                              : hasIncident
                              ? "#dc2626"
                              : checks > 0
                              ? "#1f4d95"
                              : "#c8d4e7";

                            return (
                              <circle
                                cx={props.cx}
                                cy={props.cy}
                                r={isSelected ? 4.4 : 3.3}
                                fill={fill}
                                stroke="#ffffff"
                                strokeWidth={1.4}
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  if (day) openDayDetail(day);
                                }}
                              />
                            );
                          }}
                          activeDot={{ r: 4.8, stroke: "#ffffff", strokeWidth: 1.6 }}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    <InlineMetric
                      label="Selected"
                      value={selectedDay ? formatDay(selectedDay) : "--"}
                    />
                    <InlineMetric label="Checks" value={String(selectedDaily?.checks ?? 0)} />
                    <InlineMetric
                      label="Uptime"
                      value={
                        selectedDaily?.uptime_percentage !== null &&
                        selectedDaily?.uptime_percentage !== undefined
                          ? `${selectedDaily.uptime_percentage}%`
                          : "--"
                      }
                    />
                    <InlineMetric
                      label="Avg ping"
                      value={
                        selectedDaily?.avg_ping !== null && selectedDaily?.avg_ping !== undefined
                          ? `${selectedDaily.avg_ping} ms`
                          : "--"
                      }
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedDay) openDayDetail(selectedDay);
                      }}
                      className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand)] hover:bg-[#eef2ff]"
                    >
                      Open Daily Graph
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {detailDay ? (
        <DayDetailModal
          day={detailDay}
          loading={modalLoading}
          error={hourlyError}
          daily={modalDaily}
          chartData={modalChartData}
          stats={modalStats}
          availableDays={availableDays}
          onSelectDay={selectDay}
          onPrevDay={
            detailDayIndex > 0
              ? () => {
                  selectDay(availableDays[detailDayIndex - 1]);
                }
              : undefined
          }
          onNextDay={
            detailDayIndex >= 0 && detailDayIndex < availableDays.length - 1
              ? () => {
                  selectDay(availableDays[detailDayIndex + 1]);
                }
              : undefined
          }
          onClose={() => setDetailDay(null)}
        />
      ) : null}
    </div>
  );
}

function DayDetailModal({
  day,
  loading,
  error,
  daily,
  chartData,
  stats,
  availableDays,
  onSelectDay,
  onPrevDay,
  onNextDay,
  onClose,
}: {
  day: string;
  loading: boolean;
  error: string | null;
  daily: DailyHistoryPoint | null;
  chartData: TimelineChartPoint[];
  stats: PingStats;
  availableDays: string[];
  onSelectDay: (day: string) => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#091a34]/45 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Daily response history"
    >
      <div
        className="w-full max-w-6xl rounded-2xl border border-[var(--border)] bg-white shadow-[0_28px_70px_-38px_rgba(17,42,79,0.75)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4 md:px-6">
          <div>
            <p className="text-3xl font-bold leading-tight text-[var(--ink)] md:text-4xl">Response Time History</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">{formatDayLong(day)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onPrevDay}
                disabled={!onPrevDay}
                className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--brand)] hover:bg-[#eef2ff] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Previous Day
              </button>
              <div className="relative">
                <label htmlFor="day-select" className="sr-only">
                  Select day
                </label>
                <select
                  id="day-select"
                  value={day}
                  onChange={(event) => onSelectDay(event.target.value)}
                  className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)] outline-none focus:border-[#7ea5df]"
                >
                  {availableDays.map((optionDay) => (
                    <option key={optionDay} value={optionDay}>
                      {formatDayLong(optionDay)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={onNextDay}
                disabled={!onNextDay}
                className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--brand)] hover:bg-[#eef2ff] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Next Day
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--brand)] hover:bg-[#eef2ff]"
          >
            <X className="h-3.5 w-3.5" />
            Close
          </button>
        </div>

        <div className="space-y-3 p-4 md:p-6">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <InlineMetric label="Checks" value={String(daily?.checks ?? stats.points)} />
            <InlineMetric
              label="Uptime"
              value={
                daily?.uptime_percentage !== null && daily?.uptime_percentage !== undefined
                  ? `${daily.uptime_percentage}%`
                  : "--"
              }
            />
            <InlineMetric
              label="Avg ping"
              value={stats.avg !== null ? `${stats.avg} ms` : "--"}
            />
            <InlineMetric
              label="Min ping"
              value={stats.min !== null ? `${stats.min} ms` : "--"}
            />
            <InlineMetric
              label="Peak ping"
              value={stats.max !== null ? `${stats.max} ms` : "--"}
            />
          </div>

          {loading ? (
            <div className="flex h-[320px] items-center justify-center gap-2 text-sm text-[var(--ink-soft)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading daily chart...
            </div>
          ) : error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : chartData.length > 0 ? (
            <div className="h-[320px] rounded-xl border border-[var(--border)] bg-[#fbfdff] p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#dbe5f2" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#6a7a93" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={18}
                  />
                  <YAxis
                    tickFormatter={(value) => `${value}ms`}
                    tick={{ fontSize: 11, fill: "#6a7a93" }}
                    tickLine={false}
                    axisLine={false}
                    width={58}
                  />
                  <Tooltip
                    cursor={{ stroke: "#b9c7dc", strokeDasharray: "4 4" }}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid #d8e1ef",
                      boxShadow: "0 10px 22px -20px rgba(26,54,93,0.55)",
                      fontSize: "12px",
                    }}
                    labelFormatter={(_label, payload) => {
                      const point = payload?.[0]?.payload as TimelineChartPoint | undefined;
                      if (!point?.checked_at) return point?.label || "Time";
                      return formatTime(point.checked_at);
                    }}
                    formatter={(value: unknown, _name, item) => {
                      const point = item?.payload as TimelineChartPoint | undefined;
                      const pingLabel =
                        typeof value === "number" ? `${Math.round(value)} ms` : "No response";
                      const statusLabel = formatStatusLabel(point?.status);
                      return [pingLabel, statusLabel];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ping"
                    stroke="#1f4d95"
                    strokeWidth={2.3}
                    dot={(props: any) => {
                      const point = props?.payload as TimelineChartPoint | undefined;
                      if (!isIncidentStatus(point?.status)) return null;
                      if (typeof props?.cx !== "number" || typeof props?.cy !== "number") return null;
                      return (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={3}
                          fill="#dc2626"
                          stroke="#fff"
                          strokeWidth={1.1}
                        />
                      );
                    }}
                    activeDot={{ r: 3.6, stroke: "#fff", strokeWidth: 1.8 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[320px] items-center justify-center text-sm text-[var(--ink-soft)]">
              No checks were recorded for this day.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniSparkline({ data }: { data: { label: string; ping: number | null }[] }) {
  const W = 196;
  const H = 64;
  const pad = 4;

  // Use only points that have actual data, evenly distributed across full width
  const pts = data
    .filter((d): d is { label: string; ping: number } => d.ping !== null);

  if (pts.length < 2) {
    return (
      <div className="flex h-[64px] items-center justify-center text-[10px] text-[var(--ink-soft)]">
        Not enough data
      </div>
    );
  }

  const ys = pts.map((p) => p.ping);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeY = maxY - minY || 1;
  const n = pts.length - 1;

  const toX = (i: number) => pad + (i / n) * (W - pad * 2);
  const toY = (v: number) => pad + (1 - (v - minY) / rangeY) * (H - pad * 2 - 2);

  const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.ping).toFixed(1)}`).join(" ");
  const areaD = `M ${toX(0).toFixed(1)} ${(H - pad).toFixed(1)} ` +
    pts.map((p, i) => `L ${toX(i).toFixed(1)} ${toY(p.ping).toFixed(1)}`).join(" ") +
    ` L ${toX(n).toFixed(1)} ${(H - pad).toFixed(1)} Z`;

  const gradId = `sg-${Math.round(minY)}-${Math.round(maxY)}-${pts.length}`;

  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b57b8" stopOpacity={0.28} />
          <stop offset="100%" stopColor="#2b57b8" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} stroke="none" />
      <path d={lineD} fill="none" stroke="#2b57b8" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ThirtyDayHoverTooltip({
  active,
  payload,
  hourlyByDay,
  timelineByDay,
  loadingDays,
}: {
  active?: boolean;
  payload?: any[];
  hourlyByDay: Record<string, HourlyHistoryPoint[]>;
  timelineByDay: Record<string, TimelinePoint[]>;
  loadingDays: Set<string>;
}) {
  // Hooks must come before any conditional return
  const point = payload?.[0]?.payload as DailyTrendPoint | undefined;
  const day = point?.date ?? "";
  const timeline = timelineByDay[day] || [];
  const hourly = hourlyByDay[day] || [];

  const chartData = useMemo<{ label: string; ping: number | null }[]>(() => {
    if (!day) return [];
    if (timeline.length > 0) {
      const buckets: Record<number, number[]> = {};
      for (const p of timeline) {
        if (p.ping === null || p.ping === undefined) continue;
        const ts = new Date(p.checked_at.endsWith("Z") ? p.checked_at : p.checked_at + "Z");
        const h = ts.getUTCHours();
        if (!buckets[h]) buckets[h] = [];
        buckets[h].push(p.ping);
      }
      return Array.from({ length: 24 }, (_, h) => {
        const vals = buckets[h];
        const avg =
          vals && vals.length > 0
            ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
            : null;
        return { label: `${String(h).padStart(2, "0")}:00`, ping: avg };
      });
    }
    return hourly.map((p) => ({ label: p.label, ping: p.avg_ping }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, timeline.length, hourly.length]);

  if (!active || !payload || payload.length === 0) return null;
  if (!point?.date || !point.has_data) return null;

  const isLoading = loadingDays.has(day) && !hourlyByDay[day];

  const uptimeBadgeColor =
    point.uptime_percentage === 100
      ? "#86efac"
      : typeof point.uptime_percentage === "number" && point.uptime_percentage >= 99
      ? "#fcd34d"
      : "#fca5a5";

  return (
    <div
      style={{ width: 220, pointerEvents: "none" }}
      className="rounded-2xl border border-[#dde8f5] bg-white shadow-[0_16px_40px_-16px_rgba(11,40,75,0.45)]"
    >
      <div className="rounded-t-2xl bg-gradient-to-br from-[#1f3d8f] to-[#1b2e6a] px-3 py-2.5">
        <p className="text-[11px] font-bold tracking-wide text-white">{formatDayLong(day)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {point.uptime_percentage !== null && point.uptime_percentage !== undefined && (
            <span className="text-[10px] font-semibold" style={{ color: uptimeBadgeColor }}>
              {point.uptime_percentage}% up
            </span>
          )}
          <span className="text-[10px] text-[#a8c0e8]">{point.checks ?? 0} checks</span>
          {typeof point.avg_ping === "number" && (
            <span className="text-[10px] text-[#a8c0e8]">{point.avg_ping} ms avg</span>
          )}
        </div>
      </div>

      <div className="px-2 pb-2 pt-2">
        {isLoading ? (
          <div className="flex h-[72px] items-center justify-center gap-1.5 text-[11px] text-[var(--ink-soft)]">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading...
          </div>
        ) : chartData.length > 0 ? (
          <MiniSparkline data={chartData} />
        ) : (
          <div className="flex h-[72px] items-center justify-center text-[11px] text-[var(--ink-soft)]">
            No data
          </div>
        )}
      </div>
    </div>
  );
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[#f8fbff] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}

function isIncidentStatus(status: number | null | undefined) {
  return typeof status === "number" && status !== 200;
}

function formatStatusLabel(status: number | null | undefined) {
  if (status === 200) return "Operational";
  if (typeof status === "number" && status > 0) return `HTTP ${status}`;
  if (status === 0) return "Down / timeout";
  return "No status";
}

function formatDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, date, 12, 0, 0));
  return parsed.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatTime(timestamp: string) {
  if (!timestamp) return "--:--";

  let normalizedTimestamp = timestamp;
  const hasTimeZone = /([zZ]|[+-]\d{2}:\d{2})$/.test(normalizedTimestamp);
  if (!hasTimeZone) {
    normalizedTimestamp += "Z";
  }

  const parsed = new Date(normalizedTimestamp);
  if (Number.isNaN(parsed.getTime())) return "--:--";

  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLong(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, date, 12, 0, 0));
  return parsed.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
