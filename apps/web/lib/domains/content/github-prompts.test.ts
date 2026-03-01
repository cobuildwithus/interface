import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/integrations/github/prompts", () => {
  return {
    fetchGithubPromptFiles: vi.fn(),
    buildGithubPromptEditUrl: vi.fn(),
    buildGithubPromptDirectoryUrl: vi.fn(),
  };
});

const mockConsoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
const originalPromptEnv = {
  repo: process.env.GITHUB_PROMPTS_REPO,
  branch: process.env.GITHUB_PROMPTS_BRANCH,
  directory: process.env.GITHUB_PROMPTS_DIRECTORY,
};

function setPromptEnvValue(
  key: "GITHUB_PROMPTS_REPO" | "GITHUB_PROMPTS_BRANCH" | "GITHUB_PROMPTS_DIRECTORY",
  value: string | undefined
) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

beforeEach(() => {
  mockConsoleWarn.mockClear();
});

afterEach(() => {
  setPromptEnvValue("GITHUB_PROMPTS_REPO", originalPromptEnv.repo);
  setPromptEnvValue("GITHUB_PROMPTS_BRANCH", originalPromptEnv.branch);
  setPromptEnvValue("GITHUB_PROMPTS_DIRECTORY", originalPromptEnv.directory);
  vi.resetModules();
  vi.clearAllMocks();
});

afterAll(() => {
  mockConsoleWarn.mockRestore();
});

describe("getCobuildPromptContent", () => {
  it("returns GitHub content, falls back for missing files, and marks sources", async () => {
    const { fetchGithubPromptFiles } = await import("@/lib/integrations/github/prompts");
    const { COBUILD_PROMPT_FILE_MAP, getCobuildPromptContent } =
      await import("@/lib/domains/content/github-prompts");
    const { manifesto, billOfRights } = await import("@/lib/domains/content/content");

    (fetchGithubPromptFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
      files: [
        { name: COBUILD_PROMPT_FILE_MAP.systemPrompt, path: "x/about.ts", content: "About" },
        { name: COBUILD_PROMPT_FILE_MAP.charter, path: "x/goal.ts", content: "Charter" },
      ],
      errors: [],
    });

    const result = await getCobuildPromptContent();
    const expectedFiles = Object.values(COBUILD_PROMPT_FILE_MAP);

    expect(fetchGithubPromptFiles).toHaveBeenCalledWith({ files: expectedFiles });
    expect(result.systemPrompt).toBe("About");
    expect(result.manifesto).toBe(manifesto);
    expect(result.billOfRights).toBe(billOfRights);
    expect(result.charter).toBe("Charter");
    expect(result.sources).toEqual({
      systemPrompt: "github",
      manifesto: "local",
      billOfRights: "local",
      charter: "github",
    });
    expect(result.errors).toEqual([]);
    expect(mockConsoleWarn).not.toHaveBeenCalled();
  });

  it("falls back to local content when GitHub data is missing", async () => {
    const { fetchGithubPromptFiles } = await import("@/lib/integrations/github/prompts");
    const { getCobuildPromptContent, COBUILD_PROMPT_FILE_MAP } =
      await import("@/lib/domains/content/github-prompts");
    const { billOfRights, charter, systemPrompt } = await import("@/lib/domains/content/content");

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

  it("warns once when multiple prompt files fail", async () => {
    const { fetchGithubPromptFiles } = await import("@/lib/integrations/github/prompts");
    const { getCobuildPromptContent, COBUILD_PROMPT_FILE_MAP } =
      await import("@/lib/domains/content/github-prompts");

    (fetchGithubPromptFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
      files: [],
      errors: [
        { file: COBUILD_PROMPT_FILE_MAP.systemPrompt, error: "missing" },
        { file: COBUILD_PROMPT_FILE_MAP.manifesto, error: "missing" },
      ],
    });

    await getCobuildPromptContent();

    expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
    expect(mockConsoleWarn.mock.calls[0]?.[0]).toContain(
      `${COBUILD_PROMPT_FILE_MAP.systemPrompt}, ${COBUILD_PROMPT_FILE_MAP.manifesto}`
    );
  });
});

describe("prompt URL helpers", () => {
  it("builds edit urls with default repo config", async () => {
    delete process.env.GITHUB_PROMPTS_REPO;
    delete process.env.GITHUB_PROMPTS_BRANCH;
    delete process.env.GITHUB_PROMPTS_DIRECTORY;

    const { buildGithubPromptEditUrl } = await import("@/lib/integrations/github/prompts");
    const { COBUILD_PROMPT_FILE_MAP, getCobuildPromptEditUrls } =
      await import("@/lib/domains/content/github-prompts");

    (buildGithubPromptEditUrl as ReturnType<typeof vi.fn>).mockImplementation(
      ({ file }) => `edit:${file}`
    );

    const urls = getCobuildPromptEditUrls();

    expect(buildGithubPromptEditUrl).toHaveBeenCalledTimes(4);
    expect(buildGithubPromptEditUrl).toHaveBeenCalledWith({
      repo: "cobuildwithus/chat-api",
      branch: "main",
      directory: "src/ai/prompts",
      file: COBUILD_PROMPT_FILE_MAP.systemPrompt,
    });
    expect(buildGithubPromptEditUrl).toHaveBeenCalledWith({
      repo: "cobuildwithus/chat-api",
      branch: "main",
      directory: "src/ai/prompts",
      file: COBUILD_PROMPT_FILE_MAP.manifesto,
    });
    expect(buildGithubPromptEditUrl).toHaveBeenCalledWith({
      repo: "cobuildwithus/chat-api",
      branch: "main",
      directory: "src/ai/prompts",
      file: COBUILD_PROMPT_FILE_MAP.billOfRights,
    });
    expect(buildGithubPromptEditUrl).toHaveBeenCalledWith({
      repo: "cobuildwithus/chat-api",
      branch: "main",
      directory: "src/ai/prompts",
      file: COBUILD_PROMPT_FILE_MAP.charter,
    });
    expect(urls).toEqual({
      systemPrompt: `edit:${COBUILD_PROMPT_FILE_MAP.systemPrompt}`,
      manifesto: `edit:${COBUILD_PROMPT_FILE_MAP.manifesto}`,
      billOfRights: `edit:${COBUILD_PROMPT_FILE_MAP.billOfRights}`,
      charter: `edit:${COBUILD_PROMPT_FILE_MAP.charter}`,
    });
  });

  it("builds directory url using env overrides", async () => {
    process.env.GITHUB_PROMPTS_REPO = "owner/repo";
    process.env.GITHUB_PROMPTS_BRANCH = "feature/branch";
    process.env.GITHUB_PROMPTS_DIRECTORY = "custom/prompts";

    const { buildGithubPromptDirectoryUrl } = await import("@/lib/integrations/github/prompts");
    const { getCobuildPromptDirectoryUrl } = await import("@/lib/domains/content/github-prompts");

    (buildGithubPromptDirectoryUrl as ReturnType<typeof vi.fn>).mockReturnValue(
      "https://example.com/directory"
    );

    const url = getCobuildPromptDirectoryUrl();

    expect(buildGithubPromptDirectoryUrl).toHaveBeenCalledWith({
      repo: "owner/repo",
      branch: "feature/branch",
      directory: "custom/prompts",
    });
    expect(url).toBe("https://example.com/directory");
  });
});
