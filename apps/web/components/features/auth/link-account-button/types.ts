import type { LinkAccountType } from "@/lib/domains/auth/use-link-account";

export type LinkAccountButtonVariant = "default" | "compact";

export type LinkAccountButtonProps = {
  type: LinkAccountType;
  variant?: LinkAccountButtonVariant;
  labelOverride?: string;
  className?: string;
};

export type FarcasterLinkAccountButtonProps = {
  type: "farcaster";
  variant?: LinkAccountButtonVariant;
  labelOverride?: string;
  className?: string;
};

export type SocialLinkAccountButtonProps = {
  type: Exclude<LinkAccountType, "farcaster">;
  variant?: LinkAccountButtonVariant;
  className?: string;
};
