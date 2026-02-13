"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/shared/utils";

type GoalNavProps = {
  goalAddress: string;
};

export function GoalNav({ goalAddress }: GoalNavProps) {
  const pathname = usePathname();
  const navItems = [
    { label: "Overview", href: `/${goalAddress}` },
    { label: "Allocate", href: `/${goalAddress}/allocate` },
    { label: "Discussion", href: `/${goalAddress}/discussion` },
    { label: "Chats", href: `/${goalAddress}/chats` },
    { label: "Prompts", href: `/${goalAddress}/prompts` },
    { label: "Builders", href: `/${goalAddress}/builders` },
    { label: "Events", href: `/${goalAddress}/events` },
  ];

  const isActive = (href: string) => {
    if (href === `/${goalAddress}`) {
      return pathname === `/${goalAddress}`;
    }
    return pathname.startsWith(href);
  };

  return (
    <NavigationMenu>
      <NavigationMenuList className="gap-4">
        {navItems.map((item) => (
          <NavigationMenuItem key={item.label}>
            <NavigationMenuLink asChild>
              <Link
                href={item.href}
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-md px-5 py-1 text-lg font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground bg-transparent"
                )}
              >
                {item.label}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
