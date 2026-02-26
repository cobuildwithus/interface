import { cn } from "@/lib/shared/utils";
import { formatUsd, formatTokenAmount, formatPercent } from "@/lib/shared/currency/format";
import { AnimatedNumber } from "@/components/ui/animated-number";

type CurrencyKind = "usd" | "token" | "percent";

interface CurrencyProps {
  value: number;
  kind?: CurrencyKind;
  compact?: boolean;
  showSign?: boolean;
  className?: string;
  animated?: boolean;
}

/**
 * Renders a formatted currency/number value with tabular-nums for alignment.
 *
 * @example
 * <Currency value={1234.56} /> // $1,234.56
 * <Currency value={1234567} kind="usd" compact /> // $1.2M
 * <Currency value={1234567} kind="token" /> // 1.2M
 * <Currency value={12.5} kind="percent" showSign /> // +12.5%
 */
export function Currency({
  value,
  kind = "usd",
  compact = false,
  showSign = false,
  className,
  animated = false,
}: CurrencyProps) {
  const formatter = (raw: number) => {
    if (kind === "usd") return formatUsd(raw, { compact });
    if (kind === "token") return formatTokenAmount(raw);
    return formatPercent(raw, { showSign });
  };

  if (!Number.isFinite(value)) {
    return <span className={cn("tabular-nums", className)}>—</span>;
  }

  if (animated) {
    return (
      <AnimatedNumber value={value} format={formatter} className={cn("tabular-nums", className)} />
    );
  }

  const formatted = formatter(value);

  return <span className={cn("tabular-nums", className)}>{formatted}</span>;
}
