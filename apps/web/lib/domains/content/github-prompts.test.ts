import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/integrations/github/prompts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/integrations/github/prompts")>();
  return {
    ...actual,
    fetchGithubPromptFiles: vi.fn(),
  };
});

const mockConsoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

beforeEach(() => {
  mockConsoleWarn.mockClear();
});

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterAll(() => {
  mockConsoleWarn.mockRestore();
});

describe("getCobuildPromptContent", () => {
  it("returns GitHub content when available", async () => {
    const { fetchGithubPromptFiles } = await import("@/lib/integrations/github/prompts");
    const { COBUILD_PROMPT_FILE_MAP, getCobuildPromptContent } =
      await import("@/lib/domains/content/github-prompts");

    (fetchGithubPromptFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
      files: [
        { name: COBUILD_PROMPT_FILE_MAP.systemPrompt, path: "x/about.ts", content: "About" },
        { name: COBUILD_PROMPT_FILE_MAP.manifesto, path: "x/manifesto.ts", content: "Manifesto" },
        {
          name: COBUILD_PROMPT_FILE_MAP.billOfRights,
          path: "x/bill-of-rights.ts",
          content: "Bill",
        },
        { name: COBUILD_PROMPT_FILE_MAP.charter, path: "x/goal.ts", content: "Charter" },
      ],
      errors: [],
    });

    const result = await getCobuildPromptContent();

    expect(result.systemPrompt).toBe("About");
    expect(result.manifesto).toBe("Manifesto");
    expect(result.billOfRights).toBe("Bill");
    expect(result.charter).toBe("Charter");
    expect(result.sources).toEqual({
      systemPrompt: "github",
      manifesto: "github",
      billOfRights: "github",
      charter: "github",
    });
    expect(result.errors).toEqual([]);
    expect(mockConsoleWarn).not.toHaveBeenCalled();
  });

  it("falls back to local content when GitHub data is missing", async () => {
    const { fetchGithubPromptFiles } = await import("@/lib/integrations/github/prompts");
    const { getCobuildPromptContent, COBUILD_PROMPT_FILE_MAP } =
      await import("@/lib/domains/content/github-prompts");
    const { manifesto, billOfRights, charter, systemPrompt } =
      await import("@/lib/domains/content/content");

    (fetchGithubPromptFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
      files: [{ name: COBUILD_PROMPT_FILE_MAP.manifesto, path: "x/manifesto.ts", content: "GH" }],
      errors: [{ file: COBUILD_PROMPT_FILE_MAP.systemPrompt, error: "fail" }],
    });

    const result = await getCobuildPromptContent();

    expect(result.manifesto).toBe("GH");
    expect(result.systemPrompt).toBe(systemPrompt);
    expect(result.billOfRights).toBe(billOfRights);
    expect(result.charter).toBe(charter);
    expect(result.sources).toEqual({
      systemPrompt: "local",
      manifesto: "github",
      billOfRights: "local",
      charter: "local",
    });
    expect(result.errors).toEqual([{ file: COBUILD_PROMPT_FILE_MAP.systemPrompt, error: "fail" }]);
    expect(mockConsoleWarn).toHaveBeenCalled();
  });

  it("builds edit urls from repo config", async () => {
    const originalEnv = {
      repo: process.env.GITHUB_PROMPTS_REPO,
      branch: process.env.GITHUB_PROMPTS_BRANCH,
      directory: process.env.GITHUB_PROMPTS_DIRECTORY,
    };

    process.env.GITHUB_PROMPTS_REPO = "owner/repo";
    process.env.GITHUB_PROMPTS_BRANCH = "feature/branch";
    process.env.GITHUB_PROMPTS_DIRECTORY = "src/ai/prompts";

    const { COBUILD_PROMPT_FILE_MAP, getCobuildPromptEditUrls } =
      await import("@/lib/domains/content/github-prompts");

    const urls = getCobuildPromptEditUrls();
    expect(urls.systemPrompt).toBe(
      `https://github.com/owner/repo/edit/feature%2Fbranch/src/ai/prompts/${COBUILD_PROMPT_FILE_MAP.systemPrompt}`
    );

    process.env.GITHUB_PROMPTS_REPO = originalEnv.repo;
    process.env.GITHUB_PROMPTS_BRANCH = originalEnv.branch;
    process.env.GITHUB_PROMPTS_DIRECTORY = originalEnv.directory;
  });
});
