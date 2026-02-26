"use client";

import { useProfile } from "@/lib/hooks/use-profile";
import type { Profile } from "@/lib/domains/profile/types";
import Link from "next/link";
import { ReactNode } from "react";

interface Props {
  address: string;
  children: (props: { profile: Profile; isLoading: boolean }) => ReactNode;
  hideLink?: boolean;
  linkClassName?: string;
}

export function UserProfileClient({ address, children, hideLink = false, linkClassName }: Props) {
  const { data: profile, isPlaceholderData } = useProfile(address);

  // placeholderData ensures profile is always defined when address exists
  if (!profile) return null;

  const content = children({ profile, isLoading: isPlaceholderData });
  if (hideLink) return content;

  return (
    <Link href={profile.url} target="_blank" rel="noopener noreferrer" className={linkClassName}>
      {content}
    </Link>
  );
}
