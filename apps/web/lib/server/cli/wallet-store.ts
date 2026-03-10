import "server-only";

import { createHash, randomUUID } from "crypto";
import { normalizeEvmAddress as normalizeAddress } from "@cobuild/wire";
import type { EvmSmartAccount } from "@coinbase/cdp-sdk";
import prisma, { prismaPrimary } from "@/lib/server/db/cobuild-db-client";
import { getCliCdpClient } from "./cdp-client";
import {
  canonicalizeCliConfiguredNetwork,
  getCliAccountPolicyId,
  getCliDefaultNetwork,
} from "./env";
import { isPrismaUniqueViolation } from "./prisma-errors";

const MAX_CREATE_ATTEMPTS = 5;
const CLI_OWNER_ACCOUNT_PREFIX = "cli-owner";
const CLI_SMART_ACCOUNT_PREFIX = "cli-smart";

type CliAgentWalletRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.cliAgentWallet.findUnique>>
>;

type CliWalletDb = {
  cliAgentWallet: {
    findUnique: typeof prisma.cliAgentWallet.findUnique;
    create: typeof prisma.cliAgentWallet.create;
    update: typeof prisma.cliAgentWallet.update;
  };
};

async function findWalletByOwnerAgent(params: {
  db: CliWalletDb;
  ownerAddress: `0x${string}`;
  agentKey: string;
}): Promise<CliAgentWalletRecord | null> {
  return params.db.cliAgentWallet.findUnique({
    where: {
      ownerAddress_agentKey: {
        ownerAddress: params.ownerAddress,
        agentKey: params.agentKey,
      },
    },
  });
}

function assertSmartWalletRecord(params: {
  wallet: CliAgentWalletRecord;
  expectedSmartAccountName: string;
}): CliAgentWalletRecord {
  if (params.wallet.cdpAccountName !== params.expectedSmartAccountName) {
    throw new Error(
      "Legacy cli wallet record detected; delete the row so the smart-account wallet can be recreated"
    );
  }
  return params.wallet;
}

async function maybeNormalizeWalletDefaultNetwork(params: {
  db: CliWalletDb;
  wallet: CliAgentWalletRecord;
}): Promise<CliAgentWalletRecord> {
  const normalizedDefaultNetwork = canonicalizeCliConfiguredNetwork(params.wallet.defaultNetwork);
  if (!normalizedDefaultNetwork || normalizedDefaultNetwork === params.wallet.defaultNetwork) {
    return params.wallet;
  }

  return params.db.cliAgentWallet.update({
    where: {
      ownerAddress_agentKey: {
        ownerAddress: params.wallet.ownerAddress,
        agentKey: params.wallet.agentKey,
      },
    },
    data: {
      defaultNetwork: normalizedDefaultNetwork,
    },
  });
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
  return `${CLI_OWNER_ACCOUNT_PREFIX}-${deterministicAccountSuffix(params)}`;
}

function deterministicSmartCdpAccountName(params: {
  ownerAddress: `0x${string}`;
  agentKey: string;
}): string {
  return `${CLI_SMART_ACCOUNT_PREFIX}-${deterministicAccountSuffix(params)}`;
}

async function getOrCreateCdpAccountWithPolicy(params: {
  ownerCdpAccountName: string;
  accountPolicyId: string | null;
}) {
  const cdp = getCliCdpClient();

  if (!params.accountPolicyId) {
    return cdp.evm.getOrCreateAccount({ name: params.ownerCdpAccountName });
  }

  try {
    return await cdp.evm.createAccount({
      name: params.ownerCdpAccountName,
      accountPolicy: params.accountPolicyId,
      idempotencyKey: randomUUID(),
    });
  } catch {
    const account = await cdp.evm.getOrCreateAccount({ name: params.ownerCdpAccountName });
    return cdp.evm.updateAccount({
      address: account.address,
      update: {
        accountPolicy: params.accountPolicyId,
      },
      idempotencyKey: randomUUID(),
    });
  }
}

async function getOrCreateCliSmartAccount(params: {
  ownerCdpAccountName: string;
  smartCdpAccountName: string;
  accountPolicyId: string | null;
}): Promise<EvmSmartAccount> {
  const ownerAccount = await getOrCreateCdpAccountWithPolicy({
    ownerCdpAccountName: params.ownerCdpAccountName,
    accountPolicyId: params.accountPolicyId,
  });
  const cdp = getCliCdpClient();
  return cdp.evm.getOrCreateSmartAccount({
    name: params.smartCdpAccountName,
    owner: ownerAccount,
  });
}

