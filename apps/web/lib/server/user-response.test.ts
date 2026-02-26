import { describe, expect, it, vi } from "vitest";

import type { Session } from "./session-types";

vi.mock("server-only", () => ({}));

import { getUserResponse } from "./user-response";

type SessionOverrides = Omit<Partial<Session>, "farcaster"> & {
  farcaster?: Partial<NonNullable<Session["farcaster"]>> | null;
};

const makeSession = (overrides: SessionOverrides = {}) =>
  ({ ...overrides }) as Partial<Session> as Session;

const baseSession = makeSession({
  address: "0xabc",
  farcaster: {
    fid: 123,
    username: "tester",
    displayName: "Tester",
    pfp: "https://pfp",
    neynarScore: 0.8,
  },
  twitter: {
    username: "tw",
    name: "Tw Name",
  },
});

describe("getUserResponse", () => {
  it("returns nulls when session empty", () => {
    const result = getUserResponse(makeSession());
    expect(result).toEqual({ address: null, farcaster: null, twitter: null });
  });

  it("maps session fields to response", () => {
    const result = getUserResponse(baseSession);
    expect(result).toEqual({
      address: "0xabc",
      farcaster: {
        fid: 123,
        username: "tester",
        displayName: "Tester",
        pfp: "https://pfp",
        neynarScore: 0.8,
      },
      twitter: {
        username: "tw",
        name: "Tw Name",
      },
    });
  });

  it("defaults optional farcaster fields to null", () => {
    const result = getUserResponse(
      makeSession({
        address: "0xabc",
        farcaster: { fid: 1 },
      })
    );
    expect(result.farcaster).toEqual({
      fid: 1,
      username: null,
      displayName: null,
      pfp: null,
      neynarScore: null,
    });
  });
});
