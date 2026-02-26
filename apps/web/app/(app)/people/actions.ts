"use server";

import {
  getParticipants,
  PARTICIPANTS_PAGE_SIZE,
  type ParticipantSort,
} from "@/lib/domains/token/juicebox/participants";
import { getBuilders, BUILDERS_PAGE_SIZE } from "@/lib/domains/builders/get-builders";
import { getProfiles } from "@/lib/domains/profile/get-profile";
import type { ParticipantWithProfile, BuilderWithProfile, PageResult } from "./types";

export async function loadMoreParticipants(
  offset: number,
  sort: ParticipantSort = "new"
): Promise<PageResult<ParticipantWithProfile>> {
  const page = await getParticipants(PARTICIPANTS_PAGE_SIZE, offset, sort);
  const profiles = await getProfiles(page.items.map((p) => p.address));

  return {
    items: page.items.map((p, i) => ({ ...p, profile: profiles[i]! })),
    hasMore: page.hasMore,
  };
}

export async function loadMoreBuilders(offset: number): Promise<PageResult<BuilderWithProfile>> {
  const page = await getBuilders(BUILDERS_PAGE_SIZE, offset);
  const profiles = await getProfiles(page.items.map((b) => b.address));

  return {
    items: page.items.map((b, i) => ({ ...b, profile: profiles[i]! })),
    hasMore: page.hasMore,
  };
}
