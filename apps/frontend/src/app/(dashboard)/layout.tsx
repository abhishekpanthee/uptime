"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Loader2 } from "lucide-react";

function subscribeToAuth(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const callback = () => onStoreChange();
  window.addEventListener("storage", callback);
  window.addEventListener("focus", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("focus", callback);
  };
}

function getAuthTokenSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("uptimeToken");
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const token = useSyncExternalStore(
    subscribeToAuth,
    getAuthTokenSnapshot,
    () => null
  );
  const isAuthorized = Boolean(token);

  useEffect(() => {
    if (!isAuthorized) {
      router.push("/login");
    }
  }, [isAuthorized, router]);

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="surface-panel flex flex-col items-center gap-2 px-8 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#0f4c81]" />
          <p className="text-sm text-[var(--ink-soft)]">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="px-4 pb-10 pt-20 sm:px-6 lg:pl-80 lg:pr-8 lg:pt-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
