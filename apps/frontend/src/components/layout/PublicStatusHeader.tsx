import Image from "next/image";
import Link from "next/link";
import { PublicAnnouncementBar } from "@/components/layout/PublicAnnouncementBar";
import { PublicTopLinksBar } from "@/components/layout/PublicTopLinksBar";

const ANNOUNCEMENTS = [
  "Scheduled maintenance: Campus digital platforms may briefly restart on Sundays after 8:00 PM.",
  "Status updates refresh every 60 seconds automatically.",
  "For urgent system issues, contact campus IT support with the affected URL and timestamp.",
];

export function PublicStatusHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/85 backdrop-blur">
      <PublicTopLinksBar />
      <div className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/status" className="flex items-center gap-3">
            <Image
              src="/data/logo.png"
              width={58}
              height={58}
              alt="Thapathali Campus Status"
              className="shrink-0"
              priority
            />
            <div className="leading-tight text-[var(--brand)]">
              <p className="text-lg font-bold sm:text-2xl">
                Thapathali Campus
              </p>
              <p className="mt-1 text-xl font-bold leading-none sm:text-3xl">
                Service Status
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--ink-soft)]">
                Official uptime dashboard for digital campus services
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <Image
              src="/data/accrdiated.webp"
              width={52}
              height={52}
              alt="UGC Accredited"
              className="shrink-0"
            />
            <div className="leading-tight text-[#374151]">
              <p className="text-lg font-semibold leading-tight lg:text-xl">
                Accredited by University Grants Commision
              </p>
              <p className="text-sm font-medium">(UGC) Nepal</p>
              <p className="text-sm">Quality Education Since 1930 A.D.</p>
            </div>
          </div>
        </div>
      </div>
      <PublicAnnouncementBar announcements={ANNOUNCEMENTS} />
    </header>
  );
}
