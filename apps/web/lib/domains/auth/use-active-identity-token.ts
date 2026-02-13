"use client";

import { useIdentityToken } from "@privy-io/react-auth";

export const useActiveIdentityToken = (fallbackToken?: string) => {
  const { identityToken } = useIdentityToken();
  return identityToken ?? fallbackToken;
};
