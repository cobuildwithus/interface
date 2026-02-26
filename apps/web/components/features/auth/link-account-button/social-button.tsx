"use client";

import { Loader2 } from "lucide-react";
import { useLinkAccount, type LinkAccountType } from "@/lib/domains/auth/use-link-account";
import { AuthButton } from "@/components/ui/auth-button";
import { cn } from "@/lib/shared/utils";
import { ACCOUNT_CONFIG } from "./config";
import type { SocialLinkAccountButtonProps } from "./types";

type CompactLinkAccountButtonProps = {
  config: (typeof ACCOUNT_CONFIG)[LinkAccountType];
  linked: boolean;
  username?: string;
  isLinking: boolean;
  isCurrentlyLinking: boolean;
  onLink: () => void;
  className?: string;
};

function CompactLinkAccountButton({
  config,
  linked,
  username,
  isLinking,
  isCurrentlyLinking,
  onLink,
  className,
}: CompactLinkAccountButtonProps) {
  const baseStyles =
    "text-muted-foreground hover:text-foreground border-border hover:border-border/80 flex w-fit items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs transition-colors";

  // Linked state - show as link to profile
  if (linked && username) {
    return (
      <a
        href={config.profileUrl(username)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(baseStyles, className)}
      >
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full",
            config.compactIconWrapper
          )}
        >
          <config.Icon className={cn("size-2.5", config.compactIconLinked)} />
        </span>
        {username}
      </a>
    );
  }

  // Unlinked state - show link button
  return (
    <button
      onClick={onLink}
      disabled={isLinking}
      className={cn(baseStyles, "cursor-pointer border-dashed disabled:opacity-50", className)}
    >
      <span className="bg-muted flex size-5 items-center justify-center rounded-full">
        {isCurrentlyLinking ? (
          <Loader2 className="size-2.5 animate-spin" />
        ) : (
          <config.Icon className="size-2.5" />
        )}
      </span>
      Link {config.label}
    </button>
  );
}

export function SocialLinkAccountButton({
  type,
  variant = "default",
  className,
}: SocialLinkAccountButtonProps) {
  const { link, isLinking, isLinkingType, linkedAccounts, isLinked } = useLinkAccount();
  const config = ACCOUNT_CONFIG[type];
  const linked = isLinked(type);
  const accountInfo = linkedAccounts[type];
  const displayName = accountInfo?.username ?? config.label;
  const isCurrentlyLinking = isLinkingType(type);

  if (variant === "compact") {
    return (
      <CompactLinkAccountButton
        config={config}
        linked={linked}
        username={accountInfo?.username}
        isLinking={isLinking}
        isCurrentlyLinking={isCurrentlyLinking}
        onLink={() => link(type)}
        className={className}
      />
    );
  }

  if (linked) {
    return (
      <AuthButton
        variant="ghost"
        className={cn("justify-center gap-2", config.buttonStyles, className)}
        onClick={() => link(type)}
      >
        <config.Icon className="size-4" />
        <span className="max-w-[120px] truncate">{displayName}</span>
      </AuthButton>
    );
  }

  return (
    <AuthButton
      variant="ghost"
      className={cn("justify-center gap-2", config.buttonStyles, className)}
      onClick={() => link(type)}
      disabled={isLinking}
    >
      {isLinking ? <Loader2 className="size-4 animate-spin" /> : <config.Icon className="size-4" />}
      {isLinking ? "Linking…" : `Link ${config.label}`}
    </AuthButton>
  );
}
