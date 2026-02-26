import { JetBrains_Mono, Public_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { buildPageMetadata } from "@/lib/shared/page-metadata";
import { AppProviders } from "./app-providers";
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

export default function RootLayout({ children }: Readonly<PropsWithChildren>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jetbrainsMono.variable} ${publicSans.variable} bg-background text-foreground selection:bg-foreground selection:text-background font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Suspense fallback={null}>
            <AppProviders>{children}</AppProviders>
          </Suspense>
          <Toaster />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
