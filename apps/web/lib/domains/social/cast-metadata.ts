import "server-only";

import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import type { FlatCastThread } from "@/lib/integrations/farcaster/casts/types";
import { normalizeCastHash } from "@/lib/domains/rules/cast-rules/normalize";
import { getTitleAndExcerpt } from "@/lib/integrations/farcaster/casts/attachments";
import { getCobuildFlatCastThread } from "@/lib/integrations/farcaster/casts";
import { resolveBaseUrl } from "@/lib/server/resolve-base-url";
import { truncateWords } from "@/lib/shared/text/truncate-words";

type CastMetadataInput = {
  baseUrl: string;
  hash: string;
  thread: FlatCastThread | null;
};

const DEFAULT_TITLE = "Cast | Cobuild";
const DEFAULT_DESCRIPTION = "View the Cobuild discussion thread on Farcaster.";

const defaultMetadata = (pageUrl: string): Metadata => ({
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: pageUrl },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: pageUrl,
  },
  twitter: {
    card: "summary",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
});

export function buildCastMetadata({ baseUrl, hash, thread }: CastMetadataInput): Metadata {
  const normalizedHash = normalizeCastHash(hash);
  const canonicalHash = normalizedHash ?? hash;
  const pageUrl = `${baseUrl}/cast/${encodeURIComponent(canonicalHash)}`;

  if (!normalizedHash || !thread) {
    return defaultMetadata(pageUrl);
  }

  const { title, excerpt } = getTitleAndExcerpt(thread.root.text);
  const safeTitle = truncateWords(title, 10, "Cobuild cast");
  const authorLabel = thread.root.author.username ?? null;
  const description = truncateWords(
    excerpt || thread.root.text,
    40,
    authorLabel ? `Thread by ${authorLabel} on Farcaster.` : "Thread on Farcaster."
  );
  const pageTitle = authorLabel
    ? `${authorLabel} on Cobuild: "${safeTitle}"`
    : `Cobuild: "${safeTitle}"`;
  const imageUrl = thread.root.attachment?.kind === "image" ? thread.root.attachment.url : null;

  return {
    title: pageTitle,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: pageTitle,
      description,
      url: pageUrl,
      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                alt: safeTitle,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: pageTitle,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

export const getCastThread = cache((hash: string, page = 1, focusHash: string | null = null) => {
  const normalizedHash = normalizeCastHash(hash) ?? hash;
  return getCobuildFlatCastThread(normalizedHash, { page, focusHash });
});

export async function generateCastMetadata(hash: string): Promise<Metadata> {
  const headerList = await headers();
  const baseUrl = resolveBaseUrl(headerList);
  const normalizedHash = normalizeCastHash(hash);
  const thread = normalizedHash ? await getCastThread(normalizedHash, 1, null) : null;
  return buildCastMetadata({ baseUrl, hash, thread });
}
