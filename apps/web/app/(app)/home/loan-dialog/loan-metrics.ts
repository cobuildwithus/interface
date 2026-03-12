import { quoteRevnetLoan } from "@cobuild/wire";
import { formatUnits } from "viem";
import { LOAN_LIQUIDATION_YEARS } from "./constants";
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
  const loanQuote = quoteRevnetLoan({
    borrowableAmount: borrowableAmount ?? 0n,
    prepaidFeePercent: BigInt(prepaidFeePercent),
    revPrepaidFeePercent: revFeeBps,
    maxPrepaidFeePercent: BigInt(maxPrepaidFeePercentBps),
  });
  const grossBorrowableAmount = loanQuote.grossBorrowableAmount;
  const netBorrowableAmount = loanQuote.netBorrowableAmount;
  const upfrontFeeAmount = loanQuote.upfrontFeeAmount;

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

  const hasFullPrepayCoverage = loanQuote.hasFullPrepayCoverage;
  const maxRepayAmount = loanQuote.maxRepayAmount;
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
