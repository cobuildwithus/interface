"use client";

import { ExternalLink } from "lucide-react";
import { XIcon, FarcasterIcon } from "@/components/common/icons/social-icons";
import { Button } from "@/components/ui/button";
import { LinkAccountButton } from "@/components/features/auth/link-account-button";
import {
  PLATFORMS,
  POST_PLATFORMS,
  type LinkedAccountState,
  type PostPlatform,
} from "@/lib/domains/social/platforms";

const PLATFORM_ICONS: Record<PostPlatform, typeof FarcasterIcon> = {
  farcaster: FarcasterIcon,
  x: XIcon,
};

type PlatformComposeButtonsProps = {
  linked: LinkedAccountState;
  castTemplate?: string | null;
  ctaText?: string | null;
};

export function PlatformComposeButtons({
  linked,
  castTemplate,
  ctaText,
}: PlatformComposeButtonsProps) {
  const buttonText = ctaText || "Share post";

  return (
    <div className="flex gap-3">
      {POST_PLATFORMS.map((platform) => {
        const config = PLATFORMS[platform];
        const Icon = PLATFORM_ICONS[platform];
        const isLinked = config.isLinked(linked);

        if (!isLinked) {
          return (
            <LinkAccountButton
              key={platform}
              type={config.linkAccountButtonType}
              className={config.buttonClassName}
            />
          );
        }

        return (
          <Button key={platform} asChild className={config.buttonClassName}>
            <a href={config.composeUrl(castTemplate)} target="_blank" rel="noopener noreferrer">
              <Icon className="size-4" />
              <span>{buttonText}</span>
              <ExternalLink className="size-4" />
            </a>
          </Button>
        );
      })}
    </div>
  );
}
