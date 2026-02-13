/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { zeroAddress } from "viem";
import { contracts, WETH_ADDRESS } from "@/lib/domains/token/onchain/addresses";

const useAccountMock = vi.fn();
const useReadContractMock = vi.fn();

vi.mock("wagmi", () => ({
  useAccount: () => useAccountMock(),
  useReadContract: (args: Parameters<typeof useReadContractMock>[0]) => useReadContractMock(args),
}));

import { useRevnetPosition } from "@/lib/hooks/use-revnet-position";

describe("useRevnetPosition", () => {
  beforeEach(() => {
    useAccountMock.mockReset();
    useReadContractMock.mockReset();
  });

  it("returns formatted data when connected", () => {
    useAccountMock.mockReturnValue({ address: "0x" + "1".repeat(40) });

    useReadContractMock.mockImplementation(({ functionName }: { functionName: string }) => {
      switch (functionName) {
        case "TOKENS":
          return { data: "0x" + "2".repeat(40) };
        case "tokenOf":
          return { data: "0x" + "3".repeat(40) };
        case "decimals":
          return { data: 6 };
        case "symbol":
          return { data: "COBUILD" };
        case "totalBalanceOf":
          return { data: 123456n };
        case "accountingContextsOf":
          return {
            data: [
              { token: contracts.USDCBase, decimals: 6, currency: 1 },
              { token: WETH_ADDRESS, decimals: 18, currency: 1 },
            ],
          };
        case "primaryTerminalOf":
          return { data: "0x" + "4".repeat(40) };
        case "PERMISSIONS":
          return { data: "0x" + "5".repeat(40) };
        case "loansOf":
          return { data: "0x" + "6".repeat(40) };
        case "currentReclaimableSurplusOf":
          return { data: 1000n };
        default:
          return { data: undefined };
      }
    });

    const { result } = renderHook(() => useRevnetPosition());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.tokenAddress).toBe("0x" + "3".repeat(40));
    expect(result.current.tokenSymbol).toBe("COBUILD");
    expect(result.current.tokenDecimals).toBe(6);
    expect(result.current.formattedBalance).toBe("0.123456");
    expect(result.current.baseTokenSymbol).toBe("USDC");
    expect(result.current.formattedCashOutValue).toBe("0.000975");
  });

  it("falls back when not connected or token missing", () => {
    useAccountMock.mockReturnValue({ address: undefined });

    useReadContractMock.mockImplementation(({ functionName }: { functionName: string }) => {
      if (functionName === "TOKENS") return { data: "0x" + "2".repeat(40) };
      if (functionName === "tokenOf") return { data: zeroAddress };
      if (functionName === "accountingContextsOf") return { data: [] };
      return { data: undefined };
    });

    const { result } = renderHook(() => useRevnetPosition());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.tokenAddress).toBeUndefined();
    expect(result.current.tokenSymbol).toBe("Token");
    expect(result.current.formattedCashOutValue).toBe("0");
  });
});
