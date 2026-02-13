import type { TokenCategory } from "@/generated/prisma/enums";

export type CategoryDefinition = {
  key: TokenCategory;
  label: string;
  description: string;
  logo?: {
    light: string;
    dark: string;
  };
  logoSize?: number;
};

export const CATEGORY_DEFINITIONS: ReadonlyArray<CategoryDefinition> = [
  {
    key: "cobuild",
    label: "Cobuild tokens",
    description: "Core Cobuild tokens used across the network.",
    logo: {
      light: "/logo-light.svg",
      dark: "/logo-dark.svg",
    },
  },
  {
    key: "juicebox",
    label: "Juicebox / Revnet",
    description: "Projects with Juicebox-issued tokens and revnets.",
    logo: {
      light: "/brands/revnet/logo-light.svg",
      dark: "/brands/revnet/logo-dark.svg",
    },
  },
  {
    key: "zora",
    label: "Zora creator coins",
    description: "Coins minted through Zora's creator contracts.",
    logo: {
      light: "/brands/zora/zorb.svg",
      dark: "/brands/zora/zorb.svg",
    },
  },
  {
    key: "clanker",
    label: "Clanker",
    description: "In-feed token launch protocol Clanker.",
    logo: {
      light: "/brands/clanker/logo-circle.png",
      dark: "/brands/clanker/logo-circle.png",
    },
    logoSize: 28,
  },
  {
    key: "erc20",
    label: "Other ERC-20s",
    description: "All other standard ERC-20 tokens.",
  },
];
