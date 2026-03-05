import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getGoalCards, getGoalOverviewData } from "@/lib/domains/goals/goal-data";
import { resolveBaseUrl } from "@/lib/server/resolve-base-url";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(amount)));
}

export async function GET(req: NextRequest) {
  const reqUrl = new URL(req.url);
  const goalAddress = reqUrl.searchParams.get("goalAddress")?.trim();
  const [baseUrl, requestedOverview] = await Promise.all([
    resolveBaseUrl(req.headers),
    goalAddress ? getGoalOverviewData(goalAddress) : Promise.resolve(null),
  ]);

  let resolvedOverview = requestedOverview;
  if (!resolvedOverview) {
    const goalCards = await getGoalCards();
    const fallbackGoalAddress = goalCards[0]?.address;
    resolvedOverview = fallbackGoalAddress ? await getGoalOverviewData(fallbackGoalAddress) : null;
  }
  const title = resolvedOverview?.progressTitle ?? "Cobuild goal";
  const raised = resolvedOverview?.raised ?? 0;
  const target = Math.max(1, resolvedOverview?.target ?? 1);
  const progress = Math.min(1, raised / target);
  const percent = Math.round(progress * 1000) / 10;

  const logoUrl = `${baseUrl}/logo-light.svg`;

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
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%",
          justifyContent: "space-between",
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

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              fontSize: "66px",
              lineHeight: 1,
              letterSpacing: "-2px",
              fontWeight: 800,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "28px",
              lineHeight: 1.4,
              color: "rgba(248, 245, 240, 0.75)",
            }}
          >
            Live treasury progress powered by Cobuild onchain data.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
            <div style={{ fontSize: "64px", letterSpacing: "-1px", fontWeight: 800 }}>
              {formatUsd(raised)}
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
            <div>Goal {formatUsd(target)}</div>
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
