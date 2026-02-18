"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import Link from "next/link";
import { Activity, Plus, Globe, Lock } from "lucide-react";

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [websites, setWebsites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadMonitors() {
      try {
        const res = await api.get("/websites");
        
        if (Array.isArray(res.data)) {
          setWebsites(res.data);
        } else {
          console.warn("API returned non-array:", res.data);
          setWebsites([]); 
        }
      } catch (err) {
        console.error("Failed to load monitors", err);
        setWebsites([]); 
      } finally {
        setLoading(false);
      }
    }
    loadMonitors();
  }, [isAuthenticated]);

  if (authLoading || loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="h-8 w-48 bg-white/15 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-white/15 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2a5a8c] via-[#1e4a7a] to-[#2a5a8c] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
            <p className="text-gray-100 text-sm mt-2">Monitor and manage your website uptime</p>
          </div>
          <Link 
            href="/dashboard/add" 
            className="btn-primary flex items-center gap-2 bg-[#2563a0] text-white px-4 py-2 rounded-lg hover:bg-[#1d4f85] transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Monitor
          </Link>
        </div>

        {websites.length === 0 ? (
          <div className="card text-center py-24 px-8 border-2 border-dashed border-white/30 bg-[#2a5a8c] rounded-2xl">
            <div className="w-16 h-16 bg-gradient-to-br from-zinc-100 to-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-gray-100">
              <Activity className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No monitors created yet</h3>
            <p className="text-gray-100 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              Start monitoring your first website today. Add monitors for your critical services and track their uptime.
            </p>
            <Link 
              href="/dashboard/add" 
              className="inline-flex items-center gap-2 bg-[#2563a0] text-white px-4 py-2 rounded-lg hover:bg-[#1d4f85] transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Create Your First Monitor
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {websites.map((site) => (
              <Link 
                key={site.website_url} 
                href={`/dashboard/monitor/${encodeURIComponent(site.website_url)}`}
                className="bg-white/5 rounded-xl group p-6 border border-white/10 hover:border-white/30 hover:bg-white/10 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-white/15 rounded-lg flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-all">
                    <Globe className="w-6 h-6 text-sky-300" />
                  </div>
                  {site.is_public && (
                     <span className="text-[10px] font-bold uppercase tracking-widest text-sky-300 bg-sky-500/20 px-2.5 py-1 rounded-md border border-sky-400/30">
                       Public
                     </span>
                  )}
                </div>
                
                <h3 className="font-semibold text-white truncate text-lg">
                  {site.site_name || site.website_url.replace(/^https?:\/\//, '')}
                </h3>
                
                {site.site_name && (
                  <p className="text-xs text-gray-100 truncate mt-1">{site.website_url}</p>
                )}
                
                <div className="flex flex-col gap-3 mt-4">
                  <div className="flex items-center text-sm text-green-300 font-medium">
                    <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse" />
                    Operational
                  </div>

                  {site.ssl_days !== null && site.ssl_days !== undefined && (
                    <div className="flex items-center">
                      <span 
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest border ${
                          site.ssl_days > 30 
                            ? "bg-green-500/20 text-green-300 border-green-500/30" 
                            : site.ssl_days > 7 
                            ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" 
                            : "bg-red-500/20 text-red-300 border-red-500/30"
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        SSL: {site.ssl_days} days left
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-white/10">
                  <p className="text-xs text-white/60 group-hover:text-white transition-colors">
                    Click to view details →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}