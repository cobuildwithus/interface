import type { LinkAccountButtonProps } from "./link-account-button/types";
import { FarcasterLinkAccountButton } from "./link-account-button/farcaster-button";
import { SocialLinkAccountButton } from "./link-account-button/social-button";

export type { LinkAccountButtonProps } from "./link-account-button/types";

export function LinkAccountButton({
  type,
  variant = "default",
  labelOverride,
  className,
}: LinkAccountButtonProps) {
  if (type === "farcaster") {
    return (
      <FarcasterLinkAccountButton
        type={type}
        variant={variant}
        labelOverride={labelOverride}
        className={className}
      />
    );
  }
  return <SocialLinkAccountButton type={type} variant={variant} className={className} />;
}
