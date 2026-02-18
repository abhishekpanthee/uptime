"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ArrowLeft, Globe, Plus, AlertCircle, Type } from "lucide-react";
import Link from "next/link";

export default function AddMonitorPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [siteName, setSiteName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    let formattedUrl = url.trim();
    if (!formattedUrl) {
      setError("Please enter a URL");
      setLoading(false);
      return;
    }

    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = "https://" + formattedUrl;
    }

    try {
      await api.post("/websites", { 
        url: formattedUrl,
        site_name: siteName.trim() || undefined,
      });

      router.push("/dashboard");
      router.refresh(); 
    } catch (err: any) {
      console.error("Failed to add monitor:", err);
      const msg = err.response?.data?.message || err.message || "Failed to add monitor";
      
      if (msg.includes("unique")) {
        setError("You are already monitoring this website.");
      } else {
        setError("Could not add website. Please check the URL and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <Link 
        href="/dashboard" 
        className="inline-flex items-center text-sm text-gray-100 hover:text-white mb-6 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Dashboard
      </Link>

      <div className="bg-[#2a5a8c] border border-white/30 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-white/30 bg-[#183d6a]/50">
          <div className="w-12 h-12 bg-[#2a5a8c] border border-white/30 rounded-lg flex items-center justify-center shadow-sm mb-4 text-white">
            <Globe className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Add New Monitor</h1>
          <p className="text-gray-100 text-sm mt-1">
            Start tracking the uptime and performance of a new website.
          </p>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-4 bg-red-900/30 border border-red-500/30 rounded-lg flex items-start gap-3 text-red-300 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="mb-5">
              <label htmlFor="siteName" className="block text-sm font-medium text-gray-100 mb-2">
                Friendly Name <span className="text-gray-100 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Type className="h-5 w-5 text-gray-100" />
                </div>
                <input
                  type="text"
                  id="siteName"
                  placeholder="e.g. College Portal"
                  className="w-full pl-10 pr-4 py-3 bg-[#1e4a7a] border border-white/30 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all placeholder:text-gray-400"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="url" className="block text-sm font-medium text-gray-100 mb-2">
                Website URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Globe className="h-5 w-5 text-gray-100" />
                </div>
                <input
                  type="text"
                  id="url"
                  placeholder="e.g. tcioe.edu.np"
                  className="w-full pl-10 pr-4 py-3 bg-[#1e4a7a] border border-white/30 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all placeholder:text-gray-400"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                />
              </div>
              <p className="mt-2 text-xs text-gray-100">
                We'll automatically add https:// if you forget it.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563a0] text-white font-medium py-3 rounded-lg hover:bg-[#1d4f85] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Start Monitoring
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}