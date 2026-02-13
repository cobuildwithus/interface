export const BUDGETS = [
  {
    id: "protocol",
    name: "Protocol",
    description: "Core infrastructure and smart contracts",
  },
  {
    id: "opensource",
    name: "Open Source",
    description: "SDKs, libraries, and software",
  },
  {
    id: "creative",
    name: "Creative",
    description: "Artists, designers, and content",
  },
  {
    id: "fundraising",
    name: "Fundraising",
    description: "Growth and capital formation",
  },
  {
    id: "meetups",
    name: "Meetups",
    description: "IRL events and gatherings",
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Education and driving attention",
  },
] as const;

export type Budget = (typeof BUDGETS)[number];
