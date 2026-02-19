import { CollegeBrand } from "@/components/brand/CollegeBrand";

export function PublicStatusFooter() {
  return (
    <footer className="mt-8 border-t border-[var(--border)] bg-white/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-5 text-sm text-[var(--ink-soft)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <CollegeBrand compact href="/status" subtitle="Infrastructure Status" />
        <p>Uptime Monitoring System © {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
