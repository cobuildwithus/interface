import { headers } from "next/headers";
import { JetBrains_Mono, Public_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { cookieToInitialState } from "wagmi";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getWagmiConfig } from "@/lib/domains/token/onchain/wagmi-config";
import { buildPageMetadata } from "@/lib/shared/page-metadata";
import { Providers } from "./providers";
import "./globals.css";
import "katex/dist/katex.min.css";
import { PropsWithChildren } from "react";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = buildPageMetadata({
  title: "Cobuild",
  description: "Making capital serve culture",
});

export default async function RootLayout({ children }: Readonly<PropsWithChildren>) {
  const cookieHeader = (await headers()).get("cookie");
  const initialState = cookieToInitialState(getWagmiConfig(), cookieHeader);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="base:app_id" content="69a6131ea0fdf68983d307cf" />
      </head>
      <body
        className={`${jetbrainsMono.variable} ${publicSans.variable} bg-background text-foreground selection:bg-foreground selection:text-background font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Providers initialState={initialState}>{children}</Providers>
          <Toaster />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
