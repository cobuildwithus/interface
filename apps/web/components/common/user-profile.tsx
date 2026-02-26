import { getProfile } from "@/lib/domains/profile/get-profile";
import type { Profile } from "@/lib/domains/profile/types";
import Link from "next/link";
import { ReactNode } from "react";

interface Props {
  address: string;
  children: (props: { profile: Profile; isLoading: boolean }) => ReactNode;
  hideLink?: boolean;
  linkClassName?: string;
}

export async function UserProfile({ address, children, hideLink = false, linkClassName }: Props) {
  const profile = await getProfile(address);

  if (!profile) return null;

  const content = children({ profile, isLoading: false });
  if (hideLink) return content;

  return (
    <Link href={profile.url} target="_blank" rel="noopener noreferrer" className={linkClassName}>
      {content}
    </Link>
  );
}
