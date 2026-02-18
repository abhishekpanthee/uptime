"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Globe, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Public Status", href: "/status", icon: Globe },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("uptimeToken");
    router.push("/login");
  }

  return (
    <aside className="w-64 bg-gradient-to-b from-[#2563a0] to-[#1d4f85] text-white flex flex-col h-screen fixed left-0 top-0 border-r border-[#2e6fb0] z-50 shadow-xl">
      <div className="h-16 flex items-center px-6 border-b border-[#2e6fb0]/50">
        <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-lg flex items-center justify-center mr-3 font-bold text-sm border border-white/30">
            <span className="text-white font-bold">↗</span>
        </div>
        <div className="leading-tight">
          <span className="block font-bold text-sm tracking-tight text-white">Uptime</span>
          <span className="block text-xs text-gray-100 font-medium">Monitor</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-8 space-y-2">
        <p className="px-4 text-xs font-semibold text-blue-200/60 uppercase tracking-widest mb-6">Navigation</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white/15 text-white shadow-lg border border-white/30"
                  : "text-gray-100 hover:text-white hover:bg-white/15 border border-transparent"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#2e6fb0]/50">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}