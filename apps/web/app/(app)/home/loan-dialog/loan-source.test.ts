import { describe, expect, it } from "vitest";
import type { RevnetAccountingContext, RevnetLoanSource } from "@cobuild/wire";
import { resolveLoanDialogBorrowableContext, resolveLoanDialogLoanSource } from "./loan-source";

const BASE_TOKEN = "0x1111111111111111111111111111111111111111";
const BASE_TERMINAL = "0x2222222222222222222222222222222222222222";
const ALT_TOKEN = "0x3333333333333333333333333333333333333333";
const ALT_TERMINAL = "0x4444444444444444444444444444444444444444";

const altLoanContext: RevnetAccountingContext = {
  token: ALT_TOKEN,
  decimals: 18,
  currency: 2,
};

describe("loan dialog loan-source helpers", () => {
  it("keeps an empty loan source list unavailable", () => {
    const selection = resolveLoanDialogLoanSource([], BASE_TOKEN);

    expect(selection.selectedLoanSource).toBeNull();
    expect(selection.loanSourceToken).toBeUndefined();
    expect(selection.loanSourceTerminal).toBeUndefined();
    expect(
      resolveLoanDialogBorrowableContext(selection.selectedLoanSource, altLoanContext)
    ).toBeNull();
  });

  it("preserves the selected loan-source terminal", () => {
    const loanSources: readonly RevnetLoanSource[] = [
      {
        token: BASE_TOKEN,
        terminal: BASE_TERMINAL,
      },
      {
        token: ALT_TOKEN,
        terminal: ALT_TERMINAL,
      },
    ];

    const selection = resolveLoanDialogLoanSource(loanSources, ALT_TOKEN);

    expect(selection.selectedLoanSource).toEqual({
      token: ALT_TOKEN,
      terminal: ALT_TERMINAL,
    });
    expect(selection.loanSourceTerminal).toBe(ALT_TERMINAL);
    expect(
      resolveLoanDialogBorrowableContext(selection.selectedLoanSource, altLoanContext)
    ).toEqual(altLoanContext);
  });

  it("keeps borrowable context unavailable until the selected source context resolves", () => {
    const selection = resolveLoanDialogLoanSource(
      [
        {
          token: ALT_TOKEN,
          terminal: ALT_TERMINAL,
        },
      ],
      ALT_TOKEN
    );

    expect(resolveLoanDialogBorrowableContext(selection.selectedLoanSource, null)).toBeNull();
  });
});
