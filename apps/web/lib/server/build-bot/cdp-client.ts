import "server-only";

import { CdpClient } from "@coinbase/cdp-sdk";
import { BuildBotConfigError } from "./errors";

type BuildBotGlobal = typeof globalThis & {
  buildBotCdpClient?: CdpClient;
};

const globalForBuildBot = globalThis as BuildBotGlobal;
const MISSING_CDP_CREDENTIALS_ERROR =
  "Build Bot wallet backend is not configured. Missing CDP credentials on the interface server.";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new BuildBotConfigError(MISSING_CDP_CREDENTIALS_ERROR);
  }
  return value;
}

function createBuildBotCdpClient() {
  return new CdpClient({
    apiKeyId: getRequiredEnv("CDP_API_KEY_ID"),
    apiKeySecret: getRequiredEnv("CDP_API_KEY_SECRET"),
    walletSecret: getRequiredEnv("CDP_WALLET_SECRET"),
  });
}

export function getBuildBotCdpClient(): CdpClient {
  if (!globalForBuildBot.buildBotCdpClient) {
    globalForBuildBot.buildBotCdpClient = createBuildBotCdpClient();
  }

  return globalForBuildBot.buildBotCdpClient;
}
