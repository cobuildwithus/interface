"use client";

import { useMemo } from "react";
import { erc20Abi, formatUnits, zeroAddress } from "viem";
import { useAccount, useReadContract } from "wagmi";
import {
  jbControllerAbi,
  jbDirectoryAbi,
  jbMultiTerminalAbi,
  jbTerminalStoreAbi,
  jbTokensAbi,
  revDeployerAbi,
} from "@/lib/domains/token/onchain/abis";
import { contracts, WETH_ADDRESS } from "@/lib/domains/token/onchain/addresses";
import { REVNET_CHAIN_ID } from "@/lib/domains/token/onchain/revnet";
import {
  COBUILD_JUICEBOX_PROJECT_ID,
  COBUILD_JUICEBOX_PROJECT_ID_BIGINT,
} from "@/lib/domains/token/juicebox/constants";
import { applyJbDaoCashoutFee, applyRevnetCashoutFee } from "@/lib/domains/token/juicebox/fees";

const TOKEN_SYMBOL_BY_ADDRESS: Record<string, string> = {
  [contracts.USDCBase.toLowerCase()]: "USDC",
  [WETH_ADDRESS.toLowerCase()]: "WETH",
  ["0x000000000000000000000000000000000000eeee"]: "ETH",
};

function normalizeAddress(value?: string) {
  return value?.toLowerCase();
}

function getBaseTokenSymbol(address?: string) {
  const normalized = normalizeAddress(address);
  if (!normalized) return "Token";
  return TOKEN_SYMBOL_BY_ADDRESS[normalized] || "Token";
}

export function useRevnetPosition() {
  const { address } = useAccount();

  const { data: tokensAddress } = useReadContract({
    address: contracts.JBController as `0x${string}`,
    abi: jbControllerAbi,
    functionName: "TOKENS",
    chainId: REVNET_CHAIN_ID,
  });

  const { data: projectTokenAddress } = useReadContract({
    address: tokensAddress as `0x${string}` | undefined,
    abi: jbTokensAbi,
    functionName: "tokenOf",
    args: [COBUILD_JUICEBOX_PROJECT_ID_BIGINT],
    chainId: REVNET_CHAIN_ID,
    query: { enabled: !!tokensAddress },
  });

  const tokenAddress =
    projectTokenAddress && projectTokenAddress !== zeroAddress
      ? (projectTokenAddress as `0x${string}`)
      : undefined;

  const { data: tokenDecimals } = useReadContract({
    address: tokenAddress ?? zeroAddress,
    abi: erc20Abi,
    functionName: "decimals",
    chainId: REVNET_CHAIN_ID,
    query: { enabled: !!tokenAddress },
  });

  const { data: tokenSymbol } = useReadContract({
    address: tokenAddress ?? zeroAddress,
    abi: erc20Abi,
    functionName: "symbol",
    chainId: REVNET_CHAIN_ID,
    query: { enabled: !!tokenAddress },
  });

  const { data: tokenBalance } = useReadContract({
    address: tokensAddress as `0x${string}` | undefined,
    abi: jbTokensAbi,
    functionName: "totalBalanceOf",
    args: address ? [address, COBUILD_JUICEBOX_PROJECT_ID_BIGINT] : undefined,
    chainId: REVNET_CHAIN_ID,
    query: { enabled: !!address && !!tokensAddress },
  });

  const { data: accountingContexts } = useReadContract({
    address: contracts.JBMultiTerminal as `0x${string}`,
    abi: jbMultiTerminalAbi,
    functionName: "accountingContextsOf",
    args: [COBUILD_JUICEBOX_PROJECT_ID_BIGINT],
    chainId: REVNET_CHAIN_ID,
  });

  const baseTokenContext = useMemo(() => {
    if (!accountingContexts?.length) return undefined;

    const usdcContext = accountingContexts.find(
      (context) => normalizeAddress(context.token) === normalizeAddress(contracts.USDCBase)
    );

    return usdcContext || accountingContexts[0];
  }, [accountingContexts]);

  const { data: terminalAddress } = useReadContract({
    address: contracts.JBDirectory as `0x${string}`,
    abi: jbDirectoryAbi,
    functionName: "primaryTerminalOf",
    args: baseTokenContext
      ? [COBUILD_JUICEBOX_PROJECT_ID_BIGINT, baseTokenContext.token]
      : undefined,
    chainId: REVNET_CHAIN_ID,
    query: { enabled: !!baseTokenContext },
  });

  const { data: permissionsAddress } = useReadContract({
    address: contracts.REVDeployer as `0x${string}`,
    abi: revDeployerAbi,
    functionName: "PERMISSIONS",
    chainId: REVNET_CHAIN_ID,
  });

  const { data: revLoansAddress } = useReadContract({
    address: contracts.REVDeployer as `0x${string}`,
    abi: revDeployerAbi,
    functionName: "loansOf",
    args: [COBUILD_JUICEBOX_PROJECT_ID_BIGINT],
    chainId: REVNET_CHAIN_ID,
  });

  const { data: cashOutValue } = useReadContract({
    address: contracts.JBTerminalStore as `0x${string}`,
    abi: jbTerminalStoreAbi,
    functionName: "currentReclaimableSurplusOf",
    args:
      baseTokenContext && terminalAddress
        ? [
            COBUILD_JUICEBOX_PROJECT_ID_BIGINT,
            applyRevnetCashoutFee(tokenBalance ?? 0n),
            [terminalAddress],
            [baseTokenContext],
            BigInt(baseTokenContext.decimals),
            BigInt(baseTokenContext.currency),
          ]
        : undefined,
    chainId: REVNET_CHAIN_ID,
    query: { enabled: !!baseTokenContext && !!terminalAddress },
  });

  const formattedBalance = formatUnits(tokenBalance ?? 0n, tokenDecimals ?? 18);

  const netCashOutValue = applyJbDaoCashoutFee(cashOutValue ?? 0n);

  const formattedCashOutValue =
    baseTokenContext && cashOutValue != null
      ? formatUnits(netCashOutValue, baseTokenContext.decimals)
      : "0";

  return {
    projectId: COBUILD_JUICEBOX_PROJECT_ID_BIGINT,
    projectIdNumber: COBUILD_JUICEBOX_PROJECT_ID,
    tokenAddress,
    tokenSymbol: tokenSymbol || "Token",
    tokenDecimals: tokenDecimals ?? 18,
    tokenBalance: tokenBalance ?? 0n,
    formattedBalance,
    baseTokenContext,
    baseTokenAddress: baseTokenContext?.token,
    baseTokenSymbol: getBaseTokenSymbol(baseTokenContext?.token),
    terminalAddress,
    permissionsAddress:
      (permissionsAddress as `0x${string}` | undefined) ?? contracts.JBPermissions,
    revLoansAddress: (revLoansAddress as `0x${string}` | undefined) ?? contracts.REVLoans,
    cashOutValue: netCashOutValue,
    formattedCashOutValue,
    isConnected: !!address,
    account: address,
  };
}
