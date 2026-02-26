"use server";

import {
  getPayEvents,
  PAY_EVENTS_PAGE_SIZE,
  type RawTokenPayment,
} from "@/lib/domains/token/juicebox/pay-events";
import { getProfiles } from "@/lib/domains/profile/get-profile";
import type { Profile } from "@/lib/domains/profile/types";

export type PayEventWithProfile = RawTokenPayment & {
  profile: Profile;
};

export type PayEventsWithProfilesPage = {
  items: PayEventWithProfile[];
  hasMore: boolean;
};

export async function loadMorePayEvents(offset: number): Promise<PayEventsWithProfilesPage> {
  const page = await getPayEvents(PAY_EVENTS_PAGE_SIZE, offset);
  const profiles = await getProfiles(page.items.map((p) => p.payer));

  return {
    items: page.items.map((p, i) => ({
      ...p,
      profile: profiles[i]!,
    })),
    hasMore: page.hasMore,
  };
}
