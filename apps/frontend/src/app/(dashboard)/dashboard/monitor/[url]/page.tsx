"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PingChart } from "@/components/charts/PingChart";
import { ArrowLeft, Clock, Globe, Trash2, Activity, Server, ShieldCheck, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function MonitorDetailsPage() {
  const params = useParams();
  const rawUrl = decodeURIComponent(params.url as string);
  const router = useRouter();
  
  const [range, setRange] = useState("24h");
  const [siteData, setSiteData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this monitor?")) return;
    try {
      await api.delete("/websites", { data: { url: rawUrl } }); 
      router.push("/dashboard");
    } catch (err) {
      alert("Failed to delete");
    }
  }

  const togglePublicStatus = async () => {
    setToggling(true);
    try {
      const newStatus = !siteData.is_public;
      await api.patch(`/websites/${encodeURIComponent(rawUrl)}/toggle-public`, {
        is_public: newStatus
      });
      setSiteData({ ...siteData, is_public: newStatus });
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

        const formattedData = res.data.history.map((item: any) => {

          let rawDate = item.checked_at;
          if (typeof rawDate === 'string' && !rawDate.endsWith('Z')) {
             rawDate += 'Z';
          }
          const dateObj = new Date(rawDate);
          
          const timeStr = range === '7d' || range === '30d'
            ? dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-100 animate-spin mb-4" />
        <p className="text-gray-100 font-medium animate-pulse">Analyzing network data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-100 hover:text-white mb-4 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-[#2a5a8c] border border-white/30 rounded-xl flex items-center justify-center shadow-sm text-[#2563a0]">
                <Globe className="w-7 h-7" />
             </div>
             <div>
               <h1 className="text-2xl font-bold text-white">{rawUrl.replace(/^https?:\/\//, '')}</h1>
               <a href={rawUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline mb-1 block">
                 {rawUrl} ↗
               </a>
               <div className="flex items-center gap-3 mt-2 text-sm text-gray-100">
                  <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium text-xs border ${
                    isCurrentlyUp ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-900/30 text-red-300 border-red-200"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isCurrentlyUp ? "bg-emerald-500" : "bg-red-900/300"}`}/>
                    {isCurrentlyUp ? "Operational" : "Downtime"}
                  </span>
                  
                  {siteData && (
                    <div className="flex items-center gap-2 pl-3 border-l border-white/30">
                      <button 
                        onClick={togglePublicStatus}
                        disabled={toggling}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          siteData.is_public ? 'bg-[#2563a0]' : 'bg-white/20'
                        }`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-[#2a5a8c] transition-transform ${
                          siteData.is_public ? 'translate-x-5' : 'translate-x-1'
                        }`} />
                      </button>
                      <span className="text-xs font-medium">
                        {siteData.is_public ? "Public on /status" : "Private"}
                      </span>
                    </div>
                  )}
               </div>
             </div>
          </div>
        </div>

        <button onClick={handleDelete} className="flex items-center justify-center gap-2 px-4 py-2 mt-6 md:mt-0 text-sm font-medium text-red-400 bg-[#2a5a8c] border border-red-500/30 rounded-lg hover:bg-red-900/30 transition-colors shadow-sm">
          <Trash2 className="w-4 h-4" />
          Delete Monitor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          label={`Current Latency`} 
          value={lastItem?.ping !== null && lastItem?.ping !== undefined ? `${lastItem.ping}ms` : "--"} 
          icon={<Activity className="w-5 h-5" />}
        />
        <StatCard 
          label={`Average Ping (${range.toUpperCase()})`} 
          value={stats ? `${stats.avg_ping}ms` : "--"} 
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard 
          label={`Uptime (${range.toUpperCase()})`} 
          value={stats ? `${stats.uptime_percentage}%` : "--"} 
          icon={<Server className="w-5 h-5" />}
        />
        <StatCard 
          label="SSL Certificate" 
          value={siteData?.ssl_days !== null ? `${siteData.ssl_days} days` : "N/A"} 
          icon={<ShieldCheck className={`w-5 h-5 ${siteData?.ssl_days > 7 ? 'text-emerald-500' : siteData?.ssl_days !== null ? 'text-red-500' : ''}`} />}
        />
      </div>

      <div className="bg-[#2a5a8c] border border-white/30 shadow-sm rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-white">Response Time</h2>
          
          <div className="flex bg-white/15 p-1 rounded-lg">
            {['1h', '24h', '7d', '30d'].map((t) => (
              <button
                key={t}
                onClick={() => setRange(t)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase ${
                  range === t 
                    ? "bg-[#2a5a8c] text-white shadow-sm" 
                    : "text-gray-100 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[350px] w-full">
          {loading && history.length === 0 ? (
            <div className="h-full w-full bg-[#1e4a7a] animate-pulse rounded-lg" />
          ) : history.length > 0 ? (
            <PingChart data={history} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-100 text-sm">
              No data collected for this time range yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: any) {
  return (
    <div className="bg-[#2a5a8c] p-6 rounded-xl border border-white/30 shadow-sm flex items-start justify-between hover:border-white/30 transition-colors">
      <div>
        <p className="text-sm font-medium text-gray-100">{label}</p>
        <p className="text-2xl font-bold text-white mt-2 tracking-tight">{value}</p>
      </div>
      <div className="p-2.5 bg-[#14335c] rounded-lg text-gray-100 border border-white/30">
        {icon}
      </div>
    </div>
  );
}