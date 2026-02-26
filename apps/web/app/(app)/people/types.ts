import type { Profile } from "@/lib/domains/profile/types";

export type ParticipantWithProfile = {
  address: string;
  balance: string;
  createdAt: number;
  firstOwned: number | null;
  profile: Profile;
};

export type BuilderWithProfile = {
  address: string;
  isFounder: boolean;
  profile: Profile;
};

export type PageResult<T> = {
  items: T[];
  hasMore: boolean;
};
