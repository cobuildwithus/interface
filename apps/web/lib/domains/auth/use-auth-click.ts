"use client";

import type { MouseEvent } from "react";
import { useUserContext } from "./user-context";
import { useLogin } from "./use-login";

type OnConnectCallback = () => void;
type UseAuthClickOptions = {
  isTriggerSurface?: boolean;
};

export function useAuthClick(onConnect?: OnConnectCallback, options: UseAuthClickOptions = {}) {
  const { login, connectWallet, authenticated, address, ready } = useLogin();
  const sessionUser = useUserContext();
  const pendingSessionAddress = !ready ? (sessionUser?.address ?? null) : null;
  const effectiveAddress = address ?? pendingSessionAddress;

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (pendingSessionAddress) {
      if (options.isTriggerSurface) {
        return true;
      }

      e.preventDefault();
      return false;
    }

    if (!effectiveAddress) {
      e.preventDefault();
      if (!authenticated) {
        login();
      } else {
        connectWallet();
      }
      onConnect?.();
      return false;
    } else if (!authenticated) {
      e.preventDefault();
      login();
      return false;
    }
    return true;
  }

  return { handleClick, address: effectiveAddress, authenticated };
}
