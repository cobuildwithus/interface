import type { PricePoint } from "../price-chart";
import type { WorkItem } from "../earn-section";
import type { BubbleKind } from "./types";
import { seededRandom } from "./utils";

export const BUBBLE_DURATION = 2500;
export const CLEANUP_BUFFER = 150;
export const LEG_GAP = 1000; // pause after a leg finishes before the next leg starts
export const LEG_DELAY = BUBBLE_DURATION + CLEANUP_BUFFER + LEG_GAP;
export const LEG_ORDER: BubbleKind[] = ["engage", "token", "energy", "content"];

export const INTERACTION_CONFIG = {
  like: {
    burstCount: () => Math.floor(Math.random() * 15) + 8,
    interval: 40,
    flash: 700,
    bump: 0.002,
    bubbles: 1,
  },
  comment: {
    burstCount: () => Math.floor(Math.random() * 4) + 2,
    interval: 60,
    flash: 500,
    bump: 0.003,
    bubbles: 2,
  },
  recast: {
    burstCount: () => Math.floor(Math.random() * 3) + 1,
    interval: 80,
    flash: 400,
    bump: 0.004,
    bubbles: 3,
  },
} as const;

export const WORK_TYPES = [
  "organize meetup",
  "teach workshop",
  "lead hike",
  "run open mic",
  "mentor student",
  "build app",
  "write newsletter",
  "clean beach",
  "plant trees",
];

export const WORKERS = [
  { name: "alice", task: "organized meetup", amount: 42 },
  { name: "bob", task: "wrote tutorial", amount: 28 },
  { name: "carol", task: "led workshop", amount: 65 },
  { name: "dave", task: "mentored 3 devs", amount: 89 },
  { name: "eve", task: "cleaned park", amount: 35 },
  { name: "frank", task: "ran open mic", amount: 51 },
  { name: "grace", task: "built demo app", amount: 120 },
  { name: "henry", task: "planted trees", amount: 44 },
];

export const INITIAL_ITEMS: WorkItem[] = WORKERS.slice(0, 4).map((worker, i) => ({
  id: i,
  ...worker,
  phase: "paid",
}));

export const INITIAL_COUNTS = {
  like: 42,
  comment: 8,
  recast: 12,
};

export const INITIAL_PRICE = 1.5;

export const INITIAL_HISTORY: PricePoint[] = Array.from({ length: 100 }, (_, i) => {
  const noise = (seededRandom(i) - 0.5) * 0.001;
  return { time: i, price: INITIAL_PRICE + noise };
});
