import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  extractFirstTemplateLiteral,
  fetchGithubPromptFiles,
} from "@/lib/integrations/github/prompts";
import {
  buildGithubPromptDirectoryUrl,
  buildGithubPromptEditUrl,
} from "@/lib/integrations/github/prompts";

const asFetch = (fn: (...args: Parameters<typeof fetch>) => Promise<Response>) =>
  fn as typeof fetch;

describe("github prompts", () => {
  it("extracts the first template literal", () => {
    const source = "export const value = `hello`;";
    expect(extractFirstTemplateLiteral(source)).toBe("hello");
  });

  it("decodes escaped characters", () => {
    const source = "`line1\\nline2`";
    expect(extractFirstTemplateLiteral(source)).toBe("line1\nline2");
  });

  it("returns null when encountering interpolation", () => {
    const source = "export const value = `hello ${name}`;";
    expect(extractFirstTemplateLiteral(source)).toBeNull();
  });

  it("returns null when no template literal is present", () => {
    const source = "export const value = 'hello';";
    expect(extractFirstTemplateLiteral(source)).toBeNull();
  });

  it("handles multiple escape sequences", () => {
    const source = "`line1\\nline2\\rline3\\tindent\\\\slash\\`tick\\x`";
    expect(extractFirstTemplateLiteral(source)).toBe("line1\nline2\rline3\tindent\\slash`tickx");
  });

  it("returns null for unterminated literals", () => {
    const source = "`unterminated";
    expect(extractFirstTemplateLiteral(source)).toBeNull();
  });

  it("fetches and parses prompt files", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.includes("one.ts")
        ? "export const one = async () => `One`;"
        : "export const two = async () => `Two`;";
      return {
        ok: true,
        status: 200,
        text: async () => body,
      } as Response;
    });

    const result = await fetchGithubPromptFiles({
      repo: "owner/repo",
      branch: "main",
      directory: "src/ai/prompts",
      files: ["one.ts", "two.ts"],
      fetcher: asFetch(fetcher),
    });

    expect(result.errors).toEqual([]);
    expect(result.files).toHaveLength(2);
    expect(result.files.map((file) => file.content)).toEqual(["One", "Two"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("returns an error when parsing fails", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => {
      return {
        ok: true,
        status: 200,
        text: async () => "export const bad = () => `hello ${name}`;",
      } as Response;
    });

    const result = await fetchGithubPromptFiles({
      repo: "owner/repo",
      directory: "src/ai/prompts",
      files: ["bad.ts"],
      fetcher: asFetch(fetcher),
    });

    expect(result.files).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.file).toBe("bad.ts");
  });

  it("returns an error when the response is not ok", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => {
      return {
        ok: false,
        status: 403,
        text: async () => "forbidden",
      } as Response;
    });

    const result = await fetchGithubPromptFiles({
      repo: "owner/repo",
      directory: "src/ai/prompts",
      files: ["forbidden.ts"],
      fetcher: asFetch(fetcher),
    });

    expect(result.files).toEqual([]);
    expect(result.errors[0]?.error).toContain("403");
  });

  it("propagates invalid path segment errors", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("should not reach fetch");
    });

    const result = await fetchGithubPromptFiles({
      repo: "owner/repo",
      directory: "src/ai/prompts",
      files: ["bad/../path?.ts"],
      fetcher: asFetch(fetcher),
    });

    expect(result.files).toEqual([]);
    expect(result.errors[0]?.error).toContain("Invalid path segment");
  });

  it("rejects invalid repo slugs", async () => {
    await expect(
      fetchGithubPromptFiles({
        repo: "bad-repo",
        directory: "src/ai/prompts",
        files: ["one.ts"],
        fetcher: asFetch(
          vi.fn(async () => {
            throw new Error("should not reach fetch");
          })
        ),
      })
    ).rejects.toThrow("Invalid GitHub repo slug");
  });

  it("rejects repo slugs with invalid characters", async () => {
    await expect(
      fetchGithubPromptFiles({
        repo: "owner/na*me",
        directory: "src/ai/prompts",
        files: ["one.ts"],
        fetcher: asFetch(
          vi.fn(async () => {
            throw new Error("should not reach fetch");
          })
        ),
      })
    ).rejects.toThrow("Invalid GitHub repo slug");
  });

  it("returns a descriptive error for empty file lists", async () => {
    const result = await fetchGithubPromptFiles({
      repo: "owner/repo",
      files: [],
      fetcher: asFetch(
        vi.fn(async () => {
          throw new Error("should not reach fetch");
        })
      ),
    });

    expect(result.files).toEqual([]);
    expect(result.errors).toEqual([{ file: "*", error: "No files specified" }]);
  });

  it("attaches auth headers when token is provided", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      return {
        ok: true,
        status: 200,
        text: async () => "export const one = async () => `One`;",
        init,
      } as Response & { init?: RequestInit };
    });

    await fetchGithubPromptFiles({
      repo: "owner/repo",
      directory: "src/ai/prompts",
      files: ["one.ts"],
      token: "secret",
      fetcher: asFetch(fetcher),
    });

    const init = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer secret");
  });

  it("handles fetcher-thrown string errors", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => {
      throw "boom";
    });

    const result = await fetchGithubPromptFiles({
      repo: "owner/repo",
      directory: "src/ai/prompts",
      files: ["one.ts"],
      fetcher: asFetch(fetcher),
    });

    expect(result.errors[0]?.error).toBe("boom");
  });

  it("reads revalidate seconds from env when provided", async () => {
    const originalEnv = process.env.GITHUB_PROMPTS_REVALIDATE_SECONDS;
    process.env.GITHUB_PROMPTS_REVALIDATE_SECONDS = "45";

    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      return {
        ok: true,
        status: 200,
        text: async () => "export const one = async () => `One`;",
        init,
      } as Response & { init?: RequestInit };
    });

    await fetchGithubPromptFiles({
      repo: "owner/repo",
      directory: "src/ai/prompts",
      files: ["one.ts"],
      fetcher: asFetch(fetcher),
    });

    const init = fetcher.mock.calls[0]?.[1] as { next?: { revalidate?: number } } | undefined;
    expect(init?.next?.revalidate).toBe(45);

    if (originalEnv === undefined) {
      delete process.env.GITHUB_PROMPTS_REVALIDATE_SECONDS;
    } else {
      process.env.GITHUB_PROMPTS_REVALIDATE_SECONDS = originalEnv;
    }
  });

  it("builds edit urls with encoded branch and path", () => {
    const url = buildGithubPromptEditUrl({
      repo: "owner/repo",
      branch: "feature/branch",
      directory: "src/ai/prompts",
      file: "goal.ts",
    });

    expect(url).toBe("https://github.com/owner/repo/edit/feature%2Fbranch/src/ai/prompts/goal.ts");
  });

  it("rejects invalid edit url inputs", () => {
    expect(() =>
      buildGithubPromptEditUrl({
        repo: "bad-repo",
        branch: "main",
        directory: "src/ai/prompts",
        file: "goal.ts",
      })
    ).toThrow("Invalid GitHub repo slug");
  });

  it("builds directory urls with encoded branch", () => {
    const url = buildGithubPromptDirectoryUrl({
      repo: "owner/repo",
      branch: "feature/branch",
      directory: "src/ai/prompts",
    });

    expect(url).toBe("https://github.com/owner/repo/tree/feature%2Fbranch/src/ai/prompts");
  });
});
