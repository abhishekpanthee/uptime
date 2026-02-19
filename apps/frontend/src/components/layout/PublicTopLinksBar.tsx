import Link from "next/link";
import {
  Activity,
  House,
  MessageSquare,
  Search,
  Shield,
} from "lucide-react";

function UtilityLink({
  href,
  icon,
  label,
  highlight = false,
  external = true,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`inline-flex items-center gap-1 font-medium transition-colors ${
        highlight
          ? "text-[var(--accent)] hover:text-[#f56a00]"
          : "hover:text-[var(--brand)]"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

export function PublicTopLinksBar() {
  return (
    <div className="hidden border-b border-[var(--border)] bg-[#f1f1f1] md:block">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2 text-xs text-[#1f2937] sm:px-6">
        <div className="flex items-center gap-4">
          <UtilityLink
            href="https://tcioe.edu.np"
            icon={<House className="h-3.5 w-3.5" />}
            label="TCIOE"
          />
          <span className="h-4 w-px bg-[#a3a3a3]" />
          <UtilityLink
            href="https://emis.tcioe.edu.np"
            icon={<Shield className="h-3.5 w-3.5" />}
            label="Security"
          />
        </div>

        <div className="flex items-center gap-4">
          <UtilityLink
            href="/status"
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Status"
            external={false}
          />
          <span className="h-4 w-px bg-[#a3a3a3]" />
          <UtilityLink
            href="https://tcioe.edu.np/suggestion-box"
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            label="Suggestions"
            highlight
          />
          <button
            type="button"
            aria-label="Search"
            className="rounded-md p-1.5 transition-colors hover:bg-black/10"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
