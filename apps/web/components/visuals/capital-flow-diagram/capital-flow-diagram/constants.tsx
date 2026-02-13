"use client";

import type { ReactNode } from "react";

export const SVG_WIDTH = 800;
export const SVG_HEIGHT = 380;
export const CENTER_X = SVG_WIDTH / 2;
export const ROWS = { sources: 65, treasury: 190, budgets: 320 };
export const SIZES = { source: { w: 140, h: 75 }, treasury: 90, budget: { w: 105, h: 52 } };

export const REVENUE_SOURCES = [
  { name: "Minting", description: "New tokens issued" },
  { name: "Splits", description: "Revenue sharing" },
  { name: "Donations", description: "Direct contributions" },
  { name: "Fees", description: "Protocol fees" },
];

export const BUDGET_COLORS = [
  "var(--color-blue-500)",
  "var(--color-violet-500)",
  "var(--color-pink-500)",
  "var(--color-amber-500)",
  "var(--color-emerald-500)",
  "var(--color-sky-500)",
];

export const formatUsd = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

export const getX = (index: number, total: number) => (SVG_WIDTH / (total + 1)) * (index + 1);

export function IconCircle({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <g transform={`translate(${x - 10}, ${y - 10})`}>
      <circle
        cx={10}
        cy={10}
        r={9}
        className="fill-emerald-500/20 stroke-emerald-500"
        strokeWidth={1}
      />
      {children}
    </g>
  );
}

export const SOURCE_ICONS: Record<number, ReactNode> = {
  0: (
    <text
      x={10}
      y={14}
      textAnchor="middle"
      className="fill-emerald-500"
      fontSize={12}
      fontWeight={600}
    >
      $
    </text>
  ),
  1: (
    <path
      d="M6 13L10 9M10 9L14 13M10 9V7M6 7L10 11M10 11L14 7M10 11V13"
      className="stroke-emerald-500"
      strokeWidth={1.2}
      strokeLinecap="round"
      fill="none"
    />
  ),
  2: (
    <>
      <circle cx={10} cy={10} r={5} className="fill-emerald-500" />
      <circle cx={10} cy={10} r={8} className="stroke-emerald-500" strokeWidth={1} fill="none" />
    </>
  ),
  3: (
    <>
      <path
        d="M6 10h8M10 6v8"
        className="stroke-emerald-500"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </>
  ),
};
