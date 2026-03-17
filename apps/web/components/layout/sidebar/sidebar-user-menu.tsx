import dynamic from "next/dynamic";
import { LogIn, LogOut, MoreHorizontal } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Profile } from "@/lib/domains/profile/types";
import { truncateAddress } from "@/lib/shared/utils";

export type SidebarUserMenuProps = {
  address?: string;
  profile?: Profile;
};

const SidebarUserMenuConnectButton = dynamic(
  async () =>
    (await import("@/components/layout/sidebar/sidebar-user-menu-connect-button"))
      .SidebarUserMenuConnectButton,
  {
    ssr: false,
    loading: () => <SidebarUserMenuConnectPlaceholder />,
  }
);

const SidebarUserMenuActions = dynamic(
  async () =>
    (await import("@/components/layout/sidebar/sidebar-user-menu-actions")).SidebarUserMenuActions,
  {
    ssr: false,
    loading: () => <SidebarUserMenuActionsPlaceholder />,
  }
);

export function SidebarUserMenu({ address, profile }: SidebarUserMenuProps) {
  if (!address) {
    return (
      <div className="md:flex md:justify-center lg:block">
        <SidebarUserMenuConnectButton />
      </div>
    );
  }

  const displayName = profile?.name || truncateAddress(address);
  const displayHandle = truncateAddress(address);
  const fallbackChar = (displayName[0] || "?").toUpperCase();

  return (
    <div className="md:flex md:justify-center lg:block">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex h-auto w-full cursor-pointer items-center gap-3 rounded-full py-2 pr-3 pl-2 text-left focus-visible:ring-0 md:w-fit md:p-1 lg:w-full lg:py-2 lg:pr-3 lg:pl-2"
          >
            <Avatar
              src={profile?.avatar}
              alt={displayName}
              size={40}
              fallback={<span className="text-sm">{fallbackChar}</span>}
            />
            <div className="grid min-w-0 flex-1 gap-0 leading-none md:hidden lg:grid">
              <span className="truncate text-base font-bold">{displayName}</span>
              <span className="text-muted-foreground truncate text-sm">{displayHandle}</span>
            </div>
            <MoreHorizontal className="text-muted-foreground size-6 shrink-0 md:hidden lg:block" />
          </button>
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
                <p className="text-muted-foreground truncate text-sm">{displayHandle}</p>
              </div>
            </div>
          </div>

          <SidebarUserMenuActions />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SidebarUserMenuConnectPlaceholder() {
  return (
    <button
      type="button"
      disabled
      className="bg-foreground text-background w-full rounded-full md:size-11 lg:h-11 lg:w-full"
    >
      <span className="md:hidden lg:inline">Connect</span>
      <LogIn className="mx-auto hidden size-5 md:block lg:hidden" />
    </button>
  );
}

function SidebarUserMenuActionsPlaceholder() {
  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2 px-3">
        <span className="text-muted-foreground border-border rounded-full border px-3 py-1 text-xs">
          Farcaster
        </span>
        <span className="text-muted-foreground border-border rounded-full border px-3 py-1 text-xs">
          Twitter
        </span>
      </div>

      <div className="p-1">
        <div className="text-muted-foreground flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
          <LogOut className="size-4" />
          Log out
        </div>
      </div>
    </>
  );
}
