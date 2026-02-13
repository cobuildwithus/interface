import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { queryWhiskGraphQL } from "@/lib/integrations/whisk/client";
import { getProfileFromWhisk, getProfilesFromWhisk } from "@/lib/integrations/whisk/profile";

const ADDRESS = "0x" + "a".repeat(40);

vi.mock("server-only", () => ({}));

describe("whisk client", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns null and warns once when api key missing", async () => {
    delete process.env.WHISK_API_KEY;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const first = await queryWhiskGraphQL("query");
    const second = await queryWhiskGraphQL("query");

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("throws on non-ok response", async () => {
    process.env.WHISK_API_KEY = "key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(queryWhiskGraphQL("query")).rejects.toThrow("Whisk request failed: 500");
  });

  it("throws on graphql errors", async () => {
    process.env.WHISK_API_KEY = "key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => ({ errors: [{ message: "boom" }] }) })
    );

    await expect(queryWhiskGraphQL("query")).rejects.toThrow("Whisk errors: boom");
  });

  it("returns data on success", async () => {
    process.env.WHISK_API_KEY = "key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => ({ data: { ok: true } }) })
    );

    await expect(queryWhiskGraphQL<{ ok: boolean }>("query")).resolves.toEqual({ ok: true });
  });
});

describe("whisk profile", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns profile from whisk data", async () => {
    const queryMock = vi
      .spyOn(await import("@/lib/integrations/whisk/client"), "queryWhiskGraphQL")
      .mockResolvedValue({
        identity: {
          aggregate: { name: "Agg", avatar: "a", bio: "b" },
          farcaster: { name: "FC", avatar: "f", bio: "fb" },
        },
      });

    const profile = await getProfileFromWhisk(ADDRESS);
    expect(profile?.name).toBe("FC");
    expect(profile?.url).toBe("https://farcaster.xyz/FC");
    expect(queryMock).toHaveBeenCalled();
  });

  it("returns null on whisk errors", async () => {
    vi.spyOn(
      await import("@/lib/integrations/whisk/client"),
      "queryWhiskGraphQL"
    ).mockRejectedValue(new Error("boom"));

    await expect(getProfileFromWhisk(ADDRESS)).resolves.toBeNull();
  });

  it("returns null when whisk has no data", async () => {
    vi.spyOn(
      await import("@/lib/integrations/whisk/client"),
      "queryWhiskGraphQL"
    ).mockResolvedValue(null);
    await expect(getProfileFromWhisk(ADDRESS)).resolves.toBeNull();
  });

  it("returns profiles list and handles empty input", async () => {
    const queryMock = vi
      .spyOn(await import("@/lib/integrations/whisk/client"), "queryWhiskGraphQL")
      .mockResolvedValue({
        identities: [
          { aggregate: { name: "Agg" }, farcaster: { name: "FC" } },
          { aggregate: { name: "Agg2" }, farcaster: { name: "" } },
        ],
      });

    const profiles = await getProfilesFromWhisk([ADDRESS, "0x" + "b".repeat(40)]);
    expect(profiles?.length).toBe(2);
    expect(queryMock).toHaveBeenCalled();

    const empty = await getProfilesFromWhisk([]);
    expect(empty).toEqual([]);
  });

  it("returns null when whisk profiles missing", async () => {
    vi.spyOn(
      await import("@/lib/integrations/whisk/client"),
      "queryWhiskGraphQL"
    ).mockResolvedValue(null);
    await expect(getProfilesFromWhisk([ADDRESS])).resolves.toBeNull();
  });
});
