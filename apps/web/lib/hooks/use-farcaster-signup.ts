"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSignTypedData } from "wagmi";
import { isAddress } from "viem";
import { useSWRConfig } from "swr";
import { useUser } from "@/lib/hooks/use-user";
import { useLinkedAccounts } from "@/lib/hooks/use-linked-accounts";
import { useFarcasterSigner } from "@/lib/hooks/use-farcaster-signer";
import type { ErrorLike } from "@/lib/shared/errors";
import { isValidFarcasterUsername } from "@/lib/integrations/farcaster/fname";
import {
  registerFarcasterCompleteAction,
  registerFarcasterInitAction,
} from "@/app/(app)/actions/farcaster-register";
import type {
  FarcasterSignupState,
  RegisterInitResponse,
  UsernameAvailabilityState,
} from "@/lib/hooks/use-farcaster-signup/types";
import {
  formatSignupError,
  readErrorResponse,
  sanitizeUsername,
} from "@/lib/hooks/use-farcaster-signup/utils";

export type {
  FarcasterSignupState,
  UsernameAvailabilityState,
} from "@/lib/hooks/use-farcaster-signup/types";

export function useFarcasterSignup({
  onComplete,
}: {
  onComplete: () => void;
}): FarcasterSignupState {
  const { address } = useUser();
  const { signTypedDataAsync } = useSignTypedData();
  const { mutate: mutateLinkedAccounts } = useLinkedAccounts();
  const { mutate: mutateSigner } = useFarcasterSigner();
  const { mutate } = useSWRConfig();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [availability, setAvailability] = useState<UsernameAvailabilityState>({
    status: "idle",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkRef = useRef(0);

  useEffect(() => {
    if (!username) {
      setAvailability({ status: "idle" });
      return;
    }

    if (!isValidFarcasterUsername(username)) {
      setAvailability({ status: "invalid" });
      return;
    }

    setAvailability({ status: "checking" });
    const checkId = ++checkRef.current;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/farcaster/username?username=${encodeURIComponent(username)}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          const message = await readErrorResponse(res);
          if (checkRef.current === checkId) {
            setAvailability({ status: "error", message });
          }
          return;
        }

        const payload = (await res.json()) as {
          available?: boolean;
          reason?: string;
        };
        if (checkRef.current !== checkId) return;
        setAvailability({
          status: payload.available
            ? "available"
            : payload.reason === "invalid"
              ? "invalid"
              : "taken",
        });
      } catch (err) {
        if (checkRef.current === checkId) {
          setAvailability({ status: "error", message: formatSignupError(err as ErrorLike) });
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [username]);

  const reset = useCallback(() => {
    setUsername("");
    setAvailability({ status: "idle" });
    setError(null);
    setIsSubmitting(false);
  }, []);

  const submit = useCallback(async () => {
    setError(null);

    const normalized = sanitizeUsername(username);
    if (!normalized || !isValidFarcasterUsername(normalized)) {
      setError("Enter a valid Farcaster username.");
      return;
    }

    if (availability.status !== "available") {
      setError("Choose an available username before continuing.");
      return;
    }

    if (!address || !isAddress(address)) {
      toast.error("Connect a wallet before creating a Farcaster account.");
      return;
    }

    setIsSubmitting(true);

    try {
      const initResult = await registerFarcasterInitAction({ custodyAddress: address });
      if (!initResult.ok) {
        throw new Error(initResult.error);
      }

      const initPayload = initResult.data as RegisterInitResponse;
      const { EIP712Domain: _domain, ...types } = initPayload.typedData.types;
      const signature = await signTypedDataAsync({
        account: address as `0x${string}`,
        domain: initPayload.typedData.domain,
        types,
        primaryType: initPayload.typedData.primaryType,
        message: initPayload.typedData.message,
      });

      const completeResult = await registerFarcasterCompleteAction({
        fid: initPayload.fid,
        deadline: initPayload.deadline,
        custodyAddress: address,
        signature,
        fname: normalized,
      });

      if (!completeResult.ok) {
        throw new Error(completeResult.error);
      }

      await mutateLinkedAccounts();
      await mutateSigner();
      await mutate("user");
      router.refresh();
      toast.success("Farcaster account created.");
      onComplete();
    } catch (err) {
      const message = formatSignupError(err as ErrorLike);
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    address,
    availability.status,
    mutate,
    mutateLinkedAccounts,
    mutateSigner,
    onComplete,
    router,
    signTypedDataAsync,
    username,
  ]);

  const setUsernameSafe = useCallback((value: string) => {
    setUsername(sanitizeUsername(value));
  }, []);

  return {
    username,
    availability,
    isSubmitting,
    error,
    setUsername: setUsernameSafe,
    submit,
    reset,
  };
}
