import { beforeEach, describe, expect, it, vi } from "vitest";

const findDuplicateClauseTypesMock = vi.fn();

const farcasterNormalizeItemsMock = vi.fn((items: string[]) =>
  items.map((item) => item.toLowerCase())
);
const farcasterBuildMock = vi.fn((items: string[]) => ({
  type: "mentionsAll",
  usernames: items,
}));
const xBuildMock = vi.fn((items: string[]) => ({
  type: "embedUrlPattern",
  patterns: items,
}));
const xNormalizeToEmptyMock = vi.fn(() => [] as string[]);
const xBuildEmptyMock = vi.fn((items: string[]) => ({
  type: "mentionsAll",
  usernames: items,
}));

vi.mock("@/lib/domains/rules/rules/unique-clause-types", () => ({
  findDuplicateClauseTypes: (...args: Parameters<typeof findDuplicateClauseTypesMock>) =>
    findDuplicateClauseTypesMock(...args),
}));

vi.mock("@/lib/domains/rules/rules/platforms/registry", () => ({
  FARCASTER_CLAUSE_DEFINITIONS: [
    {
      type: "mentionsAll",
      label: "Mention",
      buttonLabel: "Add mention",
      description: "Require tagged handles",
      placeholder: "@alice",
      helpText: "Tag at least one handle.",
      normalizeItems: (...args: Parameters<typeof farcasterNormalizeItemsMock>) =>
        farcasterNormalizeItemsMock(...args),
      build: (...args: Parameters<typeof farcasterBuildMock>) => farcasterBuildMock(...args),
    },
  ],
  X_CLAUSE_DEFINITIONS: [
    {
      type: "embedUrlPattern",
      label: "Link",
      buttonLabel: "Add link",
      description: "Require links",
      placeholder: "example.com",
      helpText: "Include at least one link.",
      build: (...args: Parameters<typeof xBuildMock>) => xBuildMock(...args),
    },
    {
      type: "mentionsAll",
      label: "Emptyable",
      buttonLabel: "Add emptyable",
      description: "Normalizes to empty",
      placeholder: "none",
      helpText: "May normalize to empty.",
      normalizeItems: (...args: Parameters<typeof xNormalizeToEmptyMock>) =>
        xNormalizeToEmptyMock(...args),
      build: (...args: Parameters<typeof xBuildEmptyMock>) => xBuildEmptyMock(...args),
    },
  ],
}));

import {
  FARCASTER_CLAUSE_OPTIONS,
  FARCASTER_CLAUSE_SELECT_OPTIONS,
  RULES_PLATFORM_DRAFTS,
  X_CLAUSE_OPTIONS,
  X_CLAUSE_SELECT_OPTIONS,
  getClauseHelpText,
  serializeClausesDraft,
} from "./drafts";

