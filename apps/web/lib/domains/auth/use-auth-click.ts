"use client";

import type { MouseEvent } from "react";
import { useLogin } from "./use-login";

type OnConnectCallback = () => void;

export function useAuthClick(onConnect?: OnConnectCallback) {
  const { login, connectWallet, authenticated, address } = useLogin();

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (!address) {
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

  return { handleClick, address, authenticated };
}
