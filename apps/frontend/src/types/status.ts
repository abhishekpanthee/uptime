export interface PublicSystemStatus {
  url: string;
  status: number | null;
  ping: number | null;
  ssl_days: number | null;
  last_checked?: string | null;
  checks_24h?: number;
  uptime_24h?: number | null;
}

export interface DailyHistoryPoint {
  date: string;
  checks: number;
  avg_ping: number | null;
  uptime_percentage: number | null;
}

export interface HourlyHistoryPoint {
  hour: number;
  label: string;
  checks: number;
  avg_ping: number | null;
  uptime_percentage: number | null;
}
