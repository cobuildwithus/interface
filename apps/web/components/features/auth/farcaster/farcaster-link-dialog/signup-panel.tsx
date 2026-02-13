import { Check, Loader2, UserPlus, X } from "lucide-react";
import { AuthButton } from "@/components/ui/auth-button";
import { Input } from "@/components/ui/input";
import type { FarcasterSignupState } from "@/lib/hooks/use-farcaster-signup";

export function SignupPanel({ signup, isBusy }: { signup: FarcasterSignupState; isBusy: boolean }) {
  const isSignupReady = signup.availability.status === "available";

  return (
    <div className="border-border/60 bg-muted/20 space-y-3 rounded-xl border px-3.5 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">Choose a username</p>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">@</span>
          <Input
            value={signup.username}
            onChange={(event) => signup.setUsername(event.target.value)}
            placeholder="yourname"
            maxLength={16}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={isBusy}
          />
        </div>
      </div>

      {signup.availability.status !== "idle" && (
        <div className="flex items-center gap-2 text-xs">
          {signup.availability.status === "checking" && (
            <>
              <Loader2 className="text-muted-foreground size-3 animate-spin" />
              <span className="text-muted-foreground">Checking availability…</span>
            </>
          )}
          {signup.availability.status === "available" && (
            <>
              <Check className="size-3 text-emerald-500" />
              <span className="text-emerald-600">Available</span>
            </>
          )}
          {signup.availability.status === "taken" && (
            <>
              <X className="text-destructive size-3" />
              <span className="text-destructive">Already taken</span>
            </>
          )}
          {signup.availability.status === "invalid" && (
            <>
              <X className="text-destructive size-3" />
              <span className="text-destructive">
                Use 1–16 lowercase letters, numbers, or dashes
              </span>
            </>
          )}
          {signup.availability.status === "error" && (
            <>
              <X className="text-destructive size-3" />
              <span className="text-destructive">
                {signup.availability.message ?? "Unable to check right now"}
              </span>
            </>
          )}
        </div>
      )}

      {signup.error && <p className="text-destructive text-xs">{signup.error}</p>}

      <AuthButton
        type="button"
        variant="ghost"
        onClick={signup.submit}
        disabled={isBusy || !isSignupReady}
        className="bg-purple-600 text-white hover:bg-purple-700 hover:text-white"
      >
        {signup.isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <UserPlus className="size-4" />
        )}
        Create Farcaster account
      </AuthButton>
      <p className="text-muted-foreground text-xs">No gas required. You’ll sign one message.</p>
    </div>
  );
}
