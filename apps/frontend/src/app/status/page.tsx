"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { CheckCircle, AlertTriangle, Loader2, LayoutDashboard, Lock } from "lucide-react";

export default function StatusPage() {
  const [systems, setSystems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        // Fetching from the new PUBLIC endpoint we just made
        const res = await api.get("/public/status");
        setSystems(res.data);
      } catch (error) {
        console.error("Failed to load public status", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStatus();
    
    // Auto-refresh the page every 60 seconds
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Dynamically check if ALL systems are 200 OK
  const allOperational = systems.length === 0 || systems.every(s => s.status === 200);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50 font-sans">
      <header className="px-6 py-4 flex items-center justify-between border-b border-zinc-100/50 bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#002147] to-[#005bb5] rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">↗</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-[#002147]">
            Uptime Monitor
          </span>
        </div>
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-[#002147] transition-colors px-4 py-2 rounded-lg hover:bg-zinc-100/50">
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>
      </header>

      <div className="bg-gradient-to-br from-[#002147] to-[#005bb5] text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-4">
             <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/20">
                <span className="text-2xl font-bold">↗</span>
             </div>
          </div>
          <h1 className="text-3xl font-bold mb-3">System Status</h1>
          <p className="text-blue-100/80 text-lg">
            Real-time performance updates for all monitored services.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-8 mb-12">
        <div className="bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden">

          {/* Dynamic Banner: Turns Red if a site is down */}
          <div className={`px-6 py-5 border-b border-zinc-100 flex items-center gap-3 ${allOperational ? 'bg-green-50' : 'bg-red-50'}`}>
            {allOperational ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600" />
            )}
            <div>
              <h2 className={`font-semibold ${allOperational ? 'text-green-900' : 'text-red-900'}`}>
                {allOperational ? "All systems operational" : "Some systems are experiencing issues"}
              </h2>
              <p className={`text-sm ${allOperational ? 'text-green-700' : 'text-red-700'}`}>
                {allOperational ? "All services are running normally." : "We are actively investigating the downtime."}
              </p>
            </div>
          </div>

          <div className="divide-y divide-zinc-100">
            {loading ? (
              <div className="p-8 flex justify-center text-zinc-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Checking services...
              </div>
            ) : systems.length === 0 ? (
               <div className="p-6 text-center text-zinc-500">No public systems configured.</div>
            ) : (
              systems.map((site) => (
                <div key={site.url} className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-zinc-50 transition-colors gap-4">
                  
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <span className="relative flex h-3 w-3">
                        {site.status === 200 && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${site.status === 200 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      </span>
                      <span className="font-medium text-zinc-900">{site.url.replace(/^https?:\/\//, '')}</span>
                    </div>

                    {/* SSL Badge */}
                    {site.ssl_days !== null && site.ssl_days !== undefined && (
                      <div className="ml-7 flex items-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
                          site.ssl_days > 30 ? "bg-green-50 text-green-700 border-green-200" : 
                          site.ssl_days > 7 ? "bg-yellow-50 text-yellow-700 border-yellow-200" : 
                          "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          <Lock className="w-2.5 h-2.5" />
                          SSL: {site.ssl_days} days
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 ml-7 sm:ml-0">
                    {site.ping && (
                      <span className="text-xs text-zinc-400 font-mono">
                        {site.ping}ms
                      </span>
                    )}
                    {site.status === 200 ? (
                      <span className="text-xs text-green-600 font-bold uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full border border-green-100">
                        Operational
                      </span>
                    ) : (
                      <span className="text-xs text-red-600 font-bold uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full border border-red-100">
                        Downtime
                      </span>
                    )}
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}