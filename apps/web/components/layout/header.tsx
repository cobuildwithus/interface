import Image from "next/image";
import Link from "next/link";
import { docsUrl } from "@/lib/config/docs";
import { getProfile } from "@/lib/domains/profile/get-profile";
import { ConnectButton } from "@/components/features/auth/connect-button";

interface HeaderProps {
  variant?: "transparent" | "solid";
  showConnect?: boolean;
  address?: `0x${string}`;
}

export async function Header({ variant = "transparent", showConnect, address }: HeaderProps) {
  const profile = address ? await getProfile(address) : undefined;
  const isTransparent = variant === "transparent";

  return (
    <header
      className={`fixed top-0 left-0 z-50 w-full ${
        isTransparent ? "" : "bg-background/95 border-b border-transparent backdrop-blur-sm"
      }`}
    >
      <div
        className={`flex items-center justify-between ${
          isTransparent ? "h-20 px-8 md:px-16 lg:px-24" : "container mx-auto h-16 px-4"
        }`}
      >
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center">
            <Image
              src="/logo-light.svg"
              alt="Cobuild Logo"
              width={32}
              height={32}
              className={`h-full w-full ${isTransparent ? "hidden" : "block dark:hidden"}`}
            />
            <Image
              src="/logo-dark.svg"
              alt="Cobuild Logo"
              width={32}
              height={32}
              className={`h-full w-full opacity-90 ${
                isTransparent ? "block" : "hidden dark:block"
              }`}
            />
          </div>
        </Link>
        <nav
          className={`flex items-center text-sm font-medium ${
            isTransparent ? "gap-8 tracking-wider uppercase" : "gap-6"
          }`}
        >
          <Link
            href={docsUrl}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Manifesto
          </Link>
          <Link
            href={`${docsUrl}/quickstart/what-is-cobuild`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Docs
          </Link>
          {showConnect && <ConnectButton address={address} profile={profile} />}
        </nav>
      </div>
    </header>
  );
}
