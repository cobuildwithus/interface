import { ArrowRight, Feather, Lock, UserPlus } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { SignupPanel } from "./signup-panel";
import type { FarcasterSignupState } from "@/lib/hooks/use-farcaster-signup";

export function LinkOptions({
  isBusy,
  onReadOnly,
  onSigner,
  signup,
  showSignup,
  onToggleSignup,
}: {
  isBusy: boolean;
  onReadOnly: () => void;
  onSigner: () => void;
  signup: FarcasterSignupState;
  showSignup: boolean;
  onToggleSignup: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onReadOnly}
        disabled={isBusy}
        className="border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50 group flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition disabled:opacity-50"
      >
        <span className="bg-background text-muted-foreground ring-border/50 flex size-8 items-center justify-center rounded-lg shadow-sm ring-1">
          <Lock className="size-3.5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium">Read-only</p>
          <p className="text-muted-foreground text-xs">Verify account without posting access</p>
        </div>
      </button>
      <button
        type="button"
        onClick={onSigner}
        disabled={isBusy}
        className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-purple-500/30 bg-purple-500/5 px-3.5 py-3 text-left transition hover:border-purple-500/50 hover:bg-purple-500/10 disabled:opacity-50"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 ring-1 ring-purple-500/20">
          <Feather className="size-3.5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium">Full access</p>
          <p className="text-muted-foreground text-xs">Post directly from Cobuild</p>
        </div>
      </button>
      <button
        type="button"
        onClick={onToggleSignup}
        disabled={isBusy}
        className={cn(
          "border-border/60 bg-background/40 hover:border-border hover:bg-background/70 group flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition disabled:opacity-50",
          showSignup ? "border-purple-500/50 bg-purple-500/5" : ""
        )}
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 ring-1 ring-purple-500/20">
          <UserPlus className="size-3.5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium">Create a new account</p>
          <p className="text-muted-foreground text-xs">Pick a username and sign one message</p>
        </div>
        <ArrowRight
          className={cn(
            "size-4 text-purple-500 transition-transform",
            showSignup ? "rotate-90" : ""
          )}
        />
      </button>
      {showSignup && <SignupPanel signup={signup} isBusy={isBusy} />}
    </>
  );
}
