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
  ping: number;
}

export function PingChart({ data }: { data: PingData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-zinc-400 border border-dashed border-zinc-200 rounded-lg">
        No data available yet
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full bg-white border border-zinc-200 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-medium text-zinc-900 mb-4">Response Time (ms)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPing" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#000" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#000" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: "#71717a" }}
            minTickGap={30}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: "#71717a" }}
          />
          <Tooltip 
            contentStyle={{ borderRadius: "8px", border: "1px solid #e4e4e7", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
            itemStyle={{ color: "#000", fontWeight: 500 }}
          />
          <Area
            type="monotone"
            dataKey="ping"
            stroke="#000"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorPing)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}