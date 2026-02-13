"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const APP_ROOT_SEGMENTS = new Set([
  "home",
  "goals",
  "discussion",
  "people",
  "token-issuance",
  "events",
  "bill-of-rights",
  "settings",
  "create-post",
  "rounds",
  "cast",
  "c",
  "onramp-return",
]);

const sanitizePathname = (pathname: string | null) => {
  if (!pathname) return "/";
  return pathname.split("?")[0]?.split("#")[0] ?? "/";
};

const resolveHomeTarget = (pathname: string | null) => {
  const sanitized = sanitizePathname(pathname);
  const segments = sanitized.split("/").filter(Boolean);

  if (segments.length === 0 || APP_ROOT_SEGMENTS.has(segments[0])) {
    return { href: "/home", label: "Go home" };
  }

  return { href: `/${segments[0]}`, label: "Back to goal" };
};

export function NotFoundHomeButton() {
  const pathname = usePathname();
  const { href, label } = resolveHomeTarget(pathname);

  return (
    <Button asChild size="lg">
      <Link href={href}>{label}</Link>
    </Button>
  );
}
