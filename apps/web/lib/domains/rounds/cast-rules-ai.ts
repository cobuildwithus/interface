import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

type RewriteRequirementsParams = {
  roundTitle: string | null;
  currentRequirements: string;
  moderatorNote: string;
  castText?: string | null;
};

const defaultApiKey = process.env.OPENAI_API_KEY;
const defaultOpenAIProvider = defaultApiKey ? createOpenAI({ apiKey: defaultApiKey }) : null;

export async function rewriteRequirementsText(params: RewriteRequirementsParams): Promise<string> {
  const { roundTitle, currentRequirements, moderatorNote, castText } = params;

  if (!defaultOpenAIProvider) {
    throw new Error("OpenAI API key is not configured.");
  }

  const safeCurrent =
    currentRequirements?.trim() || "No explicit requirements were previously provided.";
  const safeTitle = roundTitle?.trim() || "this funding round";
  const safeCastText = castText?.trim() || "Cast text not provided.";

  const systemPrompt = `You are the canonical editor of Farcaster cast-rule requirements. 
Your output becomes the exact requirementsText that powers deterministic clauses, embedding prototypes, and downstream LLM grading. 
Preserve every valid guardrail from the existing text unless the violation summary proves it unsafe, then add or refine guardrails so the violation would clearly fail. 
Write objective, testable sentences that speak directly to the caster, keep them concise (<=6 bullet lines), and never include meta commentary, explanations, or formatting other than "- " prefixed guardrails.`;

  const prompt = [
    `Funding round: ${safeTitle}.`,
    "Existing requirements:",
    '"""',
    safeCurrent,
    '"""',
    "Cast text under review:",
    '"""',
    safeCastText,
    '"""',
    "Violation to block going forward:",
    '"""',
    moderatorNote,
    '"""',
    "Rewrite the requirements so they: (1) restate every still-relevant guardrail with its original thresholds, (2) add or tighten the guardrail needed to stop the violation, and (3) merge overlapping lines instead of duplicating them.",
    'Output bullet sentences, each starting with "- " and phrased as "Cast must..." or "Cast must not...".',
    "Do not mention moderators, violations, summaries, enforcement, or yourself; return only the final bullet list.",
  ].join("\n");

  const response = await generateText({
    model: defaultOpenAIProvider("gpt-4.1"),
    system: systemPrompt,
    prompt,
  });

  const nextText = response.text.trim();
  if (!nextText) {
    throw new Error("AI returned an empty requirements update.");
  }
  return nextText;
}
