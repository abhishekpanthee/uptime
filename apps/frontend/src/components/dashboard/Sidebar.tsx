"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Activity, Settings, LogOut, Globe } from "lucide-react";
import { cn } from "@/lib/utils"; // Uses the utility we just added

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Public Status", href: "/status", icon: Globe }, // Direct link to public page
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  return (
    <aside className="w-64 bg-zinc-950 text-white flex flex-col h-screen fixed left-0 top-0 border-r border-zinc-800 z-50">
      {/* TCIOE Branding Area */}
      <div className="h-16 flex items-center px-6 border-b border-zinc-800">
        <div className="w-8 h-8 bg-[#002147] rounded-lg flex items-center justify-center mr-3 border border-zinc-700">
            <span className="text-white font-bold">T</span>
        </div>
        <span className="font-bold text-lg tracking-tight">TCIOE Monitor</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User / Logout Section */}
      <div className="p-4 border-t border-zinc-800">
        <div className="mb-4 px-3">
          <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Account</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}