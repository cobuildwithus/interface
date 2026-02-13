"use client";

import type { ReactNode } from "react";
import type { ChatInputMessage } from "@/lib/domains/chat/input-message";
import type { JsonRecord } from "@/lib/shared/json";
import {
  BudgetPattern,
  CodePattern,
  DesignPattern,
  FeedbackPattern,
  GoalPattern,
  HowItWorksPattern,
  VideoPattern,
  VotePattern,
} from "./patterns";

export interface ActionCard {
  label: string;
  value: string;
  gradient: string;
  pattern?: ReactNode;
  isExplainer?: boolean;
  headerText?: string;
  description?: string;
  cta?: ActionCardCta;
  secondaryCta?: ActionCardCta;
}

export type ActionCardCta =
  | {
      kind: "link";
      label: string;
      href: string;
    }
  | {
      kind: "chat";
      label: string;
      chatData?: JsonRecord;
      message?: string | ChatInputMessage;
    };

export const cards: ActionCard[] = [
  {
    label: "The Goal",
    value: "We are raising $1M for $COBUILD by June 30, 2026",
    headerText: "Raise $1M by June 30, 2026",
    description:
      "Our current goal is to build a focused team to help Cobuild sell $1M in tokens by June 30, 2026 to prove the model works.",
    gradient: "from-indigo-500 via-purple-500 to-pink-500",
    isExplainer: true,
    cta: {
      kind: "chat",
      label: "Join team",
      chatData: {
        intent: "join-team",
        instructions:
          "Welcome briefly, then ask one question at a time. Keep it conversational and avoid lists. Start by asking about their top skills, then availability, then relevant experience.",
        source: "goal-action-card",
      },
      message: "Can you onboard me and ask about my skills?",
    },
    secondaryCta: {
      kind: "link",
      label: "Learn more",
      href: "/docs",
    },
    pattern: <GoalPattern />,
  },
  {
    label: "How it works",
    value: "AI-managed goals",
    headerText: "How Cobuild Works",
    description:
      "AI coordinates the goal, routes work to builders, and handles payouts. Discuss ideas, pick up work, and earn.",
    gradient: "from-orange-400 via-amber-500 to-yellow-500",
    isExplainer: true,
    cta: {
      kind: "chat",
      label: "Learn more",
      chatData: {
        intent: "learn-more",
        instructions:
          "Give a short, friendly overview in 2–3 sentences and then ask what they want to dive into. Avoid bullets unless they ask for them.",
        source: "goal-action-card",
      },
      message: "Can you give me the quick overview?",
    },
    secondaryCta: {
      kind: "link",
      label: "Join discussion",
      href: "/discussion",
    },
    pattern: <HowItWorksPattern />,
  },
  {
    label: "Code Contribution",
    value: "Ship a feature",
    headerText: "Build the Dashboard Analytics",
    description:
      "We need help implementing real-time charts for the contributor dashboard. TypeScript + React experience preferred. Estimated reward: 2,500 $COBUILD.",
    gradient: "from-cyan-500 via-blue-500 to-indigo-500",
    isExplainer: true,
    cta: {
      kind: "link",
      label: "View brief",
      href: "/allocate",
    },
    pattern: <CodePattern />,
  },
  {
    label: "Content",
    value: "Create a video",
    headerText: "Make a 60-Second Explainer",
    description:
      "Record a short video explaining what Cobuild is and how builders can earn. Post it on X or Farcaster. Perfect for creators who want to spread the word.",
    gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
    isExplainer: true,
    cta: {
      kind: "link",
      label: "Start creating",
      href: "/allocate",
    },
    pattern: <VideoPattern />,
  },
  {
    label: "Proposal",
    value: "Review budget",
    headerText: "New Marketing Budget Proposed",
    description:
      "A 50,000 $COBUILD allocation for Q1 influencer partnerships is up for community review. Share your thoughts on the spending priorities.",
    gradient: "from-emerald-500 via-green-500 to-teal-500",
    isExplainer: true,
    cta: {
      kind: "link",
      label: "View proposal",
      href: "/discussion",
    },
    pattern: <BudgetPattern />,
  },
  {
    label: "Design",
    value: "Improve the UI",
    headerText: "Redesign the Onboarding Flow",
    description:
      "Help new users understand Cobuild faster. We're looking for UX improvements to the sign-up and first-contribution experience. Figma or direct code welcome.",
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    isExplainer: true,
    cta: {
      kind: "link",
      label: "See details",
      href: "/allocate",
    },
    pattern: <DesignPattern />,
  },
  {
    label: "Feedback",
    value: "Share your input",
    headerText: "Test the New Swap Interface",
    description:
      "We shipped a new token swap flow and need real user feedback. Try it out and share what's confusing, broken, or could be better. Quick wins earn rewards.",
    gradient: "from-amber-500 via-orange-500 to-red-500",
    isExplainer: true,
    cta: {
      kind: "link",
      label: "Start testing",
      href: "/discussion",
    },
    pattern: <FeedbackPattern />,
  },
  {
    label: "Vote",
    value: "Cast your vote",
    headerText: "Decide on Grant Recipients",
    description:
      "Three builders applied for this week's grant round. Review their submissions and help decide who should receive funding. Your stake = your voice.",
    gradient: "from-sky-500 via-blue-500 to-indigo-500",
    isExplainer: true,
    cta: {
      kind: "link",
      label: "Vote now",
      href: "/discussion",
    },
    pattern: <VotePattern />,
  },
];
