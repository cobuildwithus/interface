"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useLogin as usePrivyLogin,
  useLogout,
  useConnectWallet,
  usePrivy,
  useUser,
} from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useUserContext } from "@/lib/domains/auth/user-context";
import { clearAuthIdentityQueries } from "@/lib/hooks/clear-auth-identity-queries";
import { getAuthIdentitySnapshot } from "@/lib/hooks/query-keys";

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
  const { user, refreshUser } = useUser();
  const { isConnected, address } = useAccount();
  const sessionUser = useUserContext();
  const currentIdentity = sessionUser
    ? getAuthIdentitySnapshot({
        address: sessionUser.address,
        farcasterFid: sessionUser.farcaster?.fid ?? null,
      })
    : getAuthIdentitySnapshot({
        address: address ?? null,
        farcasterFid: user?.farcaster?.fid ?? null,
      });

  const clearCurrentAuthQueries = useCallback(() => {
    clearAuthIdentityQueries(queryClient, currentIdentity);
  }, [currentIdentity, queryClient]);

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
          clearCurrentAuthQueries();
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
  }, [authenticated, clearCurrentAuthQueries, privyLogin, privyLogout, refreshUser, router]);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await privyLogout();
      clearCurrentAuthQueries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log out");
    }
  }, [clearCurrentAuthQueries, privyLogout]);

  const switchWallet = useCallback(async () => {
    setError(null);
    try {
      await privyLogout();
      clearCurrentAuthQueries();
      privyLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch wallet");
    }
  }, [clearCurrentAuthQueries, privyLogout, privyLogin]);

  const connectWallet = useCallback(() => {
    if (authenticated) {
      void switchWallet();
      return;
    }
    setError(null);
    try {
      privyConnectWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  }, [authenticated, privyConnectWallet, switchWallet]);

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
