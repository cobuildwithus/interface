import "server-only";

import { cache } from "react";
import {
  buildGithubPromptDirectoryUrl,
  buildGithubPromptEditUrl,
  fetchGithubPromptFiles,
} from "@/lib/integrations/github/prompts";
import { billOfRights, charter, manifesto, systemPrompt } from "@/lib/domains/content/content";

const COBUILD_PROMPT_FILE_MAP = {
  systemPrompt: "about.ts",
  manifesto: "manifesto.ts",
  billOfRights: "bill-of-rights.ts",
  charter: "goal.ts",
} as const;

type PromptKey = keyof typeof COBUILD_PROMPT_FILE_MAP;

export type CobuildPromptSources = Record<PromptKey, "github" | "local">;

export type CobuildPromptContent = {
  systemPrompt: string;
  manifesto: string;
  billOfRights: string;
  charter: string;
  sources: CobuildPromptSources;
  errors: { file: string; error: string }[];
};

let promptsWarningLogged = false;

const DEFAULT_REPO = "cobuildwithus/chat-api";
const DEFAULT_BRANCH = "main";
const DEFAULT_DIRECTORY = "src/ai/prompts";

function getPromptRepoConfig() {
  return {
    repo: process.env.GITHUB_PROMPTS_REPO ?? DEFAULT_REPO,
    branch: process.env.GITHUB_PROMPTS_BRANCH ?? DEFAULT_BRANCH,
    directory: process.env.GITHUB_PROMPTS_DIRECTORY ?? DEFAULT_DIRECTORY,
  };
}

export const getCobuildPromptContent = cache(async (): Promise<CobuildPromptContent> => {
  const fallback: Record<PromptKey, string> = {
    systemPrompt,
    manifesto,
    billOfRights,
    charter,
  };

  const { files, errors } = await fetchGithubPromptFiles({
    files: Object.values(COBUILD_PROMPT_FILE_MAP),
  });

  if (errors.length > 0 && !promptsWarningLogged) {
    promptsWarningLogged = true;
    console.warn(
      `[Prompts] Falling back to local content for: ${errors.map((error) => error.file).join(", ")}`
    );
  }

  const contentByName = new Map(files.map((file) => [file.name, file.content]));
  const entries = Object.entries(COBUILD_PROMPT_FILE_MAP) as [PromptKey, string][];

  const content = {} as Record<PromptKey, string>;
  const sources = {} as CobuildPromptSources;

  for (const [key, file] of entries) {
    const hasFile = contentByName.has(file);
    content[key] = contentByName.get(file) ?? fallback[key];
    sources[key] = hasFile ? "github" : "local";
  }

  return { ...content, sources, errors };
});

export const getCobuildPromptEditUrls = cache(() => {
  const { repo, branch, directory } = getPromptRepoConfig();
  const entries = Object.entries(COBUILD_PROMPT_FILE_MAP) as [PromptKey, string][];

  return entries.reduce(
    (acc, [key, file]) => {
      acc[key] = buildGithubPromptEditUrl({ repo, branch, directory, file });
      return acc;
    },
    {} as Record<PromptKey, string>
  );
});

export const getCobuildPromptDirectoryUrl = cache(() => {
  const { repo, branch, directory } = getPromptRepoConfig();
  return buildGithubPromptDirectoryUrl({ repo, branch, directory });
});

export { COBUILD_PROMPT_FILE_MAP };
