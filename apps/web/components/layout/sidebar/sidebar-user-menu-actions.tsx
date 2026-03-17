"use client";

import { LogOut } from "lucide-react";
import { LinkAccountButton } from "@/components/features/auth/link-account-button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useLogin } from "@/lib/domains/auth/use-login";

export function SidebarUserMenuActions() {
  const { logout } = useLogin();

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2 px-3">
        <LinkAccountButton type="farcaster" variant="compact" />
        <LinkAccountButton type="twitter" variant="compact" />
      </div>

      <div className="p-1">
        <DropdownMenuItem
          onClick={() => {
            void logout();
          }}
        >
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </div>
    </>
  );
}
