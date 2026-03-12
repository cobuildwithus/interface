import {
  selectPreferredRevnetLoanSource,
  type RevnetAccountingContext,
  type RevnetLoanSource,
} from "@cobuild/wire";

export function resolveLoanDialogLoanSource(
  loanSources: readonly RevnetLoanSource[],
  preferredToken?: string
) {
  const selectedLoanSource = selectPreferredRevnetLoanSource(loanSources, preferredToken);

  return {
    selectedLoanSource,
    loanSourceToken: selectedLoanSource?.token,
    loanSourceTerminal: selectedLoanSource?.terminal,
  };
}

export function resolveLoanDialogBorrowableContext(
  selectedLoanSource: RevnetLoanSource | null,
  loanSourceAccountingContext?: RevnetAccountingContext | null
): RevnetAccountingContext | null {
  if (!selectedLoanSource) return null;
  return loanSourceAccountingContext ?? null;
}
