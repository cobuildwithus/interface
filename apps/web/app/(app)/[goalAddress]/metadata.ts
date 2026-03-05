import type { Metadata } from "next";
import { headers } from "next/headers";
import { resolveBaseUrl } from "@/lib/server/resolve-base-url";
import { getGoalOverviewData } from "@/lib/domains/goals/goal-data";

type GoalMetadataOptions = {
  /** Goal route param value (`/[goalAddress]`). */
  goalAddress?: string;
  /** Page title suffix (e.g., "Allocate", "Discussion"). */
  pageName?: string;
  /** Custom description for the page */
  description?: string;
  /** Path suffix for the page URL (e.g., "/discussion") */
  pathSuffix?: string;
};

const DEFAULT_DESCRIPTION =
  "Cobuild goal page with live onchain treasury, contribution, and allocation data.";

export async function generateGoalMetadata(options: GoalMetadataOptions = {}): Promise<Metadata> {
  const { goalAddress, pageName, description, pathSuffix = "" } = options;

  const [headerList, overview] = await Promise.all([
    headers(),
    goalAddress ? getGoalOverviewData(goalAddress) : Promise.resolve(null),
  ]);
  const baseUrl = resolveBaseUrl(headerList);
  const resolvedRouteAddress = overview?.goal.routeAddress ?? goalAddress ?? "goals";
  const goalTitle = overview?.progressTitle ?? overview?.goal.name ?? "Goal";
  const resolvedDescription = description ?? overview?.goal.description ?? DEFAULT_DESCRIPTION;
  const pageUrl = `${baseUrl}/${resolvedRouteAddress}${pathSuffix}`;
  const ogImageUrl = `${baseUrl}/api/og/goal?goalAddress=${encodeURIComponent(resolvedRouteAddress)}`;
  const title = pageName ? `${pageName} - ${goalTitle} | Cobuild` : `${goalTitle} | Cobuild`;

  const miniappMetadata = {
    version: "1",
    imageUrl: ogImageUrl,
    button: {
      title: "View goal",
      action: { type: "launch_miniapp", url: pageUrl, name: "Cobuild" },
    },
  };

  const frameMetadata = {
    ...miniappMetadata,
    button: {
      ...miniappMetadata.button,
      action: { ...miniappMetadata.button.action, type: "launch_frame" },
    },
  };

  return {
    title,
    description: resolvedDescription,
    openGraph: {
      title,
      description: resolvedDescription,
      url: pageUrl,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 800,
          alt: `${goalTitle} | Cobuild`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: resolvedDescription,
      images: [ogImageUrl],
    },
    other: {
      "fc:miniapp": JSON.stringify(miniappMetadata),
      "fc:frame": JSON.stringify(frameMetadata),
    },
  };
}
