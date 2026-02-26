"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { PropsWithChildren, useState } from "react";
import { State } from "wagmi";
import { chains, wagmiConfig } from "@/lib/domains/token/onchain/wagmi-config";

export function Providers({ children, initialState }: PropsWithChildren<{ initialState?: State }>) {
  const [queryClient] = useState(() => new QueryClient());
  const { resolvedTheme } = useTheme();

  const theme = resolvedTheme === "dark" ? "dark" : resolvedTheme === "light" ? "light" : undefined;

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          ...(theme && { theme }),
          showWalletLoginFirst: true,
          walletChainType: "ethereum-only",
        },
        defaultChain: chains[0],
        supportedChains: [...chains],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig} initialState={initialState}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
