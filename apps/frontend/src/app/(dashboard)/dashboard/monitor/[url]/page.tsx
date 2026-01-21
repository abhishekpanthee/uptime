"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PingChart } from "@/components/charts/PingChart";
import { ArrowLeft, Clock, Globe } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function MonitorDetailsPage() {
  const params = useParams();
  // We must decode the URL (e.g., https%3A%2F%2Fgoogle.com -> https://google.com)
  const rawUrl = decodeURIComponent(params.url as string);
  
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.get(`/analytics/${encodeURIComponent(rawUrl)}`);
        
        // Transform API data for the chart
        const formattedData = res.data.map((item: any) => ({
          time: new Date(item.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ping: item.ping5
        })).reverse(); // Reverse so newest is on right if needed, or sort by date
        
        setHistory(formattedData);
      } catch (error) {
        console.error("Failed to load history", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    
    // Auto-refresh every 1 minute to show live updates
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [rawUrl]);

  return (
    <div>
      {/* Header with Back Button */}
      <div className="mb-8">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-sm text-zinc-500 hover:text-black mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white border border-zinc-200 rounded-lg flex items-center justify-center shadow-sm">
              <Globe className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{rawUrl}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Operational
                </span>
                <span className="text-zinc-400 text-xs flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Checked every 1 min
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard 
          label="Current Ping" 
          value={history.length > 0 ? `${history[history.length - 1].ping}ms` : "--"} 
        />
        <StatCard 
          label="Avg Response (24h)" 
          value={loading ? "..." : "142ms"} // You can calculate this real average later
        />
        <StatCard 
          label="Uptime (24h)" 
          value="100%" 
        />
      </div>

      {/* The Chart */}
      <div className="mb-8">
        {loading ? (
          <div className="h-[300px] w-full bg-zinc-100 animate-pulse rounded-lg" />
        ) : (
          <PingChart data={history} />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-6 rounded-lg border border-zinc-200 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="text-2xl font-bold text-zinc-900 mt-2">{value}</p>
    </div>
  );
}