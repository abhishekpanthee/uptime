"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Website } from "@/types";
import { AddMonitorModal } from "@/components/dashboard/AddMonitorModal";

export default function DashboardPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function fetchWebsites() {
    try {
      const res = await api.get("/websites");
      setWebsites(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWebsites();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-zinc-500 text-sm">Overview of your monitored services.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-zinc-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Monitor
        </button>
      </div>

      {loading ? (
        <div className="text-zinc-500 text-sm">Loading monitors...</div>
      ) : websites.length === 0 ? (
        <div className="border border-dashed border-zinc-300 rounded-lg p-12 text-center">
          <h3 className="text-zinc-900 font-medium mb-1">No monitors yet</h3>
          <p className="text-zinc-500 text-sm mb-4">Add your first website to start tracking.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-black font-semibold hover:underline text-sm"
          >
            Add one now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {websites.map((site) => (
            <Link 
              key={site.website_url} 
              href={`/dashboard/monitor/${encodeURIComponent(site.website_url)}`}
              className="block group"
            >
              <div className="bg-white border border-zinc-200 rounded-lg p-5 hover:border-black transition-colors shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 group-hover:bg-black group-hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                    Active
                  </span>
                </div>
                <h3 className="font-semibold text-zinc-900 truncate">{site.website_url}</h3>
                <p className="text-zinc-500 text-xs mt-1">Checked every 1 minute</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <AddMonitorModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchWebsites()}
      />
    </div>
  );
}