"use client";

import { LogIn, LogOut, MoreHorizontal } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CopyToClipboard } from "@/components/ui/copy-to-clipboard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useLogin } from "@/lib/domains/auth/use-login";
import { useLinkAccount } from "@/lib/domains/auth/use-link-account";
import { LinkAccountButton } from "@/components/features/auth/link-account-button";
import type { Profile } from "@/lib/domains/profile/types";
import { truncateAddress } from "@/lib/shared/utils";

type SidebarUserMenuProps = {
  address?: string;
  profile?: Profile;
};

export function SidebarUserMenu({ address, profile }: SidebarUserMenuProps) {
  const { ready, authenticated, login, logout } = useLogin();
  const { linkedAccounts } = useLinkAccount();

  const farcasterUsername = linkedAccounts.farcaster?.username;
  const displayName = profile?.name || (address ? truncateAddress(address) : "");
  const displayHandle = farcasterUsername
    ? `@${farcasterUsername}`
    : address
      ? truncateAddress(address)
      : "";
  const fallbackChar = (displayName[0] || "?").toUpperCase();

  if (!address && ready && !authenticated) {
    return (
      <div className="md:flex md:justify-center lg:block">
        <Button
          className="bg-foreground text-background hover:bg-foreground/90 w-full rounded-full md:size-11 lg:h-11 lg:w-full"
          onClick={login}
        >
          <span className="md:hidden lg:inline">Connect</span>
          <LogIn className="hidden size-5 md:block lg:hidden" />
        </Button>
      </div>
    );
  }

  if (!address) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem className="md:flex md:justify-center lg:block">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-auto w-full cursor-pointer gap-3 rounded-full py-2 pr-3 pl-2 focus-visible:ring-0 md:w-fit md:p-1 lg:w-full lg:py-2 lg:pr-3 lg:pl-2"
            >
              <Avatar
                src={profile?.avatar}
                alt={displayName}
                size={40}
                fallback={<span className="text-sm">{fallbackChar}</span>}
              />
              <div className="grid flex-1 gap-0 text-left leading-none md:hidden lg:grid">
                <span className="truncate text-base font-bold">{displayName}</span>
                <span className="text-muted-foreground truncate text-sm">{displayHandle}</span>
              </div>
              <MoreHorizontal className="text-muted-foreground size-6 shrink-0 md:hidden lg:block" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-64 rounded-lg p-0"
            side="right"
            align="end"
            sideOffset={4}
          >
            <div className="border-border border-b p-3">
              <div className="flex items-center gap-3">
                <Avatar
                  src={profile?.avatar}
                  alt={displayName}
                  size={40}
                  fallback={<span className="text-sm">{fallbackChar}</span>}
                />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-base font-bold">{displayName}</p>
                  <CopyToClipboard text={address} className="text-muted-foreground text-sm">
                    {truncateAddress(address)}
                  </CopyToClipboard>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <LinkAccountButton type="farcaster" variant="compact" />
                <LinkAccountButton type="twitter" variant="compact" />
              </div>
            </div>

            <div className="p-1">
              <DropdownMenuItem onClick={logout}>
                <LogOut className="size-4" />
                Log out
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
