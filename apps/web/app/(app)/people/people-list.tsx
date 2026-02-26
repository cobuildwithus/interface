import {
  getParticipants,
  PARTICIPANTS_PAGE_SIZE,
  type ParticipantSort,
} from "@/lib/domains/token/juicebox/participants";
import { getProfiles } from "@/lib/domains/profile/get-profile";
import { PeopleListClient } from "./people-list-client";
import type { ParticipantWithProfile } from "./types";

type Props = {
  sort?: ParticipantSort;
};

export async function PeopleList({ sort = "new" }: Props) {
  const page = await getParticipants(PARTICIPANTS_PAGE_SIZE, 0, sort);

  if (page.items.length === 0) {
    return <div className="text-muted-foreground py-8 text-center">No participants yet</div>;
  }

  const profiles = await getProfiles(page.items.map((p) => p.address));
  const initialItems: ParticipantWithProfile[] = page.items.map((p, i) => ({
    ...p,
    profile: profiles[i]!,
  }));

  return (
    <PeopleListClient
      initialItems={initialItems}
      initialHasMore={page.hasMore}
      tokenSymbol={page.tokenSymbol}
      sort={sort}
    />
  );
}
