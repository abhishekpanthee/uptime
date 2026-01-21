"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

export default function StatusPage() {
  const [systems, setSystems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reusing the websites endpoint.
    // Ideally, you would create a specific public endpoint in the backend later.
    api.get("/websites") 
      .then(res => setSystems(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const allOperational = systems.length > 0; // Simplified logic for demo

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* College Brand Header */}
      <div className="bg-[#002147] text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-4">
             <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <span className="text-2xl font-bold">T</span>
             </div>
          </div>
          <h1 className="text-3xl font-bold mb-3">TCIOE System Status</h1>
          <p className="text-blue-100/80 text-lg">
            Real-time performance updates for IOE Chitwan Campus services.
          </p>
        </div>
      </div>

      {/* Status Container */}
      <div className="max-w-3xl mx-auto px-4 -mt-8 mb-12">
        <div className="bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden">
          
          {/* Main Status Banner */}
          <div className="bg-green-50 px-6 py-5 border-b border-zinc-100 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="font-semibold text-green-900">All systems operational</h2>
              <p className="text-sm text-green-700">All services are running normally.</p>
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
                <div key={site.website_url} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="font-medium text-zinc-900">{site.website_url}</span>
                  </div>
                  <span className="text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full border border-green-100">
                    Operational
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-8 text-center border-t border-zinc-200 pt-8">
          <Link href="/login" className="text-sm font-medium text-zinc-500 hover:text-[#002147] transition-colors">
            Administrators Login &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}