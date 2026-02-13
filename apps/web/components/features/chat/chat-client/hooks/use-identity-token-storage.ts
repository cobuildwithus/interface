"use client";

import { useEffect } from "react";
import {
  IDENTITY_TOKEN_STORAGE_KEY,
  safeSessionStorageRemove,
  safeSessionStorageSet,
} from "@/lib/domains/chat/chat-client-utils";

export function useIdentityTokenStorage(identityToken?: string | null) {
  useEffect(() => {
    if (identityToken) {
      safeSessionStorageSet(IDENTITY_TOKEN_STORAGE_KEY, identityToken);
    } else {
      safeSessionStorageRemove(IDENTITY_TOKEN_STORAGE_KEY);
    }
  }, [identityToken]);
}
