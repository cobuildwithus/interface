import { ArrowRight, Check, Feather, Loader2, X } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { formatPermissions } from "./permissions";

export function LinkedStatus({
  isSignerLoading,
  hasSigner,
  missingCastPermission,
  username,
  showDiagnostics,
  signerPermissions,
  neynarPermissions,
  neynarStatus,
  neynarError,
  onSigner,
  onDisconnect,
  isBusy,
  isDisconnecting,
}: {
  isSignerLoading: boolean;
  hasSigner: boolean;
  missingCastPermission: boolean;
  username: string;
  showDiagnostics: boolean;
  signerPermissions: string[] | null;
  neynarPermissions: string[] | null;
  neynarStatus: string | null;
  neynarError: string | null;
  onSigner: () => void;
  onDisconnect: () => void;
  isBusy: boolean;
  isDisconnecting: boolean;
}) {
  if (isSignerLoading) {
    return (
      <div className="border-border/60 bg-muted/30 flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left">
        <span className="bg-background text-muted-foreground ring-border/50 flex size-8 items-center justify-center rounded-lg shadow-sm ring-1">
          <Loader2 className="size-3.5 animate-spin" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium">Checking posting access</p>
          <p className="text-muted-foreground text-xs">Confirming your Farcaster signer status.</p>
        </div>
      </div>
    );
  }

  if (hasSigner) {
    return (
      <div className="space-y-2">
        <div className="border-border/60 bg-muted/30 flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left">
          <span
            className={cn(
              "bg-background ring-border/50 flex size-8 items-center justify-center rounded-lg shadow-sm ring-1",
              missingCastPermission ? "text-rose-600" : "text-emerald-600"
            )}
          >
            {missingCastPermission ? <X className="size-3.5" /> : <Check className="size-3.5" />}
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {missingCastPermission ? "Posting disabled" : "Posting enabled"}
            </p>
            <p className="text-muted-foreground text-xs">
              {missingCastPermission
                ? `Cobuild cannot post from ${username}.`
                : `Cobuild can post from ${username}.`}
            </p>
          </div>
        </div>
        {showDiagnostics ? (
          <div className="border-border/60 bg-muted/20 space-y-2 rounded-xl border px-3.5 py-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Stored permissions</span>
              <span className="font-medium">{formatPermissions(signerPermissions)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Neynar permissions</span>
              <span className="font-medium">{formatPermissions(neynarPermissions)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Neynar status</span>
              <span className="font-medium">{neynarStatus ?? "unknown"}</span>
            </div>
            {missingCastPermission ? (
              <p className="text-rose-600">Missing the cast permission.</p>
            ) : null}
            {neynarError ? (
              <p className="text-rose-600">Neynar lookup failed: {neynarError}</p>
            ) : null}
          </div>
        ) : null}
        {missingCastPermission ? (
          <button
            type="button"
            onClick={onSigner}
            disabled={isBusy}
            className="border-border/60 hover:border-border flex w-full items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium text-purple-600 transition disabled:opacity-50"
          >
            Reconnect posting access
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDisconnect}
          disabled={isBusy || isDisconnecting}
          className="border-border/60 hover:border-border flex w-full items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium text-rose-600 transition disabled:opacity-50"
        >
          {isDisconnecting ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSigner}
      disabled={isBusy}
      className="group flex w-full cursor-pointer items-stretch overflow-hidden rounded-xl border border-purple-500/30 bg-purple-500/5 text-left transition hover:border-purple-500/50 hover:bg-purple-500/10 disabled:opacity-50"
    >
      <div className="flex flex-1 items-center gap-3 px-3.5 py-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 ring-1 ring-purple-500/20">
          <Feather className="size-3.5" />
        </span>
        <div>
          <p className="text-sm font-medium">Add posting key</p>
          <p className="text-muted-foreground text-xs">Enable posting from Cobuild</p>
        </div>
      </div>
      <div className="flex items-center bg-purple-500/15 px-4 transition-colors group-hover:bg-purple-500/25">
        <ArrowRight className="size-4 text-purple-600" />
      </div>
    </button>
  );
}
