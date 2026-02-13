import { describe, expect, it, vi, beforeEach } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";

vi.mock("server-only", () => ({}));

const submissionsMock = vi.fn();
const participantsMock = vi.fn();
const getSuckerGroupIdMock = vi.fn();

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    roundSubmission: {
      findMany: (...args: Parameters<typeof submissionsMock>) => submissionsMock(...args),
    },
    juiceboxParticipant: {
      findMany: (...args: Parameters<typeof participantsMock>) => participantsMock(...args),
    },
  },
}));

vi.mock("@/lib/domains/token/juicebox/project", () => ({
  getSuckerGroupId: () => getSuckerGroupIdMock(),
}));

const passthroughCache = vi.hoisted(
  () =>
    ((
      fn: Parameters<typeof unstableCache>[0],
      _keyParts?: Parameters<typeof unstableCache>[1],
      _options?: Parameters<typeof unstableCache>[2]
    ) => fn) as typeof unstableCache
);
vi.mock("next/cache", () => ({
  unstable_cache: passthroughCache,
}));

import { getUniqueMemberCount } from "@/lib/domains/token/juicebox/member-count";

describe("member-count", () => {
  beforeEach(() => {
    submissionsMock.mockReset();
    participantsMock.mockReset();
    getSuckerGroupIdMock.mockReset();
  });

  it("counts unique builders and holders", async () => {
    getSuckerGroupIdMock.mockResolvedValue("group-1");
    submissionsMock.mockResolvedValue([
      { metadata: { beneficiaryAddress: "0x" + "a".repeat(40) } },
      { metadata: { beneficiaryAddress: "0x" + "b".repeat(40) } },
      { metadata: { beneficiaryAddress: "0x" + "A".repeat(40) } },
      { metadata: { beneficiaryAddress: "not-an-address" } },
      { metadata: null },
    ]);
    participantsMock.mockResolvedValue([
      { address: "0x" + "c".repeat(40) },
      { address: "0x" + "a".repeat(40) },
    ]);

    const count = await getUniqueMemberCount();
    expect(count).toBe(3);
  });

  it("skips holders when no suckerGroupId", async () => {
    getSuckerGroupIdMock.mockResolvedValue(null);
    submissionsMock.mockResolvedValue([
      { metadata: { beneficiaryAddress: "0x" + "a".repeat(40) } },
    ]);

    const count = await getUniqueMemberCount();
    expect(count).toBe(1);
    expect(participantsMock).not.toHaveBeenCalled();
  });
});
