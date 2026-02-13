import { describe, expect, it } from "vitest";

import { ID_REGISTRY_ABI, ID_REGISTRY_ADDRESS } from "./id-registry";

describe("id registry constants", () => {
  it("exports a valid address", () => {
    expect(ID_REGISTRY_ADDRESS).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it("includes nonces ABI", () => {
    expect(ID_REGISTRY_ABI[0]?.name).toBe("nonces");
  });
});
