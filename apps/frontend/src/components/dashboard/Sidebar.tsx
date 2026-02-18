"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CollegeBrand } from "@/components/brand/CollegeBrand";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Public Status", href: "/status", icon: Globe },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    localStorage.removeItem("uptimeToken");
    router.push("/login");
  }

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur lg:hidden">
        <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between px-4">
          <CollegeBrand compact href="/dashboard" />
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--ink)]"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-30 bg-[#0f2239]/45 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeMobileMenu}
      />

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-[var(--border)] bg-white shadow-xl transition-transform duration-300 lg:w-72 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex min-h-[82px] items-center border-b border-[var(--border)] px-4">
          <CollegeBrand href="/dashboard" subtitle="Uptime Console" />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            Navigation
          </p>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className={cn(
                  "mt-2 flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "border-[#c5d2ea] bg-[#eef2ff] text-[var(--brand)]"
                    : "border-transparent text-[var(--ink-soft)] hover:border-[var(--border)] hover:bg-[#f7faff] hover:text-[var(--ink)]"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] p-4">
          <button
            onClick={handleLogout}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--danger)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-95"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
