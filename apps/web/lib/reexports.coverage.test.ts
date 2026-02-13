import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/db/cobuild-db-client", () => ({ default: {} }));
import * as castRules from "@/lib/domains/rules/cast-rules/actions";
import * as tweetRules from "@/lib/domains/rules/tweet-rules/actions";
import * as rounds from "@/lib/domains/rounds/rounds";
import * as roundSubmissions from "@/lib/domains/rounds/submissions";

describe("re-export modules", () => {
  it("loads re-exports", () => {
    expect(castRules).toBeTruthy();
    expect(tweetRules).toBeTruthy();
    expect(rounds).toBeTruthy();
    expect(roundSubmissions).toBeTruthy();
  });
});
