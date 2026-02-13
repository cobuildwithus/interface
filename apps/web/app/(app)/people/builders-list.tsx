import { getBuilders, BUILDERS_PAGE_SIZE } from "@/lib/domains/builders/get-builders";
import { getProfiles } from "@/lib/domains/profile/get-profile";
import { BuildersListClient } from "./builders-list-client";
import type { BuilderWithProfile } from "./types";

export async function BuildersList() {
  const page = await getBuilders(BUILDERS_PAGE_SIZE, 0);

  if (page.items.length === 0) {
    return <div className="text-muted-foreground py-8 text-center">No builders yet</div>;
  }

  const profiles = await getProfiles(page.items.map((b) => b.address));
  const initialItems: BuilderWithProfile[] = page.items.map((b, i) => ({
    ...b,
    profile: profiles[i]!,
  }));

  return <BuildersListClient initialItems={initialItems} initialHasMore={page.hasMore} />;
}
