"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import Link from "next/link";
import { Activity, Plus, ArrowRight, Globe, AlertCircle } from "lucide-react";

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
        <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-zinc-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Dashboard</h1>
            <p className="text-zinc-600 text-sm mt-2">Monitor and manage your website uptime</p>
          </div>
          <Link 
            href="/dashboard/add" 
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Monitor
          </Link>
        </div>

        {websites.length === 0 ? (
          <div className="card text-center py-24 px-8 border-2 border-dashed border-zinc-200">
            <div className="w-16 h-16 bg-gradient-to-br from-zinc-100 to-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-zinc-400">
              <Activity className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">No monitors created yet</h3>
            <p className="text-zinc-600 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              Start monitoring your first website today. Add monitors for your critical services and track their uptime.
            </p>
            <Link 
              href="/dashboard/add" 
              className="btn-primary inline-flex items-center gap-2"
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
                className="card group p-6 hover:border-zinc-200 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center border border-blue-200 group-hover:from-blue-200 transition-all">
                    <Globe className="w-6 h-6 text-[#002147]" />
                  </div>
                  {site.is_public && (
                     <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                       Public
                     </span>
                  )}
                </div>
                
                <h3 className="font-semibold text-zinc-900 truncate mb-2 text-lg">
                  {site.website_url.replace(/^https?:\/\//, '')}
                </h3>
                
                <div className="flex items-center text-sm text-emerald-600 font-medium">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                  Operational
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100">
                  <p className="text-xs text-zinc-500">Click to view details →</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}