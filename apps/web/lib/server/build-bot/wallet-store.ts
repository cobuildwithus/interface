import "server-only";

import { createHash } from "crypto";
import type { EvmSmartAccount } from "@coinbase/cdp-sdk";
import prisma from "@/lib/server/db/cobuild-db-client";
import { normalizeAddress } from "@/lib/shared/address";
import { getBuildBotCdpClient } from "./cdp-client";

const MAX_CREATE_ATTEMPTS = 5;
const BUILD_BOT_OWNER_ACCOUNT_PREFIX = "build-bot-owner";
const BUILD_BOT_SMART_ACCOUNT_PREFIX = "build-bot-smart";

type BuildBotAgentWalletRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.buildBotAgentWallet.findUnique>>
>;

type BuildBotWalletDb = {
  buildBotAgentWallet: {
    findUnique: typeof prisma.buildBotAgentWallet.findUnique;
    create: typeof prisma.buildBotAgentWallet.create;
  };
};

function buildBotPrimaryDb() {
  const withPrimary = prisma as typeof prisma & {
    $primary?: () => BuildBotWalletDb;
  };
  return (
    typeof withPrimary.$primary === "function" ? withPrimary.$primary() : prisma
  ) as BuildBotWalletDb;
}

function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

async function findWalletByOwnerAgent(params: {
  db: BuildBotWalletDb;
  ownerAddress: `0x${string}`;
  agentKey: string;
}): Promise<BuildBotAgentWalletRecord | null> {
  return params.db.buildBotAgentWallet.findUnique({
    where: {
      ownerAddress_agentKey: {
        ownerAddress: params.ownerAddress,
        agentKey: params.agentKey,
      },
    },
  });
}

function assertSmartWalletRecord(params: {
  wallet: BuildBotAgentWalletRecord;
  expectedSmartAccountName: string;
}): BuildBotAgentWalletRecord {
  if (params.wallet.cdpAccountName !== params.expectedSmartAccountName) {
    throw new Error(
      "Legacy build-bot wallet record detected; delete the row so the smart-account wallet can be recreated"
    );
  }
  return params.wallet;
}

function resolveDefaultNetwork(input?: string): string {
  return (
    input?.trim() ||
    process.env.BUILD_BOT_DEFAULT_NETWORK ||
    process.env.BROKER_DEFAULT_NETWORK ||
    "base"
  );
}

function resolveAccountPolicyId(): string | null {
  const policyId = process.env.BUILD_BOT_ACCOUNT_POLICY_ID ?? process.env.BROKER_ACCOUNT_POLICY_ID;
  return policyId?.trim() || null;
}

function deterministicAccountSuffix(params: {
  ownerAddress: `0x${string}`;
  agentKey: string;
}): string {
  const seed = `${params.ownerAddress}:${params.agentKey}`;
  return createHash("sha256").update(seed).digest("hex").slice(0, 20);
}

function deterministicOwnerCdpAccountName(params: {
  ownerAddress: `0x${string}`;
  agentKey: string;
}): string {
  return `${BUILD_BOT_OWNER_ACCOUNT_PREFIX}-${deterministicAccountSuffix(params)}`;
}

function deterministicSmartCdpAccountName(params: {
  ownerAddress: `0x${string}`;
  agentKey: string;
}): string {
  return `${BUILD_BOT_SMART_ACCOUNT_PREFIX}-${deterministicAccountSuffix(params)}`;
}

function createAccountIdempotencyKey(cdpAccountName: string): string {
  return `build-bot-account-${cdpAccountName}`;
}

function applyPolicyIdempotencyKey(cdpAccountName: string): string {
  return `build-bot-account-policy-${cdpAccountName}`;
}

async function getOrCreateCdpAccountWithPolicy(params: {
  ownerCdpAccountName: string;
  accountPolicyId: string | null;
}) {
  const cdp = getBuildBotCdpClient();

  if (!params.accountPolicyId) {
    return cdp.evm.getOrCreateAccount({ name: params.ownerCdpAccountName });
  }

  try {
    return await cdp.evm.createAccount({
      name: params.ownerCdpAccountName,
      accountPolicy: params.accountPolicyId,
      idempotencyKey: createAccountIdempotencyKey(params.ownerCdpAccountName),
    });
  } catch {
    const account = await cdp.evm.getOrCreateAccount({ name: params.ownerCdpAccountName });
    return cdp.evm.updateAccount({
      address: account.address,
      update: {
        accountPolicy: params.accountPolicyId,
      },
      idempotencyKey: applyPolicyIdempotencyKey(params.ownerCdpAccountName),
    });
  }
}

