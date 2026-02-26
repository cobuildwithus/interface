import { formatUnits } from "viem";
import { FEE_BPS_DENOMINATOR, LOAN_LIQUIDATION_YEARS } from "./constants";
import { formatDisplay, formatPercentValue, formatRepayWindow } from "./utils";

type LoanMetricsInput = {
  borrowableAmount?: bigint;
  borrowableDecimals: number;
  collateralAmount: string;
  maxPrepaidFeePercentBps: number;
  prepaidFeePercent: number;
  repayYears: number;
  revPrepaidFeePercent?: bigint;
};

type LoanMetrics = {
  borrowDisplay: string;
  principalDisplay: string;
  upfrontFeeDisplay: string;
  maxRepayDisplay: string;
  collateralDisplay: string;
  repayWindowLabel: string;
  prepaidPercentLabel: string;
  revFeePercentLabel: string;
  feeWindowNote: string;
  hasFullPrepayCoverage: boolean;
};

export const calculateLoanMetrics = ({
  borrowableAmount,
  borrowableDecimals,
  collateralAmount,
  maxPrepaidFeePercentBps,
  prepaidFeePercent,
  repayYears,
  revPrepaidFeePercent,
}: LoanMetricsInput): LoanMetrics => {
  const revFeeBps = revPrepaidFeePercent ?? 0n;
  const totalFeeBps = revFeeBps + BigInt(prepaidFeePercent);
  const grossBorrowableAmount = borrowableAmount ?? 0n;
  const netBorrowableAmount =
    totalFeeBps >= FEE_BPS_DENOMINATOR
      ? 0n
      : (grossBorrowableAmount * (FEE_BPS_DENOMINATOR - totalFeeBps)) / FEE_BPS_DENOMINATOR;
  const upfrontFeeAmount =
    grossBorrowableAmount > netBorrowableAmount ? grossBorrowableAmount - netBorrowableAmount : 0n;

  const baseTokenDisplayDecimals = borrowableDecimals > 8 ? 6 : borrowableDecimals;

  const borrowDisplay = formatDisplay(
    formatUnits(netBorrowableAmount, borrowableDecimals),
    baseTokenDisplayDecimals
  );
  const principalDisplay = formatDisplay(
    formatUnits(grossBorrowableAmount, borrowableDecimals),
    baseTokenDisplayDecimals
  );
  const upfrontFeeDisplay = formatDisplay(
    formatUnits(upfrontFeeAmount, borrowableDecimals),
    baseTokenDisplayDecimals
  );

  const prepaidDurationYears =
    maxPrepaidFeePercentBps > 0
      ? (prepaidFeePercent / maxPrepaidFeePercentBps) * LOAN_LIQUIDATION_YEARS
      : 0;
  const hasFullPrepayCoverage = prepaidDurationYears >= LOAN_LIQUIDATION_YEARS;
  const prepaidFeeAmount =
    (grossBorrowableAmount * BigInt(prepaidFeePercent)) / FEE_BPS_DENOMINATOR;
  const variableFeeAtYear10 = hasFullPrepayCoverage ? 0n : grossBorrowableAmount - prepaidFeeAmount;
  const maxRepayAmount = grossBorrowableAmount + variableFeeAtYear10;
  const maxRepayDisplay = formatDisplay(
    formatUnits(maxRepayAmount, borrowableDecimals),
    baseTokenDisplayDecimals
  );

  const collateralDisplay = collateralAmount ? formatDisplay(collateralAmount) : "0";
  const repayWindowLabel = formatRepayWindow(repayYears);
  const prepaidPercentLabel = formatPercentValue(prepaidFeePercent / 10);
  const revFeePercentLabel = formatPercentValue(Number(revFeeBps) / 10);
  const feeWindowNote =
    repayYears >= LOAN_LIQUIDATION_YEARS
      ? `Fees stay flat for ${LOAN_LIQUIDATION_YEARS} years.`
      : `Paying within ${repayWindowLabel} keeps fees flat. After that they rise until year ${LOAN_LIQUIDATION_YEARS}.`;

  return {
    borrowDisplay,
    principalDisplay,
    upfrontFeeDisplay,
    maxRepayDisplay,
    collateralDisplay,
    repayWindowLabel,
    prepaidPercentLabel,
    revFeePercentLabel,
    feeWindowNote,
    hasFullPrepayCoverage,
  };
};
