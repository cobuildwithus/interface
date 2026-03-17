"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePrivy, useUser } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useUserContext } from "@/lib/domains/auth/user-context";
import { clearAuthIdentityQueries } from "@/lib/hooks/clear-auth-identity-queries";
import { getAuthIdentitySnapshot } from "@/lib/hooks/query-keys";

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    ready,
    authenticated,
    login: privyLogin,
    logout: privyLogout,
    connectWallet: privyConnectWallet,
  } = usePrivy();
  const { user, refreshUser } = useUser();
  const { isConnected, address } = useAccount();
  const sessionUser = useUserContext();
  const authSnapshotRef = useRef<{
    authenticated: boolean;
    address: string | undefined;
    ready: boolean;
  } | null>(null);
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

  useEffect(() => {
    const previous = authSnapshotRef.current;
    authSnapshotRef.current = {
      authenticated,
      address,
      ready,
    };

    if (!ready || !previous?.ready) {
      return;
    }

    if (previous.authenticated !== authenticated || previous.address !== address) {
      router.refresh();
    }
  }, [address, authenticated, ready, router]);

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
          privyLogin();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to reconnect");
        }
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
