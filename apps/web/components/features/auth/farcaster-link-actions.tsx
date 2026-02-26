"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUser } from "@/lib/hooks/use-user";
import { useFarcasterSigner } from "@/lib/hooks/use-farcaster-signer";
import { useLinkedAccounts } from "@/lib/hooks/use-linked-accounts";
import { handleNeynarSignin } from "@/lib/integrations/farcaster/handle-neynar-signin";
import {
  attachNeynarListener,
  detachNeynarListener,
  isNeynarConfigured,
  openNeynarPopup,
  parseNeynarCallbackData,
  setActiveNeynarHandler,
  type NeynarCallbackData,
} from "@/components/features/auth/farcaster/neynar-auth";
import { disconnectFarcasterSignerAction } from "@/app/(app)/actions/farcaster-signer";

type FarcasterLinkActions = {
  connectSigner: () => void;
  disconnectSigner: () => Promise<void>;
  linkReadOnly: () => Promise<void>;
  isConnecting: boolean;
  isDisconnecting: boolean;
};

type FarcasterLinkActionsParams = {
  address?: string | null;
  linkFarcaster: () => Promise<void>;
  onLinked?: () => Promise<void> | void;
  onDisconnected?: () => Promise<void> | void;
};

export function useFarcasterLinkActionsCore({
  address,
  linkFarcaster,
  onLinked,
  onDisconnected,
}: FarcasterLinkActionsParams): FarcasterLinkActions {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const authCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ownsConnectionRef = useRef(false);

  const cleanup = useCallback(() => {
    if (authCheckIntervalRef.current) {
      clearInterval(authCheckIntervalRef.current);
      authCheckIntervalRef.current = null;
    }
    if (window.__neynarAuthWindow) {
      window.__neynarAuthWindow.close();
      window.__neynarAuthWindow = null;
    }
    setActiveNeynarHandler(null);
    ownsConnectionRef.current = false;
    setIsConnecting(false);
  }, []);

  const refreshAfterLink = useCallback(async () => {
    if (onLinked) {
      await onLinked();
    } else {
      router.refresh();
    }
  }, [onLinked, router]);

  const refreshAfterDisconnect = useCallback(async () => {
    if (onDisconnected) {
      await onDisconnected();
    } else {
      router.refresh();
    }
  }, [onDisconnected, router]);

  const handleSignInSuccess = useCallback(
    async (data: NeynarCallbackData) => {
      try {
        const payload = parseNeynarCallbackData(data);
        if (!payload) {
          throw new Error("Invalid authentication data received.");
        }

        await handleNeynarSignin(payload);

        await refreshAfterLink();
        toast.success("Farcaster signer connected.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to connect Farcaster.";
        toast.error(message);
      } finally {
        cleanup();
      }
    },
    [cleanup, refreshAfterLink]
  );

  const handleNeynarCallback = useCallback(
    (data: NeynarCallbackData) => {
      void handleSignInSuccess(data);
    },
    [handleSignInSuccess]
  );

  useEffect(() => {
    attachNeynarListener();
    return () => {
      if (ownsConnectionRef.current) {
        cleanup();
      }
      detachNeynarListener();
    };
  }, [cleanup]);

  const connectSigner = useCallback(() => {
    try {
      if (!address) {
        toast.error("Connect a wallet before linking Farcaster.");
        return;
      }

      if (!isNeynarConfigured()) {
        toast.error("Farcaster sign-in is not configured.");
        return;
      }

      cleanup();
      setIsConnecting(true);
      ownsConnectionRef.current = true;
      setActiveNeynarHandler(handleNeynarCallback);

      const authWindow = openNeynarPopup();
      if (!authWindow) {
        toast.error("Please allow popups for Farcaster authentication.");
        cleanup();
        return;
      }

      authCheckIntervalRef.current = setInterval(() => {
        if (authWindow.closed) {
          cleanup();
        }
      }, 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open Neynar login.";
      toast.error(message);
      cleanup();
    }
  }, [address, cleanup, handleNeynarCallback]);

  const linkReadOnly = useCallback(async () => {
    if (!address) {
      toast.error("Connect a wallet before linking Farcaster.");
      return;
    }
    await linkFarcaster();
  }, [address, linkFarcaster]);

  const disconnectSigner = useCallback(async () => {
    try {
      setIsDisconnecting(true);
      const result = await disconnectFarcasterSignerAction();
      if (!result.ok) {
        throw new Error(result.error || "Failed to disconnect Farcaster posting access.");
      }
      await refreshAfterDisconnect();
      toast.success("Farcaster posting access disconnected.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to disconnect Farcaster.";
      toast.error(message);
    } finally {
      setIsDisconnecting(false);
    }
  }, [refreshAfterDisconnect]);

  return { connectSigner, disconnectSigner, linkReadOnly, isConnecting, isDisconnecting };
}

export function useFarcasterLinkActions(linkFarcaster: () => Promise<void>): FarcasterLinkActions {
  const router = useRouter();
  const { address } = useUser();
  const { mutate: mutateSigner } = useFarcasterSigner();
  const { mutate: mutateLinkedAccounts } = useLinkedAccounts();

  const handleLinked = useCallback(async () => {
    await mutateSigner();
    await mutateLinkedAccounts();
    router.refresh();
  }, [mutateLinkedAccounts, mutateSigner, router]);

  return useFarcasterLinkActionsCore({
    address,
    linkFarcaster,
    onLinked: handleLinked,
    onDisconnected: handleLinked,
  });
}
