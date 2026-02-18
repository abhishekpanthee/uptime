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
        const res = await api.get("/public/status");
        setSystems(res.data);
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

  const allOperational = systems.length === 0 || systems.every(s => s.status === 200);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2a5a8c] via-[#1e4a7a] to-[#2a5a8c] font-sans">
      <header className="px-6 py-4 flex items-center justify-between bg-[#2a5a8c]/60 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#2563a0] to-[#1d4f85] rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">↗</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-white">
            Uptime Monitor
          </span>
        </div>
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-white hover:text-sky-300 transition-colors px-4 py-2 rounded-lg hover:bg-white/10">
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>
      </header>

      <div className="bg-gradient-to-br from-[#2563a0] to-[#1d4f85] text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-4">
             <div className="w-12 h-12 bg-white/15 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/30">
                <span className="text-2xl font-bold">↗</span>
             </div>
          </div>
          <h1 className="text-3xl font-bold mb-3">System Status</h1>
          <p className="text-gray-100/80 text-lg">
            Real-time performance updates for all monitored services.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-8 mb-12">
        <div className="bg-[#2a5a8c] rounded-2xl shadow-xl border border-white/30 overflow-hidden">
          <div className={`px-6 py-5 border-b border-white/20 flex items-center gap-3 ${allOperational ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            {allOperational ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-400" />
            )}
            <div>
              <h2 className={`font-semibold ${allOperational ? 'text-green-300' : 'text-red-300'}`}>
                {allOperational ? "All systems operational" : "Some systems are experiencing issues"}
              </h2>
              <p className={`text-sm ${allOperational ? 'text-green-400/80' : 'text-red-400/80'}`}>
                {allOperational ? "All services are running normally." : "We are actively investigating the downtime."}
              </p>
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {loading ? (
              <div className="p-8 flex justify-center text-gray-100">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Checking services...
              </div>
            ) : systems.length === 0 ? (
               <div className="p-6 text-center text-gray-100">No public systems configured.</div>
            ) : (
              systems.map((site) => (
                <div key={site.url} className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-[#14335c] transition-colors gap-4">
                  
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <span className="relative flex h-3 w-3">
                        {site.status === 200 && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${site.status === 200 ? 'bg-green-400' : 'bg-red-400'}`}></span>
                      </span>
                      <span className="font-medium text-white">{site.url.replace(/^https?:\/\//, '')}</span>
                    </div>
                    {site.ssl_days !== null && site.ssl_days !== undefined && (
                      <div className="ml-7 flex items-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
                          site.ssl_days > 30 ? "bg-green-500/20 text-green-300 border-green-500/30" : 
                          site.ssl_days > 7 ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" : 
                          "bg-red-500/20 text-red-300 border-red-500/30"
                        }`}>
                          <Lock className="w-2.5 h-2.5" />
                          SSL: {site.ssl_days} days
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 ml-7 sm:ml-0">
                    {site.ping && (
                      <span className="text-xs text-gray-100 font-mono">
                        {site.ping}ms
                      </span>
                    )}
                    {site.status === 200 ? (
                      <span className="text-xs text-green-300 font-bold uppercase tracking-widest bg-green-500/20 px-3 py-1 rounded-full border border-green-400/30">
                        Operational
                      </span>
                    ) : (
                      <span className="text-xs text-red-300 font-bold uppercase tracking-widest bg-red-500/20 px-3 py-1 rounded-full border border-red-400/30">
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