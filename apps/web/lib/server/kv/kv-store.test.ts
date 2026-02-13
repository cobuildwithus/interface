import { describe, expect, it, vi, beforeEach } from "vitest";

const { setMock, getMock, delMock } = vi.hoisted(() => ({
  setMock: vi.fn(),
  getMock: vi.fn(),
  delMock: vi.fn(),
}));

vi.mock("@vercel/kv", () => ({
  kv: {
    set: setMock,
    get: getMock,
    del: delMock,
  },
}));

vi.mock("./encryption", () => ({
  encryptJson: vi.fn(() => "encrypted"),
  decryptJson: vi.fn(() => ({ ok: true })),
}));

import { deleteItem, getDecryptedItem, saveEncryptedItem } from "./kv-store";

describe("kv-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves encrypted payloads", async () => {
    await saveEncryptedItem("key", { value: 1 });
    expect(setMock).toHaveBeenCalledWith("key", "encrypted");
  });

  it("returns null when missing", async () => {
    getMock.mockResolvedValueOnce(null);
    await expect(getDecryptedItem("missing")).resolves.toBeNull();
  });

  it("decrypts stored payloads", async () => {
    getMock.mockResolvedValueOnce("encrypted");
    await expect(getDecryptedItem("key")).resolves.toEqual({ ok: true });
  });

  it("deletes keys", async () => {
    await deleteItem("key");
    expect(delMock).toHaveBeenCalledWith("key");
  });
});
