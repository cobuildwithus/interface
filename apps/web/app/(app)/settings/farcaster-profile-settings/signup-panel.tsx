"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FarcasterSignupState } from "@/lib/hooks/use-farcaster-signup";
import { Check, Loader2, UserPlus, X } from "lucide-react";

export function SignupPrompt({
  signup,
  isSignupReady,
}: {
  signup: FarcasterSignupState;
  isSignupReady: boolean;
}) {
  return (
    <div className="border-border/60 bg-muted/20 space-y-4 rounded-2xl border p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Create a Farcaster account</p>
        <p className="text-muted-foreground text-xs">
          Pick a username and sign one message to get started.
        </p>
      </div>
      <div className="space-y-2">
        <label className="space-y-1">
          <span className="text-muted-foreground text-xs font-medium">Username</span>
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
              disabled={signup.isSubmitting}
            />
          </div>
        </label>

        {signup.availability.status !== "idle" && (
          <div className="flex items-center gap-2 text-[11px]">
            {signup.availability.status === "checking" && (
              <>
                <Loader2 className="text-muted-foreground size-3 animate-spin" />
                <span className="text-muted-foreground">Checking availability...</span>
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
                  Use 1-16 lowercase letters, numbers, or dashes
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

        {signup.error && <p className="text-destructive text-[11px]">{signup.error}</p>}
      </div>

      <Button
        size="sm"
        onClick={signup.submit}
        disabled={signup.isSubmitting || !isSignupReady}
        className="bg-purple-600 text-white hover:bg-purple-700 hover:text-white"
      >
        {signup.isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <UserPlus className="size-4" />
        )}
        Create Farcaster account
      </Button>
      <p className="text-muted-foreground text-[10px]">
        Costs $7 for onchain registration. No gas required.
      </p>
      <p className="text-muted-foreground text-[10px]">
        Or download the{" "}
        <a
          href="https://www.farcaster.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline underline-offset-2 hover:no-underline"
        >
          Farcaster app
        </a>{" "}
        for a free signup, then connect here.
      </p>
    </div>
  );
}
