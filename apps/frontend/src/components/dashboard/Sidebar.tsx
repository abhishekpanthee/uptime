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
    localStorage.removeItem("token");
    router.push("/login");
  }

  return (
    <aside className="w-64 bg-zinc-950 text-white flex flex-col h-screen fixed left-0 top-0 border-r border-zinc-800 z-50">
      <div className="h-16 flex items-center px-6 border-b border-zinc-800">
        <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center mr-3 font-bold text-lg">
            IOE
        </div>
        <div className="leading-none">
          <span className="block font-bold text-base tracking-tight text-white">Thapathali</span>
          <span className="block text-xs text-zinc-400 font-medium">Campus Monitor</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        <p className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Menu</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
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

      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-md transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}