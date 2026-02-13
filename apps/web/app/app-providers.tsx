import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { wagmiConfig } from "@/lib/domains/token/onchain/wagmi-config";
import { Providers } from "./providers";
import { PropsWithChildren } from "react";

export async function AppProviders({ children }: PropsWithChildren) {
  const cookieHeader = (await headers()).get("cookie");
  const initialState = cookieToInitialState(wagmiConfig, cookieHeader);

  return <Providers initialState={initialState}>{children}</Providers>;
}
