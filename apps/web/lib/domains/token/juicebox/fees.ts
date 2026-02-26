const CASHOUT_FEE_DENOMINATOR = 1000n;

// Matches revnet-app constants (2.5% each).
export const REVNET_CASHOUT_FEE_BPS = 25n;
export const JBDAO_CASHOUT_FEE_BPS = 25n;

export function applyRevnetCashoutFee(amount: bigint) {
  return (amount * (CASHOUT_FEE_DENOMINATOR - REVNET_CASHOUT_FEE_BPS)) / CASHOUT_FEE_DENOMINATOR;
}

export function applyJbDaoCashoutFee(amount: bigint) {
  return (amount * (CASHOUT_FEE_DENOMINATOR - JBDAO_CASHOUT_FEE_BPS)) / CASHOUT_FEE_DENOMINATOR;
}