export async function getCliAgentWallet(params: { ownerAddress: string; agentKey: string }) {
  const ownerAddress = normalizeAddress(params.ownerAddress, "ownerAddress");
  return findWalletByOwnerAgent({
    db: prisma as CliWalletDb,
    ownerAddress,
    agentKey: params.agentKey,
  });
}

export async function getOrCreateCliAgentWallet(params: {
  ownerAddress: string;
  agentKey: string;
  defaultNetwork?: string;
}) {
  const ownerAddress = normalizeAddress(params.ownerAddress, "ownerAddress");
  const agentKey = params.agentKey;
  const defaultNetwork = getCliDefaultNetwork(params.defaultNetwork);
  const primaryDb = prismaPrimary(prisma) as CliWalletDb;
  const ownerCdpAccountName = deterministicOwnerCdpAccountName({ ownerAddress, agentKey });
  const cdpAccountName = deterministicSmartCdpAccountName({ ownerAddress, agentKey });
  const accountPolicyId = getCliAccountPolicyId();
  const findCurrentWallet = () =>
    findWalletByOwnerAgent({
      db: primaryDb,
      ownerAddress,
      agentKey,
    });

  const existing = await findCurrentWallet();
  if (existing) {
    return maybeNormalizeWalletDefaultNetwork({
      db: primaryDb,
      wallet: assertSmartWalletRecord({
        wallet: existing,
        expectedSmartAccountName: cdpAccountName,
      }),
    });
  }

  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
    try {
      const smartAccount = await getOrCreateCliSmartAccount({
        ownerCdpAccountName,
        smartCdpAccountName: cdpAccountName,
        accountPolicyId,
      });
      const address = normalizeAddress(smartAccount.address, "smartAccount.address");

      return await primaryDb.cliAgentWallet.create({
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
          return maybeNormalizeWalletDefaultNetwork({
            db: primaryDb,
            wallet: assertSmartWalletRecord({
              wallet: conflicted,
              expectedSmartAccountName: cdpAccountName,
            }),
          });
        }
      }

      const raced = await findCurrentWallet();
      if (raced) {
        return maybeNormalizeWalletDefaultNetwork({
          db: primaryDb,
          wallet: assertSmartWalletRecord({
            wallet: raced,
            expectedSmartAccountName: cdpAccountName,
          }),
        });
      }

      if (attempt === MAX_CREATE_ATTEMPTS - 1) {
        throw error;
      }
    }
  }

  throw new Error("Failed to create cli wallet");
}

export async function getOrCreateCliAgentSmartAccount(params: {
  ownerAddress: string;
  agentKey: string;
}): Promise<EvmSmartAccount> {
  const ownerAddress = normalizeAddress(params.ownerAddress, "ownerAddress");
  const agentKey = params.agentKey;
  const ownerCdpAccountName = deterministicOwnerCdpAccountName({ ownerAddress, agentKey });
  const smartCdpAccountName = deterministicSmartCdpAccountName({ ownerAddress, agentKey });
  const accountPolicyId = getCliAccountPolicyId();

  return getOrCreateCliSmartAccount({
    ownerCdpAccountName,
    smartCdpAccountName,
    accountPolicyId,
  });
}

export async function getOrCreateCliAgentOwnerAccount(params: {
  ownerAddress: string;
  agentKey: string;
}): Promise<{
  address: `0x${string}`;
  cdpAccountName: string;
}> {
  const ownerAddress = normalizeAddress(params.ownerAddress, "ownerAddress");
  const agentKey = params.agentKey;
  const ownerCdpAccountName = deterministicOwnerCdpAccountName({ ownerAddress, agentKey });
  const accountPolicyId = getCliAccountPolicyId();

  const ownerAccount = await getOrCreateCdpAccountWithPolicy({
    ownerCdpAccountName,
    accountPolicyId,
  });

  return {
    address: normalizeAddress(ownerAccount.address, "ownerAccount.address"),
    cdpAccountName: ownerCdpAccountName,
  };
}
