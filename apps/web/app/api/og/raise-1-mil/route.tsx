import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { formatUsd, RAISE_1M_GOAL, RAISE_1M_RAISED } from "@/lib/domains/goals/raise-1m";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

export async function GET(req: NextRequest) {
  const { origin } = new URL(req.url);
  const logoUrl = `${origin}/logo-light.svg`;

  const progress = Math.min(1, RAISE_1M_RAISED / RAISE_1M_GOAL);
  const percent = Math.round(progress * 1000) / 10;

  return new ImageResponse(
    <div
      style={{
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        display: "flex",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#0B0F10",
        color: "#F8F5F0",
        padding: "64px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(900px 500px at 15% 20%, rgba(24, 95, 83, 0.65) 0%, rgba(11, 15, 16, 0) 60%), radial-gradient(800px 500px at 90% 30%, rgba(192, 128, 62, 0.4) 0%, rgba(11, 15, 16, 0) 55%), linear-gradient(180deg, rgba(11, 15, 16, 0.2) 0%, rgba(11, 15, 16, 0.9) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(248, 245, 240, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(248, 245, 240, 0.08) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
          opacity: 0.35,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "-40px",
          bottom: "-20px",
          fontSize: "260px",
          letterSpacing: "-12px",
          color: "rgba(227, 184, 115, 0.12)",
          fontWeight: 800,
        }}
      >
        1M
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%",
          justifyContent: "space-between",
          gap: "32px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Cobuild" width={36} height={36} />
            <div
              style={{
                fontSize: "20px",
                letterSpacing: "4px",
                textTransform: "uppercase",
                color: "rgba(248, 245, 240, 0.7)",
              }}
            >
              Cobuild goal
            </div>
          </div>
          <div
            style={{
              fontSize: "16px",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              padding: "8px 16px",
              borderRadius: "999px",
              border: "1px solid rgba(227, 184, 115, 0.5)",
              backgroundColor: "rgba(22, 32, 30, 0.7)",
              color: "#E3B873",
            }}
          >
            Live goal
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              fontSize: "72px",
              lineHeight: 1,
              letterSpacing: "-2px",
              fontWeight: 800,
            }}
          >
            Raise $1,000,000 by Jun 30, 2026
          </div>
          <div
            style={{
              fontSize: "28px",
              lineHeight: 1.4,
              maxWidth: "820px",
              color: "rgba(248, 245, 240, 0.75)",
            }}
          >
            Fuel the Cobuild treasury for builders, contributors, and onchain experiments.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
            <div
              style={{
                fontSize: "64px",
                letterSpacing: "-1px",
                fontWeight: 800,
              }}
            >
              {formatUsd(RAISE_1M_RAISED)}
            </div>
            <div style={{ fontSize: "24px", color: "rgba(248, 245, 240, 0.7)" }}>raised</div>
          </div>

          <div
            style={{
              width: "100%",
              height: "16px",
              borderRadius: "999px",
              backgroundColor: "rgba(248, 245, 240, 0.1)",
              border: "1px solid rgba(248, 245, 240, 0.2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.max(4, Math.round(progress * 100))}%`,
                height: "100%",
                background: "linear-gradient(90deg, #E3B873 0%, #F0D9A8 60%, #FAF1D0 100%)",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "22px",
              color: "rgba(248, 245, 240, 0.65)",
            }}
          >
            <div>Goal {formatUsd(RAISE_1M_GOAL)}</div>
            <div>{percent}% complete</div>
          </div>
        </div>
      </div>
    </div>,
    {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      headers: {
        "Cache-Control": "public, immutable, no-transform, max-age=300",
        "Content-Type": "image/png",
      },
    }
  );
}
