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
      <div className="h-[350px] w-full flex flex-col items-center justify-center bg-white border border-zinc-200 rounded-lg text-zinc-400">
        <p>No data recorded yet.</p>
        <p className="text-xs mt-1">Wait for the next 1-minute check.</p>
      </div>
    );
  }

  return (
    <div className="h-[350px] w-full bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-zinc-900">Response Time</h3>
        <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-1 rounded-md">Last 24 Hours</span>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPing" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#000000" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#000000" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: "#71717a" }}
            minTickGap={40}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickFormatter={(value) => `${value}ms`}
            dx={-10}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: "6px", 
              border: "1px solid #e4e4e7", 
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              backgroundColor: "#fff",
              color: "#000"
            }}
            itemStyle={{ color: "#000", fontWeight: 600, fontSize: "12px" }}
            labelStyle={{ color: "#71717a", marginBottom: "0.25rem", fontSize: "12px" }}
          />
          <Area
            type="monotone"
            dataKey="ping"
            stroke="#000000"
            strokeWidth={1.5}
            fillOpacity={1}
            fill="url(#colorPing)"
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}