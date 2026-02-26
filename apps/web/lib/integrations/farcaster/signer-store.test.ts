import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { saveEncryptedItem, getDecryptedItem, deleteItem } = vi.hoisted(() => ({
  saveEncryptedItem: vi.fn(),
  getDecryptedItem: vi.fn(),
  deleteItem: vi.fn(),
}));

vi.mock("@/lib/server/kv/kv-store", () => ({
  saveEncryptedItem,
  getDecryptedItem,
  deleteItem,
}));

import {
  deleteSignerRecord,
  getSignerKey,
  getSignerRecord,
  hasSignerRecord,
  setSignerRecord,
} from "./signer-store";

describe("signer-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds signer keys", () => {
    expect(getSignerKey(123)).toBe("neynar_signer:v1:123");
  });

  it("stores signer records", async () => {
    await setSignerRecord({ fid: 123, signerUuid: "uuid", signerPermissions: ["write_all"] });
    expect(saveEncryptedItem).toHaveBeenCalledWith(
      "neynar_signer:v1:123",
      expect.objectContaining({
        fid: 123,
        signerUuid: "uuid",
        signerPermissions: ["write_all"],
      })
    );
  });

  it("reads signer records", async () => {
    getDecryptedItem.mockResolvedValueOnce({ fid: 123 });
    await expect(getSignerRecord(123)).resolves.toEqual({ fid: 123 });
  });

  it("deletes signer records", async () => {
    await deleteSignerRecord(123);
    expect(deleteItem).toHaveBeenCalledWith("neynar_signer:v1:123");
  });

  it("detects signer presence", async () => {
    getDecryptedItem.mockResolvedValueOnce({ fid: 123 });
    await expect(hasSignerRecord(123)).resolves.toBe(true);
    getDecryptedItem.mockResolvedValueOnce(null);
    await expect(hasSignerRecord(456)).resolves.toBe(false);
  });
});
