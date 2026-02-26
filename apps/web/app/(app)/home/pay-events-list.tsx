import { getPayEvents, PAY_EVENTS_PAGE_SIZE } from "@/lib/domains/token/juicebox/pay-events";
import { getProfiles } from "@/lib/domains/profile/get-profile";
import { PayEventsListClient, type PayEventWithProfile } from "./pay-events-list-client";

export async function PayEventsList() {
  const page = await getPayEvents(PAY_EVENTS_PAGE_SIZE, 0);

  if (page.items.length === 0) {
    return <div className="text-muted-foreground py-8 text-center">No contributions yet</div>;
  }

  const profiles = await getProfiles(page.items.map((p) => p.payer));
  const initialItems: PayEventWithProfile[] = page.items.map((p, i) => ({
    ...p,
    profile: profiles[i]!,
  }));

  return <PayEventsListClient initialItems={initialItems} initialHasMore={page.hasMore} />;
}
