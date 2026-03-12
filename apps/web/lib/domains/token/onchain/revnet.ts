import { contracts, BASE_CHAIN_ID } from "./addresses";
import {
  COBUILD_REVNET_PROJECT_ID,
  REVNET_CHAIN_ID as WIRE_REVNET_CHAIN_ID,
  REVNET_NATIVE_TOKEN,
  REVNET_NATIVE_TOKEN_DECIMALS,
  REVNET_RESERVED_PERCENT_DENOMINATOR,
  REVNET_TOKEN_DECIMALS,
} from "@cobuild/wire";
import { parseEther } from "viem";

// COBUILD revnet project ID on Juicebox v5
export const COBUILD_PROJECT_ID = COBUILD_REVNET_PROJECT_ID;

// Chain configuration
export const REVNET_CHAIN_ID = WIRE_REVNET_CHAIN_ID ?? BASE_CHAIN_ID;

// Native token (ETH) address used by JB protocol
export const NATIVE_TOKEN = REVNET_NATIVE_TOKEN;

// Token decimals
export const NATIVE_TOKEN_DECIMALS = REVNET_NATIVE_TOKEN_DECIMALS;
export const JB_TOKEN_DECIMALS = REVNET_TOKEN_DECIMALS;

// Gas buffer to leave when using "max" (0.0001 ETH)
export const GAS_BUFFER = parseEther("0.0001");

// JB contract addresses on Base (v5)
export const jbContracts = {
  directory: contracts.JBDirectory as `0x${string}`,
  controller: contracts.JBController as `0x${string}`,
  multiTerminal: contracts.JBMultiTerminal as `0x${string}`,
} as const;

// Reserved percent max value (10000 = 100%)
export const MAX_RESERVED_PERCENT = REVNET_RESERVED_PERCENT_DENOMINATOR;
