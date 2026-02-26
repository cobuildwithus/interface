"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { useUser } from "@/lib/hooks/use-user";
import { useLogin } from "@/lib/domains/auth/use-login";

export function WalletIdentityGuard() {
  const { address: sessionAddress } = useUser();
  const { address: walletAddress } = useAccount();
  const { logout } = useLogin();
  const didHandleRef = useRef(false);

  useEffect(() => {
    if (!sessionAddress || !walletAddress) {
      didHandleRef.current = false;
      return;
    }

    const matches = sessionAddress.toLowerCase() === walletAddress.toLowerCase();
    if (matches) {
      didHandleRef.current = false;
      return;
    }

    if (didHandleRef.current) return;
    didHandleRef.current = true;
    toast.error("Wallet changed. Please sign in again.");
    void logout();
  }, [logout, sessionAddress, walletAddress]);

  return null;
}
