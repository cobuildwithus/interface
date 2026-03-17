/**
 * @vitest-environment happy-dom
 */
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WalletSwitchCard } from "./wallet-switch-card";

describe("WalletSwitchCard", () => {
  it("does not evaluate wallet hooks during server render", () => {
    expect(() =>
      renderToString(<WalletSwitchCard initialAddress={`0x${"1".repeat(40)}`} />)
    ).not.toThrow();
  });
});
