export type GoalScope = {
  label: string;
  url: string;
};

export const RAISE_1M_GOAL_SCOPE: GoalScope = {
  label: "Raise $1M by June 30, 2026",
  url: "https://co.build/raise-1-mil",
};

const GOAL_SCOPES: GoalScope[] = [RAISE_1M_GOAL_SCOPE];

function normalizeGoalUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const normalized = `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
    return normalized || null;
  } catch {
    return null;
  }
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function resolveGoalScope(embedUrl: string | null | undefined): GoalScope | null {
  if (!embedUrl) return null;
  const normalized = normalizeGoalUrl(embedUrl);
  if (!normalized) return null;

  const known = GOAL_SCOPES.find((goal) => goal.url === normalized);
  if (known) return known;

  try {
    const url = new URL(normalized);
    const slug = url.pathname.split("/").filter(Boolean).pop() ?? "";
    const label = slug ? titleFromSlug(slug) : url.hostname;
    return { label, url: normalized };
  } catch {
    return null;
  }
}

export function buildCreatePostHref(goalScope?: GoalScope | null): string {
  if (!goalScope?.url) return "/create-post";
  const params = new URLSearchParams({ embedUrl: goalScope.url });
  return `/create-post?${params.toString()}`;
}
