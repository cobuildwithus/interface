"use client";

import Link from "next/link";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

type LargeMenuItemProps = {
  label: string;
  isActive?: boolean;
} & (
  | { href: string; external?: boolean; onClick?: never }
  | { onClick: () => void; href?: never; external?: never }
);

export function LargeMenuItem({ label, isActive, ...props }: LargeMenuItemProps) {
  const buttonClass =
    "text-[20px] font-medium h-auto py-2 px-6 md:p-3 lg:py-2 lg:pl-4 lg:pr-5 rounded-full w-fit gap-4 [&>svg]:size-6 data-[active=true]:bg-transparent data-[active=true]:font-bold data-[active=true]:hover:bg-sidebar-accent";

  if ("onClick" in props && props.onClick) {
    return (
      <SidebarMenuItem className="md:flex md:justify-center lg:block">
        <SidebarMenuButton
          onClick={props.onClick}
          isActive={isActive}
          tooltip={label}
          className={buttonClass}
        >
          <span className="md:hidden lg:inline">{label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  const linkProps = props.external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const LinkComponent = props.external ? "a" : Link;

  return (
    <SidebarMenuItem className="md:flex md:justify-center lg:block">
      <SidebarMenuButton asChild isActive={isActive} tooltip={label} className={buttonClass}>
        <LinkComponent href={props.href!} {...linkProps}>
          <span className="md:hidden lg:inline">{label}</span>
        </LinkComponent>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
