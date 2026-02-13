/**
 * COBUILD Revnet Configuration
 *
 * Constants for interacting with the COBUILD revnet on Base.
 * Project ID 6, ETH-backed issuance.
 */

import { contracts, BASE_CHAIN_ID } from "./addresses";
import { parseEther } from "viem";

// COBUILD revnet project ID on Juicebox v5
export const COBUILD_PROJECT_ID = 6n;

// Swap-only project ID used for revnet purchases
export const COBUILD_SWAP_PROJECT_ID = 3n;

// Chain configuration
export const REVNET_CHAIN_ID = BASE_CHAIN_ID;

// Native token (ETH) address used by JB protocol
export const NATIVE_TOKEN = "0x000000000000000000000000000000000000EEEe" as const;

// Token decimals
export const NATIVE_TOKEN_DECIMALS = 18;
export const JB_TOKEN_DECIMALS = 18;

// Gas buffer to leave when using "max" (0.0001 ETH)
export const GAS_BUFFER = parseEther("0.0001");

// JB contract addresses on Base (v5)
export const jbContracts = {
  directory: contracts.JBDirectory as `0x${string}`,
  controller: contracts.JBController as `0x${string}`,
  multiTerminal: contracts.JBMultiTerminal as `0x${string}`,
} as const;

// Reserved percent max value (10000 = 100%)
export const MAX_RESERVED_PERCENT = 10000n;
