import { describe, expect, it } from "vitest";

import { formatRulesCheckError, parseHttpErrorJsonObject } from "./http-error-json";

describe("formatRulesCheckError", () => {
  it("returns a friendly message for 429s", () => {
    const error = Object.assign(new Error("Too Many Requests"), { status: 429 });
    expect(formatRulesCheckError(error, { defaultMessage: "fallback" })).toBe(
      "Verification is still running. Try again in a few seconds."
    );
  });

  it("returns a friendly message for timeouts", () => {
    const error = Object.assign(new Error("Request timed out"), { status: 408 });
    expect(formatRulesCheckError(error, { defaultMessage: "fallback" })).toBe(
      "Verification is taking longer than expected. Try again shortly."
    );
  });

  it("extracts reason from HTTP JSON payloads", () => {
    const error = Object.assign(
      new Error(
        `HTTP 500: ${JSON.stringify({ code: "internal_error", reason: "Internal error." })}`
      ),
      { status: 500 }
    );
    expect(formatRulesCheckError(error, { defaultMessage: "fallback" })).toBe("Internal error.");
  });

  it("extracts message from HTTP JSON payloads", () => {
    const error = Object.assign(
      new Error(
        `HTTP 400: ${JSON.stringify({ error: "invalid_input", message: "Missing postRef." })}`
      ),
      { status: 400 }
    );
    expect(formatRulesCheckError(error, { defaultMessage: "fallback" })).toBe("Missing postRef.");
  });

  it("extracts the first message from errors arrays", () => {
    const error = Object.assign(
      new Error(`HTTP 500: ${JSON.stringify({ errors: [{ message: "Nope" }] })}`),
      { status: 500 }
    );
    expect(formatRulesCheckError(error, { defaultMessage: "fallback" })).toBe("Nope");
  });

  it("falls back to a generic message when no details are available", () => {
    const error = Object.assign(new Error(`HTTP 500: ${JSON.stringify({})}`), { status: 500 });
    expect(formatRulesCheckError(error, { defaultMessage: "fallback" })).toBe(
      "Something went wrong. Please try again."
    );
  });
});

describe("parseHttpErrorJsonObject", () => {
  it("returns null when status is missing or not 4xx", () => {
    expect(parseHttpErrorJsonObject(new Error("HTTP 400: {}"))).toBeNull();
    expect(
      parseHttpErrorJsonObject(Object.assign(new Error("HTTP 500: {}"), { status: 500 }))
    ).toBeNull();
  });

  it("parses JSON objects from 4xx errors", () => {
    const parsed = parseHttpErrorJsonObject(
      Object.assign(new Error(`HTTP 400: ${JSON.stringify({ message: "Missing" })}`), {
        status: 400,
      })
    );
    expect(parsed).toEqual({ message: "Missing" });
  });
});
