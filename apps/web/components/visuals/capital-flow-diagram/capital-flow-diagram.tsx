"use client";

import { BUDGETS } from "@/components/features/funding/confirm-swap-dialog/constants";
import type { FundingData } from "@/lib/domains/token/juicebox/funding-data";
import {
  BUDGET_COLORS,
  CENTER_X,
  IconCircle,
  REVENUE_SOURCES,
  ROWS,
  SIZES,
  SOURCE_ICONS,
  SVG_HEIGHT,
  SVG_WIDTH,
  formatUsd,
  getX,
} from "./capital-flow-diagram/constants";
function CurvedPath({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const offset = Math.abs(y2 - y1) * 0.4;
  return (
    <path
      d={`M ${x1} ${y1} C ${x1} ${y1 + offset}, ${x2} ${y2 - offset}, ${x2} ${y2}`}
      fill="none"
      className="stroke-emerald-500"
      strokeWidth={1.5}
      strokeDasharray="4 6"
      opacity={0.3}
    />
  );
}

export function CapitalFlowDiagram({ treasury }: FundingData) {
  return (
    <div className="bg-muted/30 overflow-hidden rounded-xl border px-0 py-5">
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="h-auto w-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <style>{`
                @media (max-width: 640px) {
                  .source-desc { display: none; }
                  .budget-title { font-size: 10px; font-weight: 600; }
                }
              `}</style>
            <radialGradient id="treasuryGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-emerald-500)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--color-emerald-500)" stopOpacity="0" />
            </radialGradient>
            {BUDGETS.map((_, i) => (
              <radialGradient key={i} id={`budgetGlow-${i}`} cx="50%" cy="50%" r="50%">
                <stop
                  offset="0%"
                  stopColor={BUDGET_COLORS[i % BUDGET_COLORS.length]}
                  stopOpacity="0.12"
                />
                <stop
                  offset="100%"
                  stopColor={BUDGET_COLORS[i % BUDGET_COLORS.length]}
                  stopOpacity="0"
                />
              </radialGradient>
            ))}
          </defs>

          {/* Revenue sources */}
          {REVENUE_SOURCES.map((source, i) => {
            const x = getX(i, REVENUE_SOURCES.length);
            return (
              <g key={source.name}>
                <rect
                  x={x - SIZES.source.w / 2}
                  y={ROWS.sources - SIZES.source.h / 2}
                  width={SIZES.source.w}
                  height={SIZES.source.h}
                  rx={10}
                  className="fill-card stroke-border"
                  strokeWidth={1}
                />
                <IconCircle x={x} y={ROWS.sources - 16}>
                  {SOURCE_ICONS[i]}
                </IconCircle>
                <text
                  x={x}
                  y={ROWS.sources + 12}
                  textAnchor="middle"
                  className="fill-foreground"
                  fontSize={11}
                  fontWeight={500}
                >
                  {source.name}
                </text>
                <text
                  x={x}
                  y={ROWS.sources + 26}
                  textAnchor="middle"
                  className="fill-muted-foreground source-desc"
                  fontSize={9}
                >
                  {source.description}
                </text>
                <CurvedPath
                  x1={x}
                  y1={ROWS.sources + SIZES.source.h / 2}
                  x2={CENTER_X}
                  y2={ROWS.treasury - SIZES.treasury / 2}
                />
              </g>
            );
          })}

          {/* Treasury */}
          <circle
            cx={CENTER_X}
            cy={ROWS.treasury}
            r={SIZES.treasury + 30}
            fill="url(#treasuryGlow)"
          />
          <rect
            x={CENTER_X - SIZES.treasury}
            y={ROWS.treasury - SIZES.treasury / 2}
            width={SIZES.treasury * 2}
            height={SIZES.treasury}
            rx={14}
            className="fill-card stroke-emerald-500"
            strokeWidth={1.5}
            opacity={0.9}
          />
          <g transform={`translate(${CENTER_X - 10}, ${ROWS.treasury - 28})`}>
            <rect width={20} height={14} rx={2} className="fill-emerald-500" />
            <rect x={3} y={3} width={5} height={8} rx={1} className="fill-card" />
            <rect x={12} y={3} width={5} height={8} rx={1} className="fill-card" />
          </g>
          <text
            x={CENTER_X}
            y={ROWS.treasury + 4}
            textAnchor="middle"
            className="fill-foreground"
            fontSize={12}
            fontWeight={600}
          >
            Treasury
          </text>
          <text
            x={CENTER_X}
            y={ROWS.treasury + 24}
            textAnchor="middle"
            className="fill-emerald-500"
            fontSize={14}
            fontWeight={600}
            fontFamily="monospace"
          >
            {treasury !== null ? formatUsd(treasury) : "—"}
          </text>

          {/* Budgets */}
          {BUDGETS.map((budget, i) => {
            const x = getX(i, BUDGETS.length);
            const color = BUDGET_COLORS[i % BUDGET_COLORS.length];
            return (
              <g key={budget.id}>
                <CurvedPath
                  x1={CENTER_X}
                  y1={ROWS.treasury + SIZES.treasury / 2}
                  x2={x}
                  y2={ROWS.budgets - SIZES.budget.h / 2}
                />
                <circle
                  cx={x}
                  cy={ROWS.budgets}
                  r={SIZES.budget.w / 2 + 15}
                  fill={`url(#budgetGlow-${i})`}
                />
                <rect
                  x={x - SIZES.budget.w / 2}
                  y={ROWS.budgets - SIZES.budget.h / 2}
                  width={SIZES.budget.w}
                  height={SIZES.budget.h}
                  rx={10}
                  className="fill-card"
                  stroke={color}
                  strokeWidth={1.5}
                />
                <text
                  x={x}
                  y={ROWS.budgets + 4}
                  textAnchor="middle"
                  fill={color}
                  fontSize={10}
                  fontWeight={500}
                  className="budget-title"
                >
                  {budget.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
