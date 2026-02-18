"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AlertCircle, ArrowLeft, Globe, Plus, Type } from "lucide-react";
import Link from "next/link";

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to add monitor";
}

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
    } catch (error: unknown) {
      console.error("Failed to add monitor:", error);
      const msg = getErrorMessage(error);
      
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
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard" className="btn-ghost mb-4 inline-flex">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <section className="surface-panel overflow-hidden fade-up">
        <div className="border-b border-[var(--border)] bg-gradient-to-r from-[#0f4c81] to-[#1b6aa8] px-6 py-7 text-white sm:px-8">
          <div className="mb-4 inline-flex rounded-xl bg-white/15 p-3">
            <Globe className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Add New Monitor</h1>
          <p className="mt-2 text-sm text-[#d5e9ff]">
            Register a website or subdomain to begin uptime and latency monitoring.
          </p>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f0c5c1] bg-[#fdebea] p-4 text-sm text-[#b22d24]">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="mb-5">
              <label htmlFor="siteName" className="mb-2 block text-sm font-semibold text-[var(--ink)]">
                Friendly Name <span className="font-normal text-[var(--ink-soft)]">(optional)</span>
              </label>
              <div className="relative">
                <Type className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-[var(--ink-soft)]" />
                <input
                  type="text"
                  id="siteName"
                  placeholder="e.g. Student Portal"
                  className="input-field pl-10"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="url" className="mb-2 block text-sm font-semibold text-[var(--ink)]">
                Website URL
              </label>
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-[var(--ink-soft)]" />
                <input
                  type="text"
                  id="url"
                  placeholder="e.g. tcioe.edu.np"
                  className="input-field pl-10"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--ink-soft)]">
                We automatically prepend `https://` if protocol is missing.
              </p>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  Adding monitor...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Start Monitoring
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
