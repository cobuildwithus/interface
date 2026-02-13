"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";

import type { PostPlatform } from "@/lib/domains/social/platforms";

type PostUrlInputProps = {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isVerifying: boolean;
  canSubmit: boolean;
  canSubmitUrl: boolean;
  detectedPlatform: PostPlatform | null;
  placeholder: string;
  ctaLabel: string;
  ctaBusyLabel: string;
  inputError?: string | null;
  inputWarning?: string | null;
  roundTimingError?: string | null;
  ineligible: boolean;
  isAtPostLimit?: boolean;
};

export function PostUrlInput({
  input,
  onInputChange,
  onSubmit,
  isVerifying,
  canSubmit,
  canSubmitUrl,
  detectedPlatform,
  placeholder,
  ctaLabel,
  ctaBusyLabel,
  inputError,
  inputWarning,
  roundTimingError,
  ineligible,
  isAtPostLimit = false,
}: PostUrlInputProps) {
  return (
    <Field>
      <FieldLabel htmlFor="post-input">2. Paste your post link</FieldLabel>
      <Input
        id="post-input"
        type="text"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus
      />
      {inputError && (
        <p className="text-destructive mt-1 text-xs" role="alert" aria-live="polite">
          {inputError}
        </p>
      )}
      {inputWarning && (
        <p className="mt-1 text-xs text-amber-700" role="status" aria-live="polite">
          {inputWarning}
        </p>
      )}
      {detectedPlatform && !canSubmitUrl && (
        <p className="text-destructive mt-1 text-xs">
          You need to link your {detectedPlatform === "farcaster" ? "Farcaster" : "X"} account to
          submit this URL.
        </p>
      )}
      <Button
        className="mt-2 w-full bg-blue-600 text-white hover:bg-blue-700"
        disabled={
          isVerifying ||
          ineligible ||
          isAtPostLimit ||
          Boolean(roundTimingError) ||
          !canSubmit ||
          !canSubmitUrl
        }
        onClick={onSubmit}
      >
        {roundTimingError ? (
          roundTimingError
        ) : isVerifying ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {ctaBusyLabel}
          </>
        ) : (
          ctaLabel
        )}
      </Button>
      {isAtPostLimit && (
        <p className="mt-2 text-xs text-amber-700" role="status" aria-live="polite">
          You’ve hit your max posts already.
        </p>
      )}
    </Field>
  );
}
