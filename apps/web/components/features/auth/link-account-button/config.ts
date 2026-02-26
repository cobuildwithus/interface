import { XIcon, FarcasterIcon } from "@/components/common/icons/social-icons";

export const ACCOUNT_CONFIG = {
  farcaster: {
    Icon: FarcasterIcon,
    label: "Farcaster",
    buttonStyles: "bg-purple-600 hover:bg-purple-700 text-white hover:text-white",
    compactIconWrapper: "bg-purple-500/15",
    compactIconLinked: "text-purple-400",
    profileUrl: (username: string) => `https://farcaster.xyz/${username}`,
  },
  twitter: {
    Icon: XIcon,
    label: "X",
    buttonStyles: "bg-neutral-800 hover:bg-neutral-700 text-white hover:text-white",
    compactIconWrapper: "bg-foreground/10",
    compactIconLinked: "",
    profileUrl: (username: string) => `https://x.com/${username}`,
  },
} as const;
