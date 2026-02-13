"use client";

import { useLogin } from "@/lib/domains/auth/use-login";
import type { Profile } from "@/lib/domains/profile/types";
import { truncateAddress } from "@/lib/shared/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CopyToClipboard } from "@/components/ui/copy-to-clipboard";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Socials } from "@/components/common/socials";
import { LinkAccountButton } from "@/components/features/auth/link-account-button";

interface UserPopoverProps {
  address?: string;
  profile?: Profile;
}

export function UserPopover({ address, profile }: UserPopoverProps) {
  const { logout } = useLogin();

  const displayName = profile?.name || (address ? truncateAddress(address) : "");
  const shortAddress = address ? truncateAddress(address) : "";
  const fallbackChar = (displayName[0] || "?").toUpperCase();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="hover:bg-muted size-7 rounded-full p-0 transition-colors"
        >
          <Avatar
            src={profile?.avatar}
            alt={displayName}
            size={28}
            fallback={<span className="text-xs">{fallbackChar}</span>}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-border border-b p-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={profile?.avatar}
              alt={displayName}
              size={48}
              fallback={<span className="text-base">{fallbackChar}</span>}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{displayName}</p>
              {address && (
                <CopyToClipboard text={address} className="text-muted-foreground text-sm">
                  {shortAddress}
                </CopyToClipboard>
              )}
            </div>
          </div>

          {/* Social account pills */}
          <div className="mt-3 flex flex-wrap gap-2">
            <LinkAccountButton type="farcaster" variant="compact" />
            <LinkAccountButton type="twitter" variant="compact" />
          </div>
        </div>

        <div className="flex items-center justify-between p-3.5">
          <Socials
            size="sm"
            withDividers={false}
            className="gap-0"
            linkClassName="px-2 first:pl-0"
          />
          <Button
            variant="ghost"
            onClick={logout}
            className="text-muted-foreground hover:text-foreground h-auto px-3 py-1.5 text-sm"
          >
            Logout
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
