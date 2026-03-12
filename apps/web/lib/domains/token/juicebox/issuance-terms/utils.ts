export {
  addRevnetIssuancePoint as addPoint,
  buildRevnetIssuanceChartData as buildChartData,
  buildRevnetIssuanceSummary as buildSummary,
  clampRevnetIssuanceValue as clamp,
  findActiveRevnetIssuanceStageIndex as findActiveStageIndex,
  parseRevnetRuleset as parseRuleset,
  weightAtRevnetTimestamp as weightAtTimestamp,
} from "@cobuild/wire";
import { toFiniteNumber, type Numberish } from "@/lib/shared/numbers";

export function toNumber(value: Numberish): number {
  return toFiniteNumber(value) ?? 0;
}
