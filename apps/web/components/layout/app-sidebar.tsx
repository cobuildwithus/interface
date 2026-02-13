"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { docsUrl } from "@/lib/config/docs";
import type { Profile } from "@/lib/domains/profile/types";
import { LargeMenuItem } from "@/components/layout/sidebar/large-menu-item";
import { SidebarUserMenu } from "@/components/layout/sidebar/sidebar-user-menu";

type AppSidebarProps = {
  address?: string;
  profile?: Profile;
};

export function AppSidebar({ address, profile }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="offcanvas" className="px-3">
      <SidebarHeader className="pt-3">
        <Link
          href="/home"
          className="hover:bg-muted inline-block w-fit rounded-full p-3 transition-colors md:mx-auto lg:mx-0 lg:mr-auto"
        >
          <Image
            src="/logo-light.svg"
            alt="Cobuild"
            width={28}
            height={28}
            className="size-7 dark:hidden"
          />
          <Image
            src="/logo-dark.svg"
            alt="Cobuild"
            width={28}
            height={28}
            className="hidden size-7 dark:block"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-4">
              <LargeMenuItem label="Home" href="/home" isActive={pathname === "/home"} />
              <LargeMenuItem
                label="Goals"
                href="/goals"
                isActive={
                  pathname.startsWith("/goals") ||
                  pathname.match(/^\/[a-z0-9-]+\/(earn|discussion|charter|builders|events)?$/i) !==
                    null
                }
              />
              <LargeMenuItem
                label="Discussion"
                href="/discussion"
                isActive={pathname.startsWith("/discussion") || pathname.startsWith("/cast/")}
              />
              <LargeMenuItem
                label="People"
                href="/people"
                isActive={pathname.startsWith("/people")}
              />
              <LargeMenuItem
                label="Token"
                href="/token-issuance"
                isActive={pathname.startsWith("/token-issuance")}
              />
              <LargeMenuItem
                label="Events"
                href="/events"
                isActive={pathname.startsWith("/events")}
              />
              <LargeMenuItem
                label="Rights"
                href="/bill-of-rights"
                isActive={pathname.startsWith("/bill-of-rights")}
              />
              <LargeMenuItem
                label="Profile"
                href="/profile"
                isActive={pathname.startsWith("/profile")}
              />
              <LargeMenuItem
                label="Settings"
                href="/settings"
                isActive={pathname.startsWith("/settings")}
              />
              <LargeMenuItem label="Docs" href={docsUrl} isActive={false} external />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="pb-4">
        <SidebarUserMenu address={address} profile={profile} />
      </SidebarFooter>
    </Sidebar>
  );
}
