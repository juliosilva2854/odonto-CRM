import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Show the wordmark to the right of the icon. */
  withWordmark?: boolean;
  tone?: "light" | "dark";
}

/**
 * BrandMark — a stylised, abstract tooth + arch glyph that doubles as the
 * monogram. Designed to feel like a serif logotype, not a hospital icon.
 */
export function BrandMark({
  className,
  size = "md",
  withWordmark = false,
  tone = "dark",
}: BrandMarkProps) {
  const dim = size === "sm" ? 28 : size === "lg" ? 44 : 36;
  const fg = tone === "light" ? "hsl(40 33% 96%)" : "hsl(145 9% 21%)";
  const accent = "hsl(35 36% 60%)";

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect width="44" height="44" rx="9" fill={fg} />
        <path
          d="M15 12c-2.5 0-4 1.7-4 4.2 0 2 .8 3.7 1.6 5.8.7 1.7 1.3 3.3 1.3 5 0 1.4.7 2.5 1.8 2.5 1.1 0 1.5-.8 1.8-2.5.3-1.3.5-1.7 1.5-1.7s1.2.4 1.5 1.7c.3 1.7.7 2.5 1.8 2.5s1.8-1.1 1.8-2.5c0-1.7.6-3.3 1.3-5C26.2 19.9 27 18.2 27 16.2 27 13.7 25.5 12 23 12c-1.5 0-2.3.5-3.4.5S16.5 12 15 12Z"
          fill={accent}
        />
        <circle cx="33" cy="32" r="2.5" fill={accent} opacity="0.6" />
      </svg>
      {withWordmark && (
        <span
          className={cn(
            "font-serif text-xl tracking-tight",
            tone === "light" ? "text-primary-foreground" : "text-foreground",
          )}
        >
          Dental<span className="text-accent">.</span>CRM
        </span>
      )}
    </div>
  );
}
