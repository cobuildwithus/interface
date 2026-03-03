"use client";

import { Loader2, ShieldCheck, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CliOAuthAuthorizeRequest } from "@cobuild/wire";
import { AuthButton } from "@/components/ui/auth-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLogin } from "@/lib/domains/auth/use-login";
import { useUserContext } from "@/lib/domains/auth/user-context";

type CliOAuthAuthorizeResult = {
  ok?: boolean;
  error?: string;
  redirectTo?: string;
};

function summarizeAuthorizedActions(request: CliOAuthAuthorizeRequest): string[] {
  const actions: string[] = [];
  const hasWalletRead = request.scopes.includes("wallet:read");
  const hasWalletExecute = request.scopes.includes("wallet:execute");
  const hasToolsRead = request.scopes.includes("tools:read");
  const hasToolsWrite = request.scopes.includes("tools:write");
  const hasOfflineAccess = request.scopes.includes("offline_access");

  if (hasWalletRead || hasWalletExecute) {
    if (request.payerMode === "hosted") {
      actions.push("Create and use a hosted wallet for this agent.");
    } else {
      actions.push("Create and use a wallet for this agent.");
    }
  }
  if (hasWalletExecute || hasToolsWrite) {
    actions.push("Run wallet and agent actions from the CLI.");
  } else if (hasWalletRead || hasToolsRead) {
    actions.push("Read wallet and agent status from the CLI.");
  }

  if (hasOfflineAccess) {
    actions.push("Keep this CLI signed in on this machine.");
  }

  return actions;
}

function summarizeAccessLevel(request: CliOAuthAuthorizeRequest): string {
  const hasWrite =
    request.scopes.includes("wallet:execute") || request.scopes.includes("tools:write");
  return hasWrite ? "Read + write access" : "Read-only access";
}

function formatScope(scope: string): string {
  return scope.replace(":", ": ");
}

export function CliOAuthAuthorizeModal(props: {
  request: CliOAuthAuthorizeRequest | null;
  error?: string;
}) {
  const router = useRouter();
  const user = useUserContext();
  const { ready, authenticated } = useLogin();
  const hasAuth = Boolean(user?.address) || (ready && authenticated);
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const actionSummary = useMemo(
    () => (props.request ? summarizeAuthorizedActions(props.request) : []),
    [props.request]
  );

  const handleClose = () => {
    if (isApproving) return;
    router.replace("/home");
  };

  const handleApprove = async () => {
    if (!props.request || isApproving) return;

    setIsApproving(true);
    setApproveError(null);

    try {
      const response = await fetch("/api/cli/oauth/authorize", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          responseType: props.request.responseType,
          clientId: props.request.clientId,
          redirectUri: props.request.redirectUri,
          scope: props.request.scope,
          codeChallenge: props.request.codeChallenge,
          codeChallengeMethod: props.request.codeChallengeMethod,
          state: props.request.state,
          agentKey: props.request.agentKey,
          ...(props.request.label ? { label: props.request.label } : {}),
        }),
      });
      const payload = (await response.json().catch(() => null)) as CliOAuthAuthorizeResult | null;
      if (!response.ok || payload?.ok !== true || typeof payload.redirectTo !== "string") {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : `Authorization failed (${response.status})`;
        throw new Error(message);
      }

      window.location.assign(payload.redirectTo);
    } catch (error) {
      setApproveError(error instanceof Error ? error.message : "Authorization failed");
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => (!next ? handleClose() : undefined)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="text-primary size-5" />
            Authorize Cobuild CLI
          </DialogTitle>
          <DialogDescription>
            Only approve this if you started setup in your terminal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {props.error ? <p className="text-sm text-red-600">{props.error}</p> : null}

          {props.request ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">This allows</p>
                <ul className="list-disc space-y-1 pl-5">
                  {actionSummary.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <details className="text-muted-foreground rounded-md border p-3 text-xs">
                <summary className="cursor-pointer font-medium select-none">More details</summary>
                <div className="mt-2 space-y-2">
                  <p>Access level: {summarizeAccessLevel(props.request)}</p>
                  <p>Session: saved on this machine until revoked.</p>
                  <div>
                    <p className="mb-1 font-medium">Granted scopes</p>
                    <ul className="space-y-1">
                      {props.request.scopes.map((scope) => (
                        <li
                          className={
                            scope === "wallet:execute" ? "font-semibold text-red-600" : undefined
                          }
                          key={scope}
                        >
                          {formatScope(scope)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="font-mono break-all">
                    Local callback URL: {props.request.redirectUri}
                  </p>
                </div>
              </details>
            </div>
          ) : null}

          {approveError ? <p className="text-sm text-red-600">{approveError}</p> : null}

          {hasAuth ? (
            <Button
              className="h-14 w-full text-lg"
              disabled={Boolean(props.error) || !props.request || isApproving}
              onClick={() => void handleApprove()}
            >
              {isApproving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve and continue setup"
              )}
            </Button>
          ) : (
            <AuthButton className="group h-12 w-full justify-between rounded-xl px-4 text-base font-semibold">
              <span>Connect wallet</span>
              <span className="ring-primary-foreground/30 bg-primary-foreground/15 group-hover:bg-primary-foreground/20 flex size-9 items-center justify-center rounded-full ring-1 transition-colors">
                <Wallet className="size-4" />
              </span>
            </AuthButton>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
