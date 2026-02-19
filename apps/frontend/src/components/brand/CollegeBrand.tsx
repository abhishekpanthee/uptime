import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CollegeBrandProps {
  className?: string;
  compact?: boolean;
  href?: string;
  subtitle?: string;
  tone?: "dark" | "light";
}

function BrandContent({
  compact = false,
  subtitle,
  tone = "dark",
}: Pick<CollegeBrandProps, "compact" | "subtitle" | "tone">) {
  const headingTone =
    tone === "light" ? "text-white" : "text-[var(--college-blue)]";
  const campusTone =
    tone === "light" ? "text-white/85" : "text-[var(--ink-soft)]";
  const subtitleTone =
    tone === "light" ? "text-white/75" : "text-[var(--ink-soft)]";

  return (
    <>
      <Image
        src="/data/logo.png"
        width={compact ? 38 : 46}
        height={compact ? 38 : 46}
        alt="Tribhuvan University Institute of Engineering Thapathali Campus Logo"
        className="shrink-0"
        priority
      />
      <div className="leading-tight">
        <p className={cn("text-xs font-bold sm:text-sm", headingTone)}>
          Tribhuvan University
        </p>
        <p className={cn("text-[11px] font-semibold sm:text-xs", headingTone)}>
          Institute of Engineering
        </p>
        <p className={cn("text-[10px] font-medium sm:text-xs", campusTone)}>
          Thapathali Campus
        </p>
        {subtitle ? (
          <p className={cn("mt-0.5 text-[10px] font-medium sm:text-[11px]", subtitleTone)}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </>
  );
}

export function CollegeBrand({
  className,
  compact = false,
  href,
  subtitle,
  tone = "dark",
}: CollegeBrandProps) {
  const classes = cn("flex items-center gap-2.5", className);
  const content = (
    <BrandContent compact={compact} subtitle={subtitle} tone={tone} />
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}