async function getOrCreateBuildBotSmartAccount(params: {
  ownerCdpAccountName: string;
  smartCdpAccountName: string;
  accountPolicyId: string | null;
}): Promise<EvmSmartAccount> {
  const ownerAccount = await getOrCreateCdpAccountWithPolicy({
    ownerCdpAccountName: params.ownerCdpAccountName,
    accountPolicyId: params.accountPolicyId,
  });
  const cdp = getBuildBotCdpClient();
  return cdp.evm.getOrCreateSmartAccount({
    name: params.smartCdpAccountName,
    owner: ownerAccount,
  });
}

export async function getBuildBotAgentWallet(params: { ownerAddress: string; agentKey: string }) {
  const ownerAddress = normalizeAddress(params.ownerAddress);
  return findWalletByOwnerAgent({
    db: prisma as BuildBotWalletDb,
    ownerAddress,
    agentKey: params.agentKey,
  });
}

export async function getOrCreateBuildBotAgentWallet(params: {
  ownerAddress: string;
  agentKey: string;
  defaultNetwork?: string;
}) {
  const ownerAddress = normalizeAddress(params.ownerAddress);
  const agentKey = params.agentKey;
  const defaultNetwork = resolveDefaultNetwork(params.defaultNetwork);
  const primaryDb = buildBotPrimaryDb();
  const ownerCdpAccountName = deterministicOwnerCdpAccountName({ ownerAddress, agentKey });
  const cdpAccountName = deterministicSmartCdpAccountName({ ownerAddress, agentKey });
  const accountPolicyId = resolveAccountPolicyId();
  const findCurrentWallet = () =>
    findWalletByOwnerAgent({
      db: primaryDb,
      ownerAddress,
      agentKey,
    });

  const existing = await findCurrentWallet();
  if (existing) {
    return assertSmartWalletRecord({
      wallet: existing,
      expectedSmartAccountName: cdpAccountName,
    });
  }

  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
    try {
      const smartAccount = await getOrCreateBuildBotSmartAccount({
        ownerCdpAccountName,
        smartCdpAccountName: cdpAccountName,
        accountPolicyId,
      });
      const address = normalizeAddress(smartAccount.address);

      return await primaryDb.buildBotAgentWallet.create({
        data: {
          ownerAddress,
          agentKey,
          cdpAccountName,
          address,
          defaultNetwork,
        },
      });
    } catch (error) {
      if (isPrismaUniqueViolation(error)) {
        const conflicted = await findCurrentWallet();
        if (conflicted) {
          return assertSmartWalletRecord({
            wallet: conflicted,
            expectedSmartAccountName: cdpAccountName,
          });
        }
      }

      const raced = await findCurrentWallet();
      if (raced) {
        return assertSmartWalletRecord({
          wallet: raced,
          expectedSmartAccountName: cdpAccountName,
        });
      }

      if (attempt === MAX_CREATE_ATTEMPTS - 1) {
        throw error;
      }
    }
  }

  throw new Error("Failed to create build-bot wallet");
}

export async function getOrCreateBuildBotAgentSmartAccount(params: {
  ownerAddress: string;
  agentKey: string;
}): Promise<EvmSmartAccount> {
  const ownerAddress = normalizeAddress(params.ownerAddress);
  const agentKey = params.agentKey;
  const ownerCdpAccountName = deterministicOwnerCdpAccountName({ ownerAddress, agentKey });
  const smartCdpAccountName = deterministicSmartCdpAccountName({ ownerAddress, agentKey });
  const accountPolicyId = resolveAccountPolicyId();

  return getOrCreateBuildBotSmartAccount({
    ownerCdpAccountName,
    smartCdpAccountName,
    accountPolicyId,
  });
}
