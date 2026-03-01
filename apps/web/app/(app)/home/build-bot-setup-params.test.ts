import { describe, expect, it } from "vitest";
import { parseBuildBotSetupRequest } from "./build-bot-setup-params";

const VALID_STATE = "state123_state123_state123_state123";

function createParams(input: Record<string, string>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    params.set(key, value);
  }
  return params;
}

describe("parseBuildBotSetupRequest", () => {
  it("returns null when setup flag is absent", () => {
    const params = createParams({});
    expect(parseBuildBotSetupRequest(params)).toBeNull();
  });

  it("parses valid setup parameters", () => {
    const state = VALID_STATE;
    const params = createParams({
      buildBotSetup: "1",
      buildBotState: state,
      buildBotCallback: `http://127.0.0.1:4011/api/buildbot/cli/callback/${state}`,
      buildBotNetwork: "base-sepolia",
      buildBotAgent: "default",
    });

    expect(parseBuildBotSetupRequest(params)).toEqual({
      callbackUrl: `http://127.0.0.1:4011/api/buildbot/cli/callback/${state}`,
      state,
      network: "base-sepolia",
      agent: "default",
    });
  });

  it("rejects non-loopback callback URLs", () => {
    const state = VALID_STATE;
    const params = createParams({
      buildBotSetup: "1",
      buildBotState: state,
      buildBotCallback: `http://example.com:4011/api/buildbot/cli/callback/${state}`,
    });

    expect(parseBuildBotSetupRequest(params)).toBeNull();
  });

  it("rejects callback URLs with mismatched callback path state", () => {
    const state = VALID_STATE;
    const params = createParams({
      buildBotSetup: "1",
      buildBotState: state,
      buildBotCallback: "http://127.0.0.1:4011/api/buildbot/cli/callback/wrong_state",
    });

    expect(parseBuildBotSetupRequest(params)).toBeNull();
  });

  it.each([
    ["missing callback", { buildBotSetup: "1", buildBotState: VALID_STATE }],
    [
      "missing state",
      {
        buildBotSetup: "1",
        buildBotCallback: `http://127.0.0.1:4011/api/buildbot/cli/callback/${VALID_STATE}`,
      },
    ],
  ])("rejects setup request with %s", (_label, input) => {
    expect(parseBuildBotSetupRequest(createParams(input))).toBeNull();
  });

  it.each([
    ["malformed callback URL", "not-a-url"],
    ["https protocol", `https://127.0.0.1:4011/api/buildbot/cli/callback/${VALID_STATE}`],
    [
      "credentials in callback URL",
      `http://user:pass@127.0.0.1:4011/api/buildbot/cli/callback/${VALID_STATE}`,
    ],
    ["missing callback port", `http://127.0.0.1/api/buildbot/cli/callback/${VALID_STATE}`],
    [
      "query string in callback URL",
      `http://127.0.0.1:4011/api/buildbot/cli/callback/${VALID_STATE}?x=1`,
    ],
    [
      "hash fragment in callback URL",
      `http://127.0.0.1:4011/api/buildbot/cli/callback/${VALID_STATE}#x`,
    ],
    [
      "legacy build-bot callback prefix",
      `http://127.0.0.1:4011/api/build-bot/cli/callback/${VALID_STATE}`,
    ],
  ])("rejects callback URL with %s", (_label, callback) => {
    const params = createParams({
      buildBotSetup: "1",
      buildBotState: VALID_STATE,
      buildBotCallback: callback,
    });

    expect(parseBuildBotSetupRequest(params)).toBeNull();
  });

  it("rejects invalid setup states", () => {
    const params = createParams({
      buildBotSetup: "1",
      buildBotState: "too-short",
      buildBotCallback: "http://127.0.0.1:4011/api/buildbot/cli/callback/too-short",
    });

    expect(parseBuildBotSetupRequest(params)).toBeNull();
  });

  it("sanitizes optional network and agent values", () => {
    const params = createParams({
      buildBotSetup: "1",
      buildBotState: VALID_STATE,
      buildBotCallback: `http://127.0.0.1:4011/api/buildbot/cli/callback/${VALID_STATE}`,
      buildBotNetwork: "  base-sepolia ",
      buildBotAgent: " ../../evil ",
    });

    expect(parseBuildBotSetupRequest(params)).toEqual({
      callbackUrl: `http://127.0.0.1:4011/api/buildbot/cli/callback/${VALID_STATE}`,
      state: VALID_STATE,
      network: "base-sepolia",
      agent: null,
    });
  });

  it("treats blank optional network and agent values as null", () => {
    const params = createParams({
      buildBotSetup: "1",
      buildBotState: VALID_STATE,
      buildBotCallback: `http://127.0.0.1:4011/api/buildbot/cli/callback/${VALID_STATE}`,
      buildBotNetwork: "   ",
      buildBotAgent: " ",
    });

    expect(parseBuildBotSetupRequest(params)).toEqual({
      callbackUrl: `http://127.0.0.1:4011/api/buildbot/cli/callback/${VALID_STATE}`,
      state: VALID_STATE,
      network: null,
      agent: null,
    });
  });
});
