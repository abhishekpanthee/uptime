"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface PublicAnnouncementBarProps {
  announcements: string[];
}

export function PublicAnnouncementBar({ announcements }: PublicAnnouncementBarProps) {
  const [index, setIndex] = useState(0);
  const [items, setItems] = useState<string[]>(announcements);

  useEffect(() => {
    let active = true;

    async function loadAnnouncements() {
      try {
        const res = await api.get("/public/announcements", { params: { limit: 6 } });
        const remote = Array.isArray(res.data?.announcements)
          ? res.data.announcements
              .map((item: { title?: string }) => (item?.title || "").trim())
              .filter((title: string) => title.length > 0)
          : [];

        if (!active) return;
        if (remote.length > 0) {
          setItems(remote);
          setIndex(0);
          return;
        }

        if (announcements.length > 0) {
          setItems(announcements);
          setIndex(0);
        }
      } catch {
        if (!active) return;
        setItems(announcements);
      }
    }

    loadAnnouncements();
    return () => {
      active = false;
    };
  }, [announcements]);

  useEffect(() => {
    if (!items || items.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [items]);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-[var(--border)] bg-[var(--accent)] text-white">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[auto_1fr] items-center gap-4 px-4 py-1.5 sm:grid-cols-[190px_1fr_190px] sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
          Announcements
        </p>
        <p className="min-w-0 truncate text-xs font-medium sm:text-center sm:text-sm">
          {items[index]}
        </p>
        <div className="hidden sm:block" />
      </div>
    </div>
  );
}
