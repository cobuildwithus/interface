import { describe, expect, it } from "vitest";
import { insertMentions, insertMentionsFromProfiles, parseMentionProfiles } from "./mentions";

const encoder = new TextEncoder();
const bytes = (value: string) => encoder.encode(value).length;

describe("insertMentions", () => {
  it("returns original text when positions or profiles are empty", () => {
    expect(insertMentions("hello", [], [{ fid: 1, username: "alice" }])).toBe("hello");
    expect(insertMentions("hello", [1], [])).toBe("hello");
  });

  it("returns original text when positions and profiles length mismatch", () => {
    expect(
      insertMentions(
        "hello",
        [1],
        [
          { fid: 1, username: "alice" },
          { fid: 2, username: "bob" },
        ]
      )
    ).toBe("hello");
  });

  it("inserts a single mention at the byte position", () => {
    const text = "hello  world";
    const result = insertMentions(text, [bytes("hello ")], [{ fid: 1, username: "alice" }]);
    expect(result).toBe("hello @alice world");
  });

  it("handles multiple mentions in any order", () => {
    const text = "hi  and  !";
    const positions = [bytes("hi "), bytes("hi  and ")];
    const profiles = [
      { fid: 1, username: "alice" },
      { fid: 2, username: "bob" },
    ];

    const result = insertMentions(text, positions, profiles);
    expect(result).toBe("hi @alice and @bob !");
  });

  it("skips invalid positions and missing usernames", () => {
    const text = "hello world";
    const result = insertMentions(
      text,
      [-1, 999, 1],
      [
        { fid: 1, username: "alice" },
        { fid: 2, username: "bob" },
        { fid: 3, username: null },
      ]
    );

    expect(result).toBe(text);
  });

  it("respects byte offsets with unicode", () => {
    const text = "hi 😊  world";
    const position = bytes("hi 😊 ");
    const result = insertMentions(text, [position], [{ fid: 1, username: "alice" }]);
    expect(result).toBe("hi 😊 @alice world");
  });
});

describe("parseMentionProfiles", () => {
  it("parses valid entries and ignores invalid ones", () => {
    const result = parseMentionProfiles([
      { fid: 1, fname: "alice" },
      { fid: " 2 ", fname: null },
      { fid: 3n, fname: 123 },
      { fid: "", fname: "bad" },
      { foo: "bar" },
      null,
    ]);

    expect(result).toEqual([
      { fid: 1, username: "alice" },
      { fid: 2, username: null },
      { fid: 3, username: null },
    ]);
  });

  it("returns empty array for non-array input", () => {
    expect(parseMentionProfiles(null)).toEqual([]);
    expect(parseMentionProfiles(undefined)).toEqual([]);
  });
});

describe("insertMentionsFromProfiles", () => {
  it("returns empty string when text is null and positions missing", () => {
    expect(insertMentionsFromProfiles(null, null, [])).toBe("");
  });

  it("returns original text when positions are empty", () => {
    expect(insertMentionsFromProfiles("hello", [], [])).toBe("hello");
  });

  it("returns original text when mention profiles are invalid", () => {
    expect(insertMentionsFromProfiles("hello", [1], null)).toBe("hello");
  });

  it("inserts mentions when profiles and positions are provided", () => {
    const text = "hey  there";
    const positions = [bytes("hey ")];
    const profiles = [{ fid: 1, fname: "alice" }];

    const result = insertMentionsFromProfiles(text, positions, profiles);
    expect(result).toBe("hey @alice there");
  });
});
