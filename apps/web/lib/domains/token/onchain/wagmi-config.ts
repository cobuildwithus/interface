import { createConfig } from "@privy-io/wagmi";
import { cookieStorage, createStorage, http } from "wagmi";
import { base, mainnet } from "viem/chains";
import { getAlchemyKey, getRpcUrl } from "./chains";

export const chains = [base, mainnet] as const;

function getTransport(chain: typeof base | typeof mainnet) {
  const key = getAlchemyKey();
  return key ? http(getRpcUrl(chain, "http")) : http();
}

export function getWagmiConfig() {
  return createConfig({
    chains,
    ssr: true,
    storage: createStorage({
      storage: cookieStorage,
    }),
    transports: {
      [base.id]: getTransport(base),
      [mainnet.id]: getTransport(mainnet),
    },
  });
}

type AppWagmiConfig = ReturnType<typeof getWagmiConfig>;

declare module "wagmi" {
  interface Register {
    config: AppWagmiConfig;
  }
}
