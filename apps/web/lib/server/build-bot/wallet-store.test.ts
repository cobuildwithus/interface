import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "crypto";

vi.mock("server-only", () => ({}));

const {
  getBuildBotCdpClientMock,
  findUniqueMock,
  createMock,
  getOrCreateAccountMock,
  getOrCreateSmartAccountMock,
  createAccountMock,
  updateAccountMock,
  primaryMock,
} = vi.hoisted(() => {
  const getBuildBotCdpClientMock = vi.fn();
  const findUniqueMock = vi.fn();
  const createMock = vi.fn();
  const getOrCreateAccountMock = vi.fn();
  const getOrCreateSmartAccountMock = vi.fn();
  const createAccountMock = vi.fn();
  const updateAccountMock = vi.fn();
  const primaryMock = vi.fn(() => ({
    buildBotAgentWallet: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      create: (...args: unknown[]) => createMock(...args),
    },
  }));

  return {
    getBuildBotCdpClientMock,
    findUniqueMock,
    createMock,
    getOrCreateAccountMock,
    getOrCreateSmartAccountMock,
    createAccountMock,
    updateAccountMock,
    primaryMock,
  };
});

vi.mock("@/lib/server/build-bot/cdp-client", () => ({
  getBuildBotCdpClient: (...args: unknown[]) => getBuildBotCdpClientMock(...args),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    buildBotAgentWallet: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      create: (...args: unknown[]) => createMock(...args),
    },
    $primary: () => primaryMock(),
  },
}));

import {
  getBuildBotAgentWallet,
  getOrCreateBuildBotAgentSmartAccount,
  getOrCreateBuildBotAgentWallet,
} from "@/lib/server/build-bot/wallet-store";

const ORIGINAL_ENV = { ...process.env };
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function expectedAccountSuffix(ownerAddress: string, agentKey: string): string {
  return createHash("sha256").update(`${ownerAddress}:${agentKey}`).digest("hex").slice(0, 20);
}

function expectedOwnerAccountName(ownerAddress: string, agentKey: string): string {
  return `build-bot-owner-${expectedAccountSuffix(ownerAddress, agentKey)}`;
}

function expectedSmartAccountName(ownerAddress: string, agentKey: string): string {
  return `build-bot-smart-${expectedAccountSuffix(ownerAddress, agentKey)}`;
}

