import type { CreateRoundFormData } from "./types";

export const STEPS = [
  { id: 1, label: "Basics" },
  { id: 2, label: "Rules" },
  { id: 3, label: "Settings" },
] as const;

export const INITIAL_DATA: CreateRoundFormData = {
  title: "",
  prompt: "",
  description: "",
  castTemplate: "",
  clausesDraft: { farcaster: [], x: [] },
  requirementsText: "",
  perUserLimit: 1,
  status: "open",
  variant: "default",
  startAt: undefined,
  endAt: undefined,
};

export const REQUIRED_FIELDS = {
  title: "Please enter a title for your round.",
  description: "Please enter a description.",
  prompt: "Please enter a prompt for duels.",
  requirementsText: "Please enter requirements text.",
} as const;
