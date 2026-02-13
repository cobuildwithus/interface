import { formatUnits, parseUnits } from "viem";

const USDC_DECIMALS = 6;

export const formatUsdc = (amount: bigint) =>
  Number(formatUnits(amount, USDC_DECIMALS)).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export const parseUsdc = (amount: string) => parseUnits(amount, USDC_DECIMALS);

export const usdc = {
  parse: parseUsdc,
  format: formatUsdc,
};
