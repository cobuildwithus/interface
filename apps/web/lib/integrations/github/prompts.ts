import "server-only";

const DEFAULT_API_BASE_URL = "https://api.github.com";
const DEFAULT_WEB_BASE_URL = "https://github.com";
const DEFAULT_REVALIDATE_SECONDS = 900;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_REPO = "cobuildwithus/chat-api";
const DEFAULT_BRANCH = "main";
const DEFAULT_DIRECTORY = "src/ai/prompts";
const DEFAULT_FILES = ["about.ts", "manifesto.ts", "bill-of-rights.ts", "goal.ts"] as const;

export type GithubPromptFile = {
  name: string;
  path: string;
  content: string;
};

export type GithubPromptError = {
  file: string;
  error: string;
};

export type GithubPromptFetchResult = {
  files: GithubPromptFile[];
  errors: GithubPromptError[];
};

export type GithubPromptFetchOptions = {
  repo?: string;
  branch?: string;
  directory?: string;
  files?: string[];
  token?: string | null;
  revalidateSeconds?: number;
  timeoutMs?: number;
  apiBaseUrl?: string;
  fetcher?: typeof fetch;
};

type GithubRepoRef = {
  owner: string;
  name: string;
};

const SAFE_PATH_SEGMENT = /^[A-Za-z0-9._-]+$/;

function parseRepoSlug(repo: string): GithubRepoRef {
  const [owner, name, ...rest] = repo.split("/");
  if (!owner || !name || rest.length > 0) {
    throw new Error("Invalid GitHub repo slug");
  }
  if (!SAFE_PATH_SEGMENT.test(owner) || !SAFE_PATH_SEGMENT.test(name)) {
    throw new Error("Invalid GitHub repo slug");
  }
  return { owner, name };
}

function assertSafePath(path: string): void {
  const segments = path.split("/");
  if (segments.length === 0) throw new Error("Invalid path");
  for (const segment of segments) {
    if (!segment || !SAFE_PATH_SEGMENT.test(segment)) {
      throw new Error("Invalid path segment");
    }
  }
}

function encodePath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildContentsUrl({
  apiBaseUrl,
  repo,
  path,
  ref,
}: {
  apiBaseUrl: string;
  repo: GithubRepoRef;
  path: string;
  ref: string;
}): string {
  const encodedPath = encodePath(path);
  const encodedRef = encodeURIComponent(ref);
  return `${apiBaseUrl}/repos/${repo.owner}/${repo.name}/contents/${encodedPath}?ref=${encodedRef}`;
}

function buildGithubHeaders(token?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.raw",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "cobuild-site",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function getErrorMessage(error: import("@/lib/shared/errors").ErrorLike): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string") return message;
  }
  return "Unknown error";
}

export function extractFirstTemplateLiteral(source: string): string | null {
  const start = source.indexOf("`");
  if (start === -1) return null;

  let i = start + 1;
  let output = "";

  while (i < source.length) {
    const char = source[i];
    if (char === "`") {
      return output;
    }

    if (char === "\\") {
      const next = source[i + 1];
      if (next === undefined) {
        output += "\\";
        i += 1;
        continue;
      }

      switch (next) {
        case "n":
          output += "\n";
          break;
        case "r":
          output += "\r";
          break;
        case "t":
          output += "\t";
          break;
        case "`":
          output += "`";
          break;
        case "\\":
          output += "\\";
          break;
        default:
          output += next;
          break;
      }

      i += 2;
      continue;
    }

    if (char === "$" && source[i + 1] === "{") {
      return null;
    }

    output += char;
    i += 1;
  }

  return null;
}

export function buildGithubPromptEditUrl({
  repo,
  branch,
  directory,
  file,
  webBaseUrl = DEFAULT_WEB_BASE_URL,
}: {
  repo: string;
  branch: string;
  directory: string;
  file: string;
  webBaseUrl?: string;
}): string {
  const parsedRepo = parseRepoSlug(repo);
  assertSafePath(directory);
  assertSafePath(file);

  const encodedBranch = encodeURIComponent(branch);
  const encodedDirectory = encodePath(directory);
  const encodedFile = encodeURIComponent(file);

  return `${webBaseUrl}/${parsedRepo.owner}/${parsedRepo.name}/edit/${encodedBranch}/${encodedDirectory}/${encodedFile}`;
}