describe("rules/core/drafts", () => {
  beforeEach(() => {
    findDuplicateClauseTypesMock.mockReset();
    findDuplicateClauseTypesMock.mockReturnValue([]);
    farcasterNormalizeItemsMock.mockClear();
    farcasterBuildMock.mockClear();
    xBuildMock.mockClear();
    xNormalizeToEmptyMock.mockClear();
    xBuildEmptyMock.mockClear();
  });

  it("builds options/select options from platform registry definitions", () => {
    expect(FARCASTER_CLAUSE_OPTIONS).toEqual([
      {
        value: "mentionsAll",
        label: "Add mention",
        description: "Require tagged handles",
        placeholder: "@alice",
      },
    ]);
    expect(X_CLAUSE_OPTIONS).toEqual([
      {
        value: "embedUrlPattern",
        label: "Add link",
        description: "Require links",
        placeholder: "example.com",
      },
      {
        value: "mentionsAll",
        label: "Add emptyable",
        description: "Normalizes to empty",
        placeholder: "none",
      },
    ]);
    expect(FARCASTER_CLAUSE_SELECT_OPTIONS).toEqual([{ value: "mentionsAll", label: "Mention" }]);
    expect(X_CLAUSE_SELECT_OPTIONS).toEqual([
      { value: "embedUrlPattern", label: "Link" },
      { value: "mentionsAll", label: "Emptyable" },
    ]);
    expect(RULES_PLATFORM_DRAFTS.farcaster.options).toBe(FARCASTER_CLAUSE_OPTIONS);
    expect(RULES_PLATFORM_DRAFTS.x.selectOptions).toBe(X_CLAUSE_SELECT_OPTIONS);
  });

  it("serializes valid drafts and splits values by comma/newline with trimming", () => {
    const result = serializeClausesDraft({
      farcaster: [{ id: "f1", type: "mentionsAll", raw: "  @Alice, @Bob \n@Carol  " }],
      x: [{ id: "x1", type: "embedUrlPattern", raw: "https://a.com\n https://b.com " }],
    });

    expect(result).toEqual({
      ok: true,
      value: {
        farcaster: [{ type: "mentionsAll", usernames: ["@alice", "@bob", "@carol"] }],
        x: [{ type: "embedUrlPattern", patterns: ["https://a.com", "https://b.com"] }],
      },
    });
    expect(farcasterNormalizeItemsMock).toHaveBeenCalledWith(["@Alice", "@Bob", "@Carol"]);
    expect(xBuildMock).toHaveBeenCalledWith(["https://a.com", "https://b.com"]);
  });

  it("returns duplicate clause errors for farcaster and short-circuits before x", () => {
    findDuplicateClauseTypesMock.mockReturnValueOnce([{ type: "mentionsAll", index: 1 }]);

    const result = serializeClausesDraft({
      farcaster: [
        { id: "f1", type: "mentionsAll", raw: "@alice" },
        { id: "f2", type: "mentionsAll", raw: "@bob" },
      ],
      x: [{ id: "x1", type: "embedUrlPattern", raw: "https://example.com" }],
    });

    expect(result).toEqual({
      ok: false,
      error:
        'Duplicate clause type "mentionsAll" for farcaster. Combine values into a single clause.',
    });
    expect(findDuplicateClauseTypesMock).toHaveBeenCalledTimes(1);
    expect(xBuildMock).not.toHaveBeenCalled();
  });

  it("returns unsupported clause errors when type is missing from the definition map", () => {
    const result = serializeClausesDraft({
      farcaster: [{ id: "f1", type: "unknown" as "mentionsAll", raw: "x" }],
      x: [],
    });

    expect(result).toEqual({
      ok: false,
      error: 'Unsupported clause type "unknown" for farcaster.',
    });
  });

  it("returns an error when a clause has no values after splitting", () => {
    const result = serializeClausesDraft({
      farcaster: [{ id: "f1", type: "mentionsAll", raw: "  , \n " }],
      x: [],
    });

    expect(result).toEqual({
      ok: false,
      error: "Each clause must have at least one value.",
    });
    expect(farcasterNormalizeItemsMock).not.toHaveBeenCalled();
  });

  it("returns an error when normalizeItems removes all values", () => {
    const result = serializeClausesDraft({
      farcaster: [],
      x: [{ id: "x1", type: "mentionsAll", raw: "item" }],
    });

    expect(result).toEqual({
      ok: false,
      error: "Each clause must have at least one value.",
    });
    expect(xNormalizeToEmptyMock).toHaveBeenCalledWith(["item"]);
    expect(xBuildEmptyMock).not.toHaveBeenCalled();
  });

  it("returns configured help text per type with a generic fallback", () => {
    expect(getClauseHelpText("mentionsAll")).toBe("Tag at least one handle.");
    expect(getClauseHelpText("embedUrlPattern")).toBe("Include at least one link.");
    expect(getClauseHelpText("missing")).toBe("Enter one per line.");
  });
});