describe("build-bot wallet store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };

    getBuildBotCdpClientMock.mockReturnValue({
      evm: {
        getOrCreateAccount: (...args: unknown[]) => getOrCreateAccountMock(...args),
        getOrCreateSmartAccount: (...args: unknown[]) => getOrCreateSmartAccountMock(...args),
        createAccount: (...args: unknown[]) => createAccountMock(...args),
        updateAccount: (...args: unknown[]) => updateAccountMock(...args),
      },
    });
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("queries wallets by normalized owner + agent key", async () => {
    findUniqueMock.mockResolvedValue({ id: 1n });

    await getBuildBotAgentWallet({
      ownerAddress: "0x000000000000000000000000000000000000dEaD",
      agentKey: "default",
    });

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: {
        ownerAddress_agentKey: {
          ownerAddress: "0x000000000000000000000000000000000000dead",
          agentKey: "default",
        },
      },
    });
  });

  it("returns existing wallet without provisioning a CDP account", async () => {
    const ownerAddress = "0x000000000000000000000000000000000000dead";
    const agentKey = "default";
    const existingWallet = {
      ownerAddress,
      agentKey,
      cdpAccountName: expectedSmartAccountName(ownerAddress, agentKey),
      address: "0x0000000000000000000000000000000000000002",
      defaultNetwork: "base",
    };
    findUniqueMock.mockResolvedValueOnce(existingWallet);

    await expect(
      getOrCreateBuildBotAgentWallet({
        ownerAddress: "0x000000000000000000000000000000000000dEaD",
        agentKey,
      })
    ).resolves.toBe(existingWallet);

    expect(primaryMock).toHaveBeenCalledTimes(1);
    expect(getBuildBotCdpClientMock).not.toHaveBeenCalled();
    expect(getOrCreateAccountMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates a wallet with deterministic account name and explicit defaultNetwork", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    getOrCreateAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000001111",
    });
    getOrCreateSmartAccountMock.mockResolvedValue({
      address: "0x000000000000000000000000000000000000dEaD",
    });
    createMock.mockImplementation(async ({ data }) => ({
      ...data,
      id: 99n,
    }));

    const created = await getOrCreateBuildBotAgentWallet({
      ownerAddress: "0x000000000000000000000000000000000000Beef",
      agentKey: "default",
      defaultNetwork: "  base-sepolia  ",
    });

    const normalizedOwnerAddress = "0x000000000000000000000000000000000000beef";
    const ownerAccountName = expectedOwnerAccountName(normalizedOwnerAddress, "default");
    const smartAccountName = expectedSmartAccountName(normalizedOwnerAddress, "default");

    expect(getOrCreateAccountMock).toHaveBeenCalledWith({
      name: ownerAccountName,
    });
    expect(getOrCreateSmartAccountMock).toHaveBeenCalledWith({
      name: smartAccountName,
      owner: expect.objectContaining({
        address: "0x0000000000000000000000000000000000001111",
      }),
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        ownerAddress: normalizedOwnerAddress,
        agentKey: "default",
        cdpAccountName: smartAccountName,
        address: "0x000000000000000000000000000000000000dead",
        defaultNetwork: "base-sepolia",
      },
    });
    expect(created.defaultNetwork).toBe("base-sepolia");
  });

  it("resolves default network from BUILD_BOT_* then BROKER_*", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    getOrCreateAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000003",
    });
    getOrCreateSmartAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000004",
    });
    createMock.mockImplementation(async ({ data }) => ({
      ...data,
      id: 1n,
    }));

    process.env.BUILD_BOT_DEFAULT_NETWORK = "base-mainnet";

    await getOrCreateBuildBotAgentWallet({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
    });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          defaultNetwork: "base-mainnet",
        }),
      })
    );

    vi.clearAllMocks();

    findUniqueMock.mockResolvedValueOnce(null);
    getOrCreateAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000003",
    });
    getOrCreateSmartAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000004",
    });
    createMock.mockImplementation(async ({ data }) => ({
      ...data,
      id: 2n,
    }));
    delete process.env.BUILD_BOT_DEFAULT_NETWORK;
    process.env.BROKER_DEFAULT_NETWORK = "base-sepolia";

    await getOrCreateBuildBotAgentWallet({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
    });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          defaultNetwork: "base-sepolia",
        }),
      })
    );
  });

  it("creates accounts with account policy when configured", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    createAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000003",
    });
    getOrCreateSmartAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000004",
    });
    createMock.mockImplementation(async ({ data }) => ({ ...data, id: 1n }));
    process.env.BUILD_BOT_ACCOUNT_POLICY_ID = "policy-123";

    await getOrCreateBuildBotAgentWallet({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
    });

    const ownerAddress = "0x0000000000000000000000000000000000000001";
    const ownerAccountName = expectedOwnerAccountName(ownerAddress, "default");
    const smartAccountName = expectedSmartAccountName(ownerAddress, "default");

    expect(createAccountMock).toHaveBeenCalledWith({
      name: ownerAccountName,
      accountPolicy: "policy-123",
      idempotencyKey: expect.stringMatching(UUID_V4_REGEX),
    });
    expect(getOrCreateSmartAccountMock).toHaveBeenCalledWith({
      name: smartAccountName,
      owner: expect.objectContaining({
        address: "0x0000000000000000000000000000000000000003",
      }),
    });
    expect(getOrCreateAccountMock).not.toHaveBeenCalled();
    expect(updateAccountMock).not.toHaveBeenCalled();
  });

  it("falls back to getOrCreate + updateAccount when policy createAccount fails", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    createAccountMock.mockRejectedValue(new Error("name already used"));
    getOrCreateAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000003",
    });
    getOrCreateSmartAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000004",
    });
    updateAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000003",
    });
    createMock.mockImplementation(async ({ data }) => ({ ...data, id: 1n }));
    process.env.BUILD_BOT_ACCOUNT_POLICY_ID = "policy-123";

    await getOrCreateBuildBotAgentWallet({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
    });

    const ownerAddress = "0x0000000000000000000000000000000000000001";
    const ownerAccountName = expectedOwnerAccountName(ownerAddress, "default");

    expect(getOrCreateAccountMock).toHaveBeenCalledWith({
      name: ownerAccountName,
    });
    expect(updateAccountMock).toHaveBeenCalledWith({
      address: "0x0000000000000000000000000000000000000003",
      update: {
        accountPolicy: "policy-123",
      },
      idempotencyKey: expect.stringMatching(UUID_V4_REGEX),
    });
  });

  it("returns a raced wallet record when getOrCreateAccount fails once", async () => {
    const ownerAddress = "0x0000000000000000000000000000000000000001";
    const agentKey = "default";
    const racedWallet = {
      ownerAddress,
      agentKey,
      cdpAccountName: expectedSmartAccountName(ownerAddress, agentKey),
      address: "0x0000000000000000000000000000000000000004",
      defaultNetwork: "base",
    };

    findUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce(racedWallet);
    getOrCreateAccountMock.mockRejectedValue(new Error("CDP conflict"));

    await expect(
      getOrCreateBuildBotAgentWallet({
        ownerAddress,
        agentKey,
      })
    ).resolves.toBe(racedWallet);

    expect(getOrCreateAccountMock).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns conflicted wallet when db create hits unique constraint", async () => {
    const ownerAddress = "0x0000000000000000000000000000000000000001";
    const agentKey = "default";
    const racedWallet = {
      ownerAddress,
      agentKey,
      cdpAccountName: expectedSmartAccountName(ownerAddress, agentKey),
      address: "0x0000000000000000000000000000000000000004",
      defaultNetwork: "base",
    };

    findUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce(racedWallet);
    getOrCreateAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000009",
    });
    getOrCreateSmartAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000008",
    });
    createMock.mockRejectedValue({
      code: "P2002",
    });

    await expect(
      getOrCreateBuildBotAgentWallet({
        ownerAddress,
        agentKey,
      })
    ).resolves.toBe(racedWallet);
  });

  it("throws on unique-constraint conflict when raced row is legacy-named", async () => {
    const ownerAddress = "0x0000000000000000000000000000000000000001";
    const agentKey = "default";
    const legacyWallet = {
      ownerAddress,
      agentKey,
      cdpAccountName: "build-bot-legacy",
      address: "0x0000000000000000000000000000000000000004",
      defaultNetwork: "base",
    };

    findUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce(legacyWallet);
    getOrCreateAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000009",
    });
    getOrCreateSmartAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000008",
    });
    createMock.mockRejectedValue({
      code: "P2002",
    });

    await expect(
      getOrCreateBuildBotAgentWallet({
        ownerAddress,
        agentKey,
      })
    ).rejects.toThrow(
      "Legacy build-bot wallet record detected; delete the row so the smart-account wallet can be recreated"
    );
  });

  it("retries provisioning up to max attempts before throwing", async () => {
    const creationError = new Error("create failed");
    findUniqueMock.mockResolvedValue(null);
    getOrCreateAccountMock.mockRejectedValue(creationError);

    await expect(
      getOrCreateBuildBotAgentWallet({
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
      })
    ).rejects.toBe(creationError);

    expect(getOrCreateAccountMock).toHaveBeenCalledTimes(5);
    expect(findUniqueMock).toHaveBeenCalledTimes(6);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("retries with the same deterministic CDP account name", async () => {
    findUniqueMock.mockResolvedValue(null);
    getOrCreateAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000002",
    });
    getOrCreateSmartAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000003",
    });
    createMock
      .mockRejectedValueOnce(new Error("temporary db failure"))
      .mockImplementation(async ({ data }) => ({ ...data, id: 1n }));

    await expect(
      getOrCreateBuildBotAgentWallet({
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
      })
    ).resolves.toMatchObject({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
    });

    expect(getOrCreateAccountMock).toHaveBeenCalledTimes(2);
    expect(getOrCreateAccountMock.mock.calls[0]?.[0]).toEqual(
      getOrCreateAccountMock.mock.calls[1]?.[0]
    );
  });

  it("throws when an existing wallet row is not on deterministic smart-account naming", async () => {
    const ownerAddress = "0x0000000000000000000000000000000000000001";
    const agentKey = "default";
    const legacyWallet = {
      ownerAddress,
      agentKey,
      cdpAccountName: "build-bot-legacy",
      address: "0x0000000000000000000000000000000000009999",
      defaultNetwork: "base",
    };

    findUniqueMock.mockResolvedValueOnce(legacyWallet);

    await expect(
      getOrCreateBuildBotAgentWallet({
        ownerAddress,
        agentKey,
      })
    ).rejects.toThrow(
      "Legacy build-bot wallet record detected; delete the row so the smart-account wallet can be recreated"
    );
    expect(getBuildBotCdpClientMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("throws when a raced wallet row is legacy-named after provisioning failure", async () => {
    const ownerAddress = "0x0000000000000000000000000000000000000001";
    const agentKey = "default";
    const legacyWallet = {
      ownerAddress,
      agentKey,
      cdpAccountName: "build-bot-legacy",
      address: "0x0000000000000000000000000000000000009999",
      defaultNetwork: "base",
    };

    findUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce(legacyWallet);
    getOrCreateAccountMock.mockRejectedValue(new Error("CDP conflict"));

    await expect(
      getOrCreateBuildBotAgentWallet({
        ownerAddress,
        agentKey,
      })
    ).rejects.toThrow(
      "Legacy build-bot wallet record detected; delete the row so the smart-account wallet can be recreated"
    );
  });

  it("provisions and returns the deterministic smart account for an owner + agent", async () => {
    getOrCreateAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000003",
    });
    const smartAccount = {
      address: "0x0000000000000000000000000000000000000004",
    };
    getOrCreateSmartAccountMock.mockResolvedValue(smartAccount);

    await expect(
      getOrCreateBuildBotAgentSmartAccount({
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
      })
    ).resolves.toEqual(smartAccount);

    expect(getOrCreateAccountMock).toHaveBeenCalledWith({
      name: expectedOwnerAccountName("0x0000000000000000000000000000000000000001", "default"),
    });
    expect(getOrCreateSmartAccountMock).toHaveBeenCalledWith({
      name: expectedSmartAccountName("0x0000000000000000000000000000000000000001", "default"),
      owner: expect.objectContaining({
        address: "0x0000000000000000000000000000000000000003",
      }),
    });
  });
});
