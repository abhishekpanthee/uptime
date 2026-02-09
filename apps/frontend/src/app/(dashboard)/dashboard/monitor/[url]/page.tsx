"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PingChart } from "@/components/charts/PingChart";
import { ArrowLeft, Clock, Globe, Trash2, Activity, Server } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function MonitorDetailsPage() {
  const params = useParams();
  const rawUrl = decodeURIComponent(params.url as string);
  const router = useRouter();
  
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this monitor?")) return;
    try {
      await api.delete("/websites", { data: { url: rawUrl } }); 
      router.push("/dashboard");
    } catch (err) {
      alert("Failed to delete");
    }
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.get(`/analytics/${encodeURIComponent(rawUrl)}`);
        
        const rawData = Array.isArray(res.data) ? res.data : [];

        const seen = new Set<string>();
        const formattedData = rawData
          .map((item: any) => {
            if (!item) return null;

            const val = item.ping5 ?? item.ping ?? null;
            let rawDate = item.checked_at ?? item.created_at;
            if (!rawDate) return null;
            if (typeof rawDate === 'string' && !rawDate.endsWith('Z')) {
               rawDate += 'Z';
            }
            const dateObj = new Date(rawDate);
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (seen.has(timeStr)) return null;
            seen.add(timeStr);

            return {
              time: timeStr,
              ping: val !== null ? Number(val) : null 
            };
          })
          .filter((item: any) => item !== null && item.ping !== null && !isNaN(item.ping))
          .reverse();
        
        setHistory(formattedData);
      } catch (error) {
        console.error("Failed to load history", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 60000); //pulling every 1 mins
    return () => clearInterval(interval);
  }, [rawUrl]);

  const lastItem = history.length > 0 ? history[history.length - 1] : null;
  const currentPing = lastItem ? lastItem.ping : null;

  const validPings = history.filter(h => h.ping !== null);
  const totalPing = validPings.reduce((sum, h) => sum + h.ping, 0);
  const avgPing = validPings.length > 0 ? Math.round(totalPing / validPings.length) : 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <Link href="/dashboard" className="inline-flex items-center text-sm text-zinc-500 hover:text-black mb-3 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white border border-zinc-200 rounded-lg flex items-center justify-center shadow-sm text-black">
                <Globe className="w-6 h-6" />
             </div>
             <div>
               <h1 className="text-2xl font-bold text-zinc-900">{rawUrl}</h1>
               <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
                  <span className="flex items-center gap-1.5 bg-zinc-100 text-zinc-700 px-2.5 py-0.5 rounded-full font-medium text-xs border border-zinc-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse"/>
                    Operational
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    Updates every 10s
                  </span>
               </div>
             </div>
          </div>
        </div>

        <button onClick={handleDelete} className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-100 rounded-md hover:bg-red-50 transition-colors">
          <Trash2 className="w-4 h-4" />
          Delete Monitor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard 
          label="Current Latency" 
          value={currentPing !== null ? `${currentPing}ms` : "--"} 
          icon={<Activity className="w-5 h-5" />}
        />
        <StatCard 
          label="Average (24h)" 
          value={validPings.length > 0 ? `${avgPing}ms` : "--"} 
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard 
          label="Uptime" 
          value="100%" 
          icon={<Server className="w-5 h-5" />}
        />
      </div>

      <div className="mb-8">
        {loading ? (
          <div className="h-[350px] w-full bg-zinc-100 animate-pulse rounded-lg" />
        ) : (
          <PingChart data={history} />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-lg border border-zinc-200 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <p className="text-3xl font-bold text-zinc-900 mt-2 tracking-tight">{value}</p>
      </div>
      <div className="p-2 bg-zinc-50 rounded-md text-zinc-400 border border-zinc-100">
        {icon}
      </div>
    </div>
  );
}