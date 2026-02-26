import { describe, expect, it } from "vitest";
import { getBeneficiaryAddressFromMetadata } from "@/lib/domains/rounds/submission-metadata";

describe("getBeneficiaryAddressFromMetadata", () => {
  it("returns null for non-record metadata", () => {
    expect(getBeneficiaryAddressFromMetadata(null)).toBeNull();
    expect(getBeneficiaryAddressFromMetadata("not-an-object")).toBeNull();
  });

  it("returns null for missing or invalid addresses", () => {
    expect(getBeneficiaryAddressFromMetadata({})).toBeNull();
    expect(getBeneficiaryAddressFromMetadata({ beneficiaryAddress: "123" })).toBeNull();
  });

  it("returns the address when present", () => {
    expect(getBeneficiaryAddressFromMetadata({ beneficiaryAddress: "0xabc123" })).toBe("0xabc123");
  });
});
