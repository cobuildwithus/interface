import type { Metadata } from "next";
import { headers } from "next/headers";
import { resolveBaseUrl } from "@/lib/server/resolve-base-url";

type GoalMetadataOptions = {
  /** Page title suffix (e.g., "Earn", "Discussion") - will be prefixed with "Raise $1M by June 30, 2026" */
  pageName?: string;
  /** Custom description for the page */
  description?: string;
  /** Path suffix for the page URL (e.g., "/earn", "/discussion") */
  pathSuffix?: string;
};

const DEFAULT_DESCRIPTION =
  "Cobuild is raising $1M by June 30, 2026 to fund the treasury for builders, contributors, and onchain experiments.";

export async function generateGoalMetadata(options: GoalMetadataOptions = {}): Promise<Metadata> {
  const { pageName, description = DEFAULT_DESCRIPTION, pathSuffix = "" } = options;

  const headerList = await headers();
  const baseUrl = resolveBaseUrl(headerList);
  const pageUrl = `${baseUrl}/raise-1-mil${pathSuffix}`;
  const ogImageUrl = `${baseUrl}/api/og/raise-1-mil`;
  const title = pageName
    ? `${pageName} - Raise $1M by June 30, 2026 | Cobuild`
    : "Raise $1M by June 30, 2026 | Cobuild";

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
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 800,
          alt: "Raise $1M by June 30, 2026 for Cobuild",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    other: {
      "fc:miniapp": JSON.stringify(miniappMetadata),
      "fc:frame": JSON.stringify(frameMetadata),
    },
  };
}
