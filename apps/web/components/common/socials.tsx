import type { ReactElement } from "react";
import Link from "next/link";
import { cn } from "@/lib/shared/utils";
import {
  XIcon,
  FarcasterIcon,
  DiscordIcon,
  GitHubIcon,
} from "@/components/common/icons/social-icons";

type SocialIconProps = { className?: string };

type Social = {
  href: string;
  label: string;
  Icon: (props: SocialIconProps) => ReactElement;
};

const socials: Social[] = [
  {
    href: "https://x.com/justcobuild",
    label: "X",
    Icon: XIcon,
  },
  {
    href: "https://farcaster.xyz/cobuild",
    label: "Farcaster",
    Icon: FarcasterIcon,
  },
  {
    href: "https://discord.com/invite/PwWFgTck7f",
    label: "Discord",
    Icon: DiscordIcon,
  },
  {
    href: "https://github.com/cobuildwithus",
    label: "GitHub",
    Icon: GitHubIcon,
  },
];

type SocialsProps = {
  size?: "default" | "sm";
  className?: string;
  linkClassName?: string;
  withDividers?: boolean;
};

const ICON_SIZES: Record<NonNullable<SocialsProps["size"]>, string> = {
  default: "size-5",
  sm: "size-4",
};

export function Socials({
  size = "default",
  className,
  linkClassName,
  withDividers = true,
}: SocialsProps) {
  const iconClassName = ICON_SIZES[size] ?? ICON_SIZES.default;

  return (
    <div className={cn("flex items-center justify-center", className)}>
      {socials.map(({ href, label, Icon }, idx) => (
        <div key={label} className="flex items-center">
          <Link
            href={href}
            target="_blank"
            className={cn(
              "text-muted-foreground hover:text-foreground px-4 transition-colors",
              linkClassName
            )}
            aria-label={label}
          >
            <Icon className={iconClassName} />
          </Link>
          {withDividers && idx < socials.length - 1 && <div className="bg-border h-4 w-px" />}
        </div>
      ))}
    </div>
  );
}
