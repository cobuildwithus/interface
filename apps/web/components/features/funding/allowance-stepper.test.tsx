/**
 * @vitest-environment happy-dom
 */
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AllowanceStepper } from "./allowance-stepper";

describe("AllowanceStepper", () => {
  it("does not evaluate wallet hooks during server render", () => {
    expect(() =>
      renderToString(
        <AllowanceStepper
          initialAddress={`0x${"1".repeat(40)}`}
          initialUsdcBalance="1000000"
          initialBalanceUsd="1.00"
        />
      )
    ).not.toThrow();
  });
});