export function buildGithubPromptDirectoryUrl({
  repo,
  branch,
  directory,
  webBaseUrl = DEFAULT_WEB_BASE_URL,
}: {
  repo: string;
  branch: string;
  directory: string;
  webBaseUrl?: string;
}): string {
  const parsedRepo = parseRepoSlug(repo);
  assertSafePath(directory);

  const encodedBranch = encodeURIComponent(branch);
  const encodedDirectory = encodePath(directory);

  return `${webBaseUrl}/${parsedRepo.owner}/${parsedRepo.name}/tree/${encodedBranch}/${encodedDirectory}`;
}

async function fetchPromptFile({
  repo,
  directory,
  branch,
  file,
  token,
  revalidateSeconds,
  timeoutMs,
  apiBaseUrl,
  fetcher,
}: {
  repo: GithubRepoRef;
  directory: string;
  branch: string;
  file: string;
  token?: string | null;
  revalidateSeconds: number;
  timeoutMs: number;
  apiBaseUrl: string;
  fetcher: typeof fetch;
}): Promise<GithubPromptFile> {
  assertSafePath(directory);
  assertSafePath(file);

  const path = `${directory}/${file}`;
  const url = buildContentsUrl({
    apiBaseUrl,
    repo,
    path,
    ref: branch,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(url, {
      headers: buildGithubHeaders(token),
      cache: "force-cache",
      next: { revalidate: revalidateSeconds },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`GitHub prompt fetch failed (${file}): ${response.status}`);
    }

    const raw = await response.text();
    const extracted = extractFirstTemplateLiteral(raw);
    if (!extracted) {
      throw new Error(`GitHub prompt parse failed (${file}): no static template literal found`);
    }

    return {
      name: file,
      path,
      content: extracted.trim(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchGithubPromptFiles(
  options: GithubPromptFetchOptions = {}
): Promise<GithubPromptFetchResult> {
  const repoSlug = options.repo ?? process.env.GITHUB_PROMPTS_REPO ?? DEFAULT_REPO;
  const branch = options.branch ?? process.env.GITHUB_PROMPTS_BRANCH ?? DEFAULT_BRANCH;
  const directory = options.directory ?? process.env.GITHUB_PROMPTS_DIRECTORY ?? DEFAULT_DIRECTORY;
  const files = options.files ?? Array.from(DEFAULT_FILES);
  const token = options.token ?? process.env.GITHUB_PROMPTS_TOKEN ?? null;
  const envRevalidateRaw = process.env.GITHUB_PROMPTS_REVALIDATE_SECONDS;
  const envRevalidateParsed =
    envRevalidateRaw && envRevalidateRaw.trim().length > 0
      ? Number.parseInt(envRevalidateRaw, 10)
      : Number.NaN;
  const revalidateSeconds = Math.max(
    30,
    options.revalidateSeconds ??
      (Number.isFinite(envRevalidateParsed) ? envRevalidateParsed : DEFAULT_REVALIDATE_SECONDS)
  );
  const timeoutMs = Math.max(1000, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL;
  const fetcher = options.fetcher ?? fetch;

  if (files.length === 0) {
    return { files: [], errors: [{ file: "*", error: "No files specified" }] };
  }

  const repo = parseRepoSlug(repoSlug);

  const results = await Promise.allSettled(
    files.map((file) =>
      fetchPromptFile({
        repo,
        directory,
        branch,
        file,
        token,
        revalidateSeconds,
        timeoutMs,
        apiBaseUrl,
        fetcher,
      })
    )
  );

  const filesResult: GithubPromptFile[] = [];
  const errors: GithubPromptError[] = [];

  results.forEach((result, index) => {
    const file = files[index] ?? "unknown";
    if (result.status === "fulfilled") {
      filesResult.push(result.value);
    } else {
      errors.push({ file, error: getErrorMessage(result.reason) });
    }
  });

  return { files: filesResult, errors };
}
