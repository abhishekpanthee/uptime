"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PingData {
  time: string;
  ping: number | null;
}

export function PingChart({ data }: { data: PingData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[350px] w-full flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--ink-soft)]">
        <p>No data recorded yet.</p>
        <p className="mt-1 text-xs">Wait for the next 1-minute check.</p>
      </div>
    );
  }

  return (
    <div className="h-[350px] w-full rounded-xl border border-[var(--border)] bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--ink)]">Response Time</h3>
        <span className="rounded-md bg-[#eff4fb] px-2 py-1 text-xs font-medium text-[#0f4c81]">
          Auto-refresh
        </span>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPing" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f4c81" stopOpacity={0.26} />
              <stop offset="95%" stopColor="#0f4c81" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4ebf5" />
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: "#667a96" }}
            minTickGap={40}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: "#667a96" }}
            tickFormatter={(value) => `${value}ms`}
            dx={-10}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: "10px",
              border: "1px solid #d6e1ef",
              boxShadow: "0 10px 24px -14px rgba(11, 40, 75, 0.45)",
              backgroundColor: "#ffffff",
              color: "#11243d"
            }}
            itemStyle={{ color: "#11243d", fontWeight: 700, fontSize: "12px" }}
            labelStyle={{ color: "#667a96", marginBottom: "0.25rem", fontSize: "12px" }}
          />
          <Area
            type="monotone"
            dataKey="ping"
            stroke="#0f4c81"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorPing)"
            connectNulls
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
