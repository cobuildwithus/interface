"use client";

import styles from "./bubble-flow.module.css";

interface Bubble {
  id: number;
  y: number;
  size: number;
}

type Direction = "right" | "down" | "left" | "up";
type ArcDirection =
  | "arcTopRight"
  | "arcRightBottom"
  | "arcBottomLeft"
  | "arcLeftTop"
  | "arcBuildToEarn"
  | "arcEarnToEngage";

interface BubbleFlowProps {
  bubbles: Bubble[];
  direction?: Direction | ArcDirection;
  className?: string;
}

const ARC_PATHS: Record<ArcDirection, string> = {
  arcTopRight: "path('M 0,0 Q 140,60 200,180')",
  arcRightBottom: "path('M 0,0 Q -60,100 -180,140')",
  arcBottomLeft: "path('M 0,0 Q -140,-60 -200,-180')",
  arcLeftTop: "path('M 0,0 Q 60,-140 180,-200')",
  arcBuildToEarn: "path('M 0,0 Q -160,40 -240,-140')",
  arcEarnToEngage: "path('M 0,0 Q 60,-140 200,-180')",
};

const ANIMATION_CLASSES: Record<Direction | ArcDirection, string> = {
  right: styles.floatRight,
  left: styles.floatLeft,
  down: styles.floatDown,
  up: styles.floatUp,
  arcTopRight: styles.arcTopRight,
  arcRightBottom: styles.arcRightBottom,
  arcBottomLeft: styles.arcBottomLeft,
  arcLeftTop: styles.arcLeftTop,
  arcBuildToEarn: styles.arcBuildToEarn,
  arcEarnToEngage: styles.arcEarnToEngage,
};

function isArcDirection(dir: Direction | ArcDirection): dir is ArcDirection {
  return dir.startsWith("arc");
}

export function BubbleFlow({ bubbles, direction = "right", className = "" }: BubbleFlowProps) {
  const isArc = isArcDirection(direction);
  const isHorizontal = !isArc && (direction === "right" || direction === "left");
  const animationClass = ANIMATION_CLASSES[direction];

  const maskH = "linear-gradient(to right, transparent, black 15%, black 85%, transparent)";
  const maskV = "linear-gradient(to bottom, transparent 5%, black 15%, black 85%, transparent 95%)";

  return (
    <div
      className={`relative overflow-visible ${className}`}
      style={
        isArc
          ? undefined
          : {
              maskImage: isHorizontal ? `${maskH}, ${maskV}` : `${maskV}, ${maskH}`,
              WebkitMaskImage: isHorizontal ? `${maskH}, ${maskV}` : `${maskV}, ${maskH}`,
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }
      }
    >
      {bubbles.map((bubble) => {
        const perpOffset = isArc ? (bubble.y - 50) * 0.6 : 0;
        return (
          <div
            key={bubble.id}
            className={`absolute flex items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/20 ${animationClass}`}
            style={
              isArc
                ? {
                    width: `${bubble.size + 8}px`,
                    height: `${bubble.size + 8}px`,
                    top: perpOffset,
                    left: perpOffset,
                    offsetPath: ARC_PATHS[direction as ArcDirection],
                    offsetRotate: "0deg",
                  }
                : {
                    ...(isHorizontal
                      ? {
                          top: `${bubble.y}%`,
                          left: direction === "right" ? 0 : "auto",
                          right: direction === "left" ? 0 : "auto",
                        }
                      : {
                          left: `${bubble.y}%`,
                          top: direction === "down" ? 0 : "auto",
                          bottom: direction === "up" ? 0 : "auto",
                        }),
                    width: `${bubble.size + 8}px`,
                    height: `${bubble.size + 8}px`,
                    transform: isHorizontal ? "translateY(-50%)" : "translateX(-50%)",
                  }
            }
          >
            <span
              className="font-bold text-emerald-400"
              style={{ fontSize: `${bubble.size * 0.7}px` }}
            >
              $
            </span>
          </div>
        );
      })}
    </div>
  );
}

export type { Bubble };
