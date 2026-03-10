import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { findSwapExecutedMock, getTransactionMock, postRulesApiJsonMock } = vi.hoisted(() => ({
  findSwapExecutedMock: vi.fn(),
  getTransactionMock: vi.fn(),
  postRulesApiJsonMock: vi.fn(),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    swapExecuted: {
      findUnique: (...args: Parameters<typeof findSwapExecutedMock>) =>
        findSwapExecutedMock(...args),
    },
  },
}));

vi.mock("@/lib/domains/token/onchain/clients", () => ({
  getClient: () => ({
    getTransaction: (...args: Parameters<typeof getTransactionMock>) => getTransactionMock(...args),
  }),
}));

vi.mock("@/lib/domains/rules/rules-api/post-json", () => ({
  RulesApiNotConfiguredError: class RulesApiNotConfiguredError extends Error {},
  postRulesApiJson: (...args: Parameters<typeof postRulesApiJsonMock>) =>
    postRulesApiJsonMock(...args),
}));

import { registerDirectIntent } from "./swaps-direct-intent";

const OWNER = "0x00000000000000000000000000000000000000aa" as const;
const TX_HASH = `0x${"1".repeat(64)}` as const;
const TOKEN = "0x00000000000000000000000000000000000000bb" as const;
const RECIPIENT = "0x00000000000000000000000000000000000000cc" as const;
const ENTITY_ID = `0x${"2".repeat(40)}` as const;

describe("registerDirectIntent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    postRulesApiJsonMock.mockResolvedValue({ ok: true });
  });

  it("rejects unsupported chain ids before posting downstream", async () => {
    const result = await registerDirectIntent(
      {
        txHash: TX_HASH,
        tokenAddress: TOKEN,
        entityId: ENTITY_ID,
        chainId: 10,
      },
      { ownerAddress: OWNER }
    );

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Unsupported chainId: 10",
    });
    expect(postRulesApiJsonMock).not.toHaveBeenCalled();
  });

  it("rejects indexed swaps owned by another wallet", async () => {
    findSwapExecutedMock.mockResolvedValue({
      chainId: 8453,
      from: "0x00000000000000000000000000000000000000dd",
      recipient: RECIPIENT,
      tokenOut: TOKEN,
    });

    const result = await registerDirectIntent(
      {
        txHash: TX_HASH,
        tokenAddress: TOKEN,
        entityId: ENTITY_ID,
        chainId: 8453,
        recipient: RECIPIENT,
      },
      { ownerAddress: OWNER }
    );

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Transaction does not belong to the authenticated wallet.",
    });
    expect(postRulesApiJsonMock).not.toHaveBeenCalled();
  });

  it("rejects indexed swaps with a mismatched recipient", async () => {
    findSwapExecutedMock.mockResolvedValue({
      chainId: 8453,
      from: OWNER,
      recipient: "0x00000000000000000000000000000000000000dd",
      tokenOut: TOKEN,
    });

    const result = await registerDirectIntent(
      {
        txHash: TX_HASH,
        tokenAddress: TOKEN,
        entityId: ENTITY_ID,
        chainId: 8453,
        recipient: RECIPIENT,
      },
      { ownerAddress: OWNER }
    );

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Transaction recipient does not match the requested boost recipient.",
    });
    expect(postRulesApiJsonMock).not.toHaveBeenCalled();
  });

  it("rejects indexed swaps with a mismatched token", async () => {
    findSwapExecutedMock.mockResolvedValue({
      chainId: 8453,
      from: OWNER,
      recipient: RECIPIENT,
      tokenOut: "0x00000000000000000000000000000000000000dd",
    });

    const result = await registerDirectIntent(
      {
        txHash: TX_HASH,
        tokenAddress: TOKEN,
        entityId: ENTITY_ID,
        chainId: 8453,
        recipient: RECIPIENT,
      },
      { ownerAddress: OWNER }
    );

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Transaction token does not match the requested boost token.",
    });
    expect(postRulesApiJsonMock).not.toHaveBeenCalled();
  });

  it("falls back to the onchain transaction sender when the index is cold", async () => {
    findSwapExecutedMock.mockResolvedValue(null);
    getTransactionMock.mockResolvedValue({
      from: OWNER,
    });

    const result = await registerDirectIntent(
      {
        txHash: TX_HASH,
        tokenAddress: TOKEN,
        entityId: ENTITY_ID,
        chainId: 8453,
      },
      { ownerAddress: OWNER }
    );

    expect(result).toEqual({ ok: true, data: { ok: true } });
    expect(getTransactionMock).toHaveBeenCalledWith({ hash: TX_HASH });
    expect(postRulesApiJsonMock).toHaveBeenCalledWith("/v1/swaps/direct-intent", {
      txHash: TX_HASH,
      chainId: 8453,
      tokenAddress: TOKEN,
      entityId: ENTITY_ID,
      recipient: null,
    });
  });

  it("rejects onchain sender mismatches when the index is cold", async () => {
    findSwapExecutedMock.mockResolvedValue(null);
    getTransactionMock.mockResolvedValue({
      from: "0x00000000000000000000000000000000000000dd",
    });

    const result = await registerDirectIntent(
      {
        txHash: TX_HASH,
        tokenAddress: TOKEN,
        entityId: ENTITY_ID,
        chainId: 8453,
      },
      { ownerAddress: OWNER }
    );

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Transaction does not belong to the authenticated wallet.",
    });
    expect(postRulesApiJsonMock).not.toHaveBeenCalled();
  });

  it("returns a client error when the transaction cannot be verified onchain", async () => {
    findSwapExecutedMock.mockResolvedValue(null);
    getTransactionMock.mockRejectedValue(new Error("not found"));

    const result = await registerDirectIntent(
      {
        txHash: TX_HASH,
        tokenAddress: TOKEN,
        entityId: ENTITY_ID,
        chainId: 8453,
      },
      { ownerAddress: OWNER }
    );

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Transaction could not be verified on Base.",
    });
    expect(postRulesApiJsonMock).not.toHaveBeenCalled();
  });
});
