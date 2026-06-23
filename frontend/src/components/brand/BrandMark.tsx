import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  tone?: "light" | "dark";
}

/**
 * BrandMark — modern, monolinear monogram. Pure sans, no serif anywhere.
 * Indigo gradient mark + clean wordmark.
 */
export function BrandMark({
  className,
  size = "md",
  withWordmark = false,
  tone = "dark",
}: BrandMarkProps) {
  const dim = size === "sm" ? 28 : size === "lg" ? 40 : 32;
  const fgClass = tone === "light" ? "text-white" : "text-foreground";

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="brand-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#6366F1" />
            <stop offset="1" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#brand-grad)" />
        {/* Stylized tooth glyph — single-color, geometric */}
        <path
          d="M11.2 9.5c-1.7 0-2.9 1.1-2.9 3 0 1.5.5 2.5 1.1 3.9.5 1.2.9 2.3.9 3.5 0 1 .5 1.7 1.2 1.7s1-.5 1.3-1.7c.2-1 .3-1.2 1-1.2s.9.2 1 1.2c.2 1.2.5 1.7 1.3 1.7.7 0 1.2-.7 1.2-1.7 0-1.2.4-2.3.9-3.5.6-1.4 1.1-2.4 1.1-3.9 0-1.9-1.2-3-2.9-3-1 0-1.6.3-2.3.3s-1.3-.3-2.3-.3Z"
          fill="#ffffff"
        />
      </svg>
      {withWordmark && (
        <span
          className={cn(
            "text-[15px] font-semibold tracking-tight",
            fgClass,
          )}
        >
          Dental<span className="text-accent">.</span>CRM
        </span>
      )}
    </div>
  );
}
