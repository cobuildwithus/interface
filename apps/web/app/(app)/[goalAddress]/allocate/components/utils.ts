import type { StatusConfig } from "./types";

export function formatTimeAgo(date: Date): string {
  const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatFullNumber(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const statusConfig: StatusConfig = {
  active: { label: "Funding", color: "text-emerald-500", bg: "bg-emerald-500" },
  paused: { label: "Paused", color: "text-amber-500", bg: "bg-amber-500" },
  complete: { label: "Complete", color: "text-sky-500", bg: "bg-sky-500" },
  draft: { label: "Draft", color: "text-zinc-400", bg: "bg-zinc-400" },
  needsStake: { label: "Needs Stake", color: "text-violet-500", bg: "bg-violet-500" },
};
