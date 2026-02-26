import Link from "next/link";
import { docsUrl } from "@/lib/config/docs";

const links = [
  { href: `${docsUrl}`, label: "Manifesto" },
  { href: "#", label: "Basescan" },
  { href: docsUrl, label: "Docs" },
  { href: "https://x.com/justcobuild", label: "X" },
  { href: "https://discord.com/invite/PwWFgTck7f", label: "Discord" },
  { href: "https://github.com/cobuildwithus", label: "GitHub" },
];

export function TokenFooter() {
  return (
    <footer className="mt-12 overflow-hidden">
      <div className="container mx-auto px-24 pb-12">
        <nav className="text-muted-foreground flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm font-medium md:text-base">
          {links.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="transition-opacity hover:opacity-70"
              {...(href.startsWith("http") && { target: "_blank" })}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
