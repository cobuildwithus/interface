import type { Metadata } from "next";

type PageMetadataInput = {
  title: string;
  description?: string;
  robots?: Metadata["robots"];
};

export function buildPageMetadata({ title, description, robots }: PageMetadataInput): Metadata {
  return {
    title,
    ...(description === undefined ? {} : { description }),
    ...(robots === undefined ? {} : { robots }),
  };
}
