import "server-only";

import { CdpClient } from "@coinbase/cdp-sdk";
import { CliConfigError } from "./errors";

type CliGlobal = typeof globalThis & {
  cliCdpClient?: CdpClient;
};

const globalForCli = globalThis as CliGlobal;
const MISSING_CDP_CREDENTIALS_ERROR =
  "CLI wallet backend is not configured. Missing CDP credentials on the interface server.";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new CliConfigError(MISSING_CDP_CREDENTIALS_ERROR);
  }
  return value;
}

function createCliCdpClient() {
  return new CdpClient({
    apiKeyId: getRequiredEnv("CDP_API_KEY_ID"),
    apiKeySecret: getRequiredEnv("CDP_API_KEY_SECRET"),
    walletSecret: getRequiredEnv("CDP_WALLET_SECRET"),
  });
}

export function getCliCdpClient(): CdpClient {
  if (!globalForCli.cliCdpClient) {
    globalForCli.cliCdpClient = createCliCdpClient();
  }

  return globalForCli.cliCdpClient;
}
