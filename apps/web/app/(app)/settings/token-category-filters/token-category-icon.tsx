"use client";

import Image from "next/image";
import type { TokenCategory } from "@/generated/prisma/enums";

type TokenCategoryIconProps = {
  categoryKey: TokenCategory;
  label: string;
  logo?: {
    light: string;
    dark: string;
  };
  logoSize?: number;
};

export function TokenCategoryIcon({ categoryKey, label, logo, logoSize }: TokenCategoryIconProps) {
  if (logo) {
    const size = logoSize ?? 20;
    return (
      <>
        <Image
          src={logo.light}
          alt={label}
          width={size}
          height={size}
          className="relative dark:hidden"
          style={{ width: size, height: size }}
        />
        <Image
          src={logo.dark}
          alt={label}
          width={size}
          height={size}
          className="relative hidden dark:block"
          style={{ width: size, height: size }}
        />
      </>
    );
  }

  if (categoryKey === "erc20") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="text-foreground/80 h-5 w-5"
        fill="none"
      >
        <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 3.75v3.25M12 17v3.25M3.75 12h3.25M17 12h3.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return null;
}
