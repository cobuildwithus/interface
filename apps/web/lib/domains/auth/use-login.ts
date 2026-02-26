"use client";

import { useState, useCallback } from "react";
import {
  useLogin as usePrivyLogin,
  useLogout,
  useConnectWallet,
  usePrivy,
  useUser,
} from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";

export function useLogin() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { login: privyLogin } = usePrivyLogin({
    onComplete: router.refresh,
    onError: (err) => setError(String(err) || "Failed to connect"),
  });
  const { logout: privyLogout } = useLogout({ onSuccess: router.refresh });
  const { connectWallet: privyConnectWallet } = useConnectWallet({
    onSuccess: router.refresh,
    onError: (err) => setError(String(err) || "Failed to connect wallet"),
  });
  const { ready, authenticated } = usePrivy();
  const { refreshUser } = useUser();
  const { isConnected, address } = useAccount();

  const login = useCallback(() => {
    setError(null);
    if (authenticated) {
      void (async () => {
        try {
          await refreshUser();
          router.refresh();
          return;
        } catch {
          // fall through to logout/login to refresh the session
        }

        try {
          await privyLogout();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to reconnect");
          return;
        }

        privyLogin();
      })();
      return;
    }
    try {
      privyLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    }
  }, [authenticated, privyLogin, privyLogout, refreshUser, router]);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await privyLogout();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log out");
    }
  }, [privyLogout]);

  const switchWallet = useCallback(async () => {
    setError(null);
    try {
      await privyLogout();
      privyLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch wallet");
    }
  }, [privyLogout, privyLogin]);

  const connectWallet = useCallback(() => {
    setError(null);
    try {
      privyConnectWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  }, [privyConnectWallet]);

  const clearError = useCallback(() => setError(null), []);

  return {
    login,
    logout,
    switchWallet,
    connectWallet,
    authenticated,
    ready,
    isConnected,
    address,
    error,
    clearError,
  };
}
