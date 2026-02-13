import type { Bubble } from "../bubble-flow";
import type { InteractionType } from "../social-post";

export type BubbleKind = "engage" | "token" | "content" | "energy";

export type LiveBubble = Bubble & {
  bornAt: number;
  duration: number;
  arrived?: boolean;
  onArrive?: () => void;
};

export type Burst = {
  type: InteractionType;
  remaining: number;
  interval: number;
  nextAt: number;
  endAt: number;
};

export type ScheduledEvent = { at: number; run: (now: number) => void };
export type InteractionQueueItem = { type: InteractionType; bubbles: number; bump: number };
