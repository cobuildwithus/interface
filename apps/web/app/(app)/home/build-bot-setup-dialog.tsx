"use client";

import { Loader2, ShieldCheck, Wallet } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { AuthButton } from "@/components/ui/auth-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserContext } from "@/lib/domains/auth/user-context";
import { useLogin } from "@/lib/domains/auth/use-login";
import {
  BUILD_BOT_SETUP_QUERY_KEYS,
  mergeBuildBotSetupParams,
  parseBuildBotSetupRequest,
} from "./build-bot-setup-params";

type BuildBotTokenResponse = { ok: true; token: string } | { ok: false; error?: string };

type CallbackAckResponse = {
  ok?: boolean;
  error?: string;
};

function buildTokenLabel(agent: string | null): string {
  const safeAgent = (agent ?? "default").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 24) || "default";
  return `build-bot-cli-${safeAgent}`;
}

export function BuildBotSetupDialog() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const user = useUserContext();
  const { ready, authenticated } = useLogin();
  const hasAuth = Boolean(user?.address) || (ready && authenticated);

  const setupRequest = useMemo(() => {
    const mergedParams = mergeBuildBotSetupParams(
      new URLSearchParams(searchParams.toString()),
      typeof window !== "undefined" ? window.location.hash : null
    );
    return parseBuildBotSetupRequest(mergedParams);
  }, [searchParams]);
  const [isApproving, setIsApproving] = useState(false);

  const clearSetupQuery = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    for (const key of BUILD_BOT_SETUP_QUERY_KEYS) {
      nextParams.delete(key);
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleApprove = useCallback(async () => {
    if (!setupRequest || isApproving) return;

    setIsApproving(true);
    const toastId = toast.loading("Approving Build Bot setup...");

    try {
      const label = buildTokenLabel(setupRequest.agent);
      const tokenRequest: { label: string; agentKey?: string } = { label };
      if (setupRequest.agent) {
        tokenRequest.agentKey = setupRequest.agent;
      }
      const tokenResponse = await fetch("/api/buildbot/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tokenRequest),
      });
      const tokenPayload = (await tokenResponse
        .json()
        .catch(() => null)) as BuildBotTokenResponse | null;

      if (!tokenResponse.ok || !tokenPayload || tokenPayload.ok !== true || !tokenPayload.token) {
        const message =
          tokenPayload && tokenPayload.ok === false && tokenPayload.error
            ? tokenPayload.error
            : `Token generation failed (${tokenResponse.status})`;
        throw new Error(message);
      }

      const callbackResponse = await fetch(setupRequest.callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          state: setupRequest.state,
          token: tokenPayload.token,
        }),
      });
      const callbackPayload = (await callbackResponse
        .json()
        .catch(() => null)) as CallbackAckResponse | null;

      if (!callbackResponse.ok || !callbackPayload?.ok) {
        throw new Error(
          callbackPayload?.error || `CLI callback failed (${callbackResponse.status})`
        );
      }

      toast.success("Approved. Return to your terminal to finish setup.", { id: toastId });
      clearSetupQuery();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to approve setup";
      toast.error(message, { id: toastId });
    } finally {
      setIsApproving(false);
    }
  }, [clearSetupQuery, isApproving, setupRequest]);

  if (!setupRequest) {
    return null;
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isApproving) {
          clearSetupQuery();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="text-primary size-5" />
            Finish Build Bot setup
          </DialogTitle>
          <DialogDescription>
            Connect your wallet and approve a one-time token for this CLI session. Only continue if
            you started setup in your terminal.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className={hasAuth ? undefined : "flex-col gap-3 sm:flex-col"}>
          {hasAuth ? (
            <>
              <Button variant="outline" onClick={clearSetupQuery} disabled={isApproving}>
                Cancel
              </Button>
              <Button onClick={() => void handleApprove()} disabled={isApproving}>
                {isApproving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  "Approve setup"
                )}
              </Button>
            </>
          ) : (
            <>
              <AuthButton className="group h-14 w-full justify-between rounded-xl px-4 text-base font-semibold">
                <span>Connect wallet</span>
                <span className="ring-primary-foreground/30 bg-primary-foreground/15 group-hover:bg-primary-foreground/20 flex size-9 items-center justify-center rounded-full ring-1 transition-colors">
                  <Wallet className="size-4" />
                </span>
              </AuthButton>
              <Button
                variant="outline"
                onClick={clearSetupQuery}
                disabled={isApproving}
                className="h-11 w-full"
              >
                Cancel
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
