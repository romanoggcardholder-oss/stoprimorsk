import { cn } from "@/lib/utils"

export function Logo({
  inverted = false,
  compact = false,
}: {
  inverted?: boolean
  compact?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 48 48" className="size-10 shrink-0" aria-hidden="true">
        <rect width="48" height="48" rx="14" fill={inverted ? "#FFC928" : "#202124"} />
        <path
          d="M8 29.5c1.2-4.2 3.4-7 7.2-7h17.2c2.6 0 4.4 1.2 5.6 3.4l2 3.6H8Z"
          fill={inverted ? "#202124" : "#FFC928"}
        />
        <path d="M14 26.2 17.2 20h8.4l2.2 6.2" fill="none" stroke={inverted ? "#202124" : "#fff"} strokeWidth="1.7" />
        <circle cx="16" cy="32.5" r="2.4" fill={inverted ? "#fff" : "#202124"} />
        <circle cx="33" cy="32.5" r="2.4" fill={inverted ? "#fff" : "#202124"} />
      </svg>
      <span className={cn("font-display leading-[1.05] font-semibold tracking-tight", inverted ? "text-white" : "text-graphite", compact ? "text-[11px]" : "text-xs sm:text-sm")}>
        СТО НА
        <br />
        ПРИМОРСКОМ
      </span>
    </span>
  )
}
