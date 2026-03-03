import { redirect } from "next/navigation";
import { buildPageMetadata } from "@/lib/shared/page-metadata";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = buildPageMetadata({
  title: "Authorize CLI | Cobuild",
  description: "Authorize Cobuild CLI access.",
  robots: { index: false, follow: false },
});

function toSingleValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}

export default async function OAuthAuthorizePage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const homeQuery = new URLSearchParams();
  homeQuery.set("oauth_authorize", "1");
  for (const [key, value] of Object.entries(raw)) {
    const parsed = toSingleValue(value);
    if (parsed !== null) {
      homeQuery.set(key, parsed);
    }
  }
  redirect(`/home?${homeQuery.toString()}`);
}
