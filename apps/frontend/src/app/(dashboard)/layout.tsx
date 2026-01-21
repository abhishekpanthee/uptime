"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 1. Check for token
    const token = localStorage.getItem("token");
    
    // 2. If no token, redirect to login
    if (!token) {
      router.push("/login");
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  // Show a spinner while checking auth to prevent "flashing" protected content
  if (!isAuthorized) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar />
      {/* ml-64: Pushes content right to account for the fixed 64 (16rem/256px) sidebar 
         w-full: Takes remaining width
      */}
      <main className="ml-64 p-8 w-[calc(100%-16rem)]">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}