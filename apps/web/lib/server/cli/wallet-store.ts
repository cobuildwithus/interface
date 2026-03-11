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

type CliAgentWalletContextParams = {
  ownerAddress: `0x${string}`;
  agentKey: string;
  defaultNetwork: string;
  primaryDb: CliWalletDb;
  ownerCdpAccountName: string;
  smartCdpAccountName: string;
  accountPolicyId: string | null;
};

type CliAgentExecutionContext = {
  wallet: CliAgentWalletRecord;
  smartAccount: EvmSmartAccount;
  walletAddress: `0x${string}`;
};

export type ResolvedCliExecWalletContext = {
  requestedNetwork: string;
  walletAddress?: `0x${string}`;
  getExecutionContext: () => Promise<CliAgentExecutionContext>;
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

function createCliAgentWalletContext(params: {
  ownerAddress: string;
  agentKey: string;
  defaultNetwork?: string;
}): CliAgentWalletContextParams {
  const ownerAddress = normalizeAddress(params.ownerAddress, "ownerAddress");
  const agentKey = params.agentKey;

  return {
    ownerAddress,
    agentKey,
    defaultNetwork: getCliDefaultNetwork(params.defaultNetwork),
    primaryDb: prismaPrimary(prisma) as CliWalletDb,
    ownerCdpAccountName: deterministicOwnerCdpAccountName({ ownerAddress, agentKey }),
    smartCdpAccountName: deterministicSmartCdpAccountName({ ownerAddress, agentKey }),
    accountPolicyId: getCliAccountPolicyId(),
  };
}

async function ensureCliAgentWalletRecord(
  params: CliAgentWalletContextParams & {
    loadSmartAccount: () => Promise<EvmSmartAccount>;
  }
): Promise<CliAgentWalletRecord> {
  const findCurrentWallet = () =>
    findWalletByOwnerAgent({
      db: params.primaryDb,
      ownerAddress: params.ownerAddress,
      agentKey: params.agentKey,
    });

  const existing = await findCurrentWallet();
  if (existing) {
    return maybeNormalizeWalletDefaultNetwork({
      db: params.primaryDb,
      wallet: assertSmartWalletRecord({
        wallet: existing,
        expectedSmartAccountName: params.smartCdpAccountName,
      }),
    });
  }

  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
    try {
      const smartAccount = await params.loadSmartAccount();
      const address = normalizeAddress(smartAccount.address, "smartAccount.address");

      return await params.primaryDb.cliAgentWallet.create({
        data: {
          ownerAddress: params.ownerAddress,
          agentKey: params.agentKey,
          cdpAccountName: params.smartCdpAccountName,
          address,
          defaultNetwork: params.defaultNetwork,
        },
      });
    } catch (error) {
      if (isPrismaUniqueViolation(error)) {
        const conflicted = await findCurrentWallet();
        if (conflicted) {
          return maybeNormalizeWalletDefaultNetwork({
            db: params.primaryDb,
            wallet: assertSmartWalletRecord({
              wallet: conflicted,
              expectedSmartAccountName: params.smartCdpAccountName,
            }),
          });
        }
      }

      const raced = await findCurrentWallet();
      if (raced) {
        return maybeNormalizeWalletDefaultNetwork({
          db: params.primaryDb,
          wallet: assertSmartWalletRecord({
            wallet: raced,
            expectedSmartAccountName: params.smartCdpAccountName,
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
  const context = createCliAgentWalletContext(params);
  let smartAccountPromise: Promise<EvmSmartAccount> | undefined;

  return ensureCliAgentWalletRecord({
    ...context,
    loadSmartAccount: async () => {
      smartAccountPromise ??= getOrCreateCliSmartAccount({
        ownerCdpAccountName: context.ownerCdpAccountName,
        smartCdpAccountName: context.smartCdpAccountName,
        accountPolicyId: context.accountPolicyId,
      });
      return await smartAccountPromise;
    },
  });
}

export async function resolveCliExecWalletContext(params: {
  ownerAddress: string;
  agentKey: string;
  requestedNetwork?: string;
}): Promise<ResolvedCliExecWalletContext> {
  const ownerAddress = normalizeAddress(params.ownerAddress, "ownerAddress");
  const existingWallet = await getCliAgentWallet({
    ownerAddress,
    agentKey: params.agentKey,
  });
  const walletAddress =
    typeof existingWallet?.address === "string" && existingWallet.address.length > 0
      ? normalizeAddress(existingWallet.address, "wallet.address")
      : undefined;
  const requestedNetwork =
    params.requestedNetwork ?? existingWallet?.defaultNetwork ?? getCliDefaultNetwork();

  let executionContextPromise: Promise<CliAgentExecutionContext> | undefined;

  return {
    requestedNetwork,
    walletAddress,
    getExecutionContext: async () => {
      executionContextPromise ??= getOrCreateCliAgentExecutionContext({
        ownerAddress,
        agentKey: params.agentKey,
        defaultNetwork: requestedNetwork,
      });
      return await executionContextPromise;
    },
  };
}

export async function getOrCreateCliAgentExecutionContext(params: {
  ownerAddress: string;
  agentKey: string;
  defaultNetwork?: string;
}): Promise<CliAgentExecutionContext> {
  const context = createCliAgentWalletContext(params);
  let smartAccountPromise: Promise<EvmSmartAccount> | undefined;
  const loadSmartAccount = async () => {
    smartAccountPromise ??= getOrCreateCliSmartAccount({
      ownerCdpAccountName: context.ownerCdpAccountName,
      smartCdpAccountName: context.smartCdpAccountName,
      accountPolicyId: context.accountPolicyId,
    });
    return await smartAccountPromise;
  };

  const wallet = await ensureCliAgentWalletRecord({
    ...context,
    loadSmartAccount,
  });
  const smartAccount = await loadSmartAccount();

  return {
    wallet,
    smartAccount,
    walletAddress: normalizeAddress(smartAccount.address, "smartAccount.address"),
  };
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
