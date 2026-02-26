import "server-only";

import { unstable_cache } from "next/cache";
import { base } from "viem/chains";
import juiceboxDb from "@/lib/server/db/cobuild-db-client";
import {
  MAX_HORIZON_YEARS,
  PROJECT_ID,
  SECONDS_PER_YEAR,
} from "@/lib/domains/token/juicebox/issuance-terms/constants";
import type {
  IssuanceBaseTerms,
  IssuanceStage,
  IssuanceTerms,
  RawRuleset,
} from "@/lib/domains/token/juicebox/issuance-terms/types";
import {
  buildChartData,
  buildSummary,
  clamp,
  findActiveStageIndex,
  parseRuleset,
} from "@/lib/domains/token/juicebox/issuance-terms/utils";

export type {
  IssuanceBaseTerms,
  IssuancePoint,
  IssuanceStage,
  IssuanceSummary,
  IssuanceTerms,
} from "@/lib/domains/token/juicebox/issuance-terms/types";

async function fetchIssuanceTermsBase(): Promise<IssuanceBaseTerms> {
  const project = await juiceboxDb.juiceboxProject.findUniqueOrThrow({
    where: { chainId_projectId: { chainId: base.id, projectId: PROJECT_ID } },
    select: {
      suckerGroupId: true,
      accountingTokenSymbol: true,
      erc20Symbol: true,
    },
  });

  const rulesetWhere = project.suckerGroupId
    ? { suckerGroupId: project.suckerGroupId }
    : { chainId: base.id, projectId: PROJECT_ID };

  const rawRulesets = (await juiceboxDb.juiceboxRuleset.findMany({
    select: {
      chainId: true,
      projectId: true,
      rulesetId: true,
      start: true,
      duration: true,
      weight: true,
      weightCutPercent: true,
      reservedPercent: true,
      cashOutTaxRate: true,
    },
    where: rulesetWhere,
    orderBy: { start: "asc" },
  })) as RawRuleset[];

  const baseSymbol = project.accountingTokenSymbol;
  const tokenSymbol = project.erc20Symbol ?? "TOKEN";

  if (rawRulesets.length === 0) {
    return {
      baseSymbol,
      tokenSymbol,
      stages: [],
      chartData: [],
      chartStart: 0,
      chartEnd: 0,
    };
  }

  const allRulesets = rawRulesets.map(parseRuleset);
  const primaryRulesets = allRulesets.filter(
    (rule) => rule.chainId === base.id && rule.projectId === PROJECT_ID
  );
  const timelineRulesets = primaryRulesets.length > 0 ? primaryRulesets : allRulesets;

  const stages: IssuanceStage[] = timelineRulesets.map((rule, index) => {
    const next = timelineRulesets[index + 1];
    return {
      stage: index + 1,
      start: rule.start * 1000,
      end: next ? next.start * 1000 : null,
      duration: rule.duration,
      weight: rule.weight,
      weightCutPercent: clamp(rule.weightCutPercent, 0, 1),
      reservedPercent: rule.reservedPercent,
      cashOutTaxRate: rule.cashOutTaxRate,
    };
  });

  const chartStartSec = Math.floor(stages[0]!.start / 1000);
  const lastStage = stages[stages.length - 1]!;
  const lastEndSec = lastStage.end ? Math.floor(lastStage.end / 1000) : null;
  const lastStageStartSec = Math.floor(lastStage.start / 1000);
  const horizonSec = lastEndSec ?? lastStageStartSec + MAX_HORIZON_YEARS * SECONDS_PER_YEAR;

  const chartData = buildChartData(stages, horizonSec);

  return {
    baseSymbol,
    tokenSymbol,
    stages,
    chartData,
    chartStart: chartStartSec * 1000,
    chartEnd: horizonSec * 1000,
  };
}

async function fetchIssuanceTerms(): Promise<IssuanceTerms> {
  const baseTerms = await fetchIssuanceTermsBase();
  const now = Date.now();
  const nowSec = Math.floor(now / 1000);
  const activeStageIndex = findActiveStageIndex(baseTerms.stages, nowSec);
  const summary = buildSummary(baseTerms.stages, activeStageIndex, nowSec);

  return {
    ...baseTerms,
    now,
    activeStageIndex,
    summary,
  };
}

export const getIssuanceTermsBase = unstable_cache(
  fetchIssuanceTermsBase,
  ["issuance-terms-base-v1", String(PROJECT_ID)],
  { revalidate: 300 }
);

export const getIssuanceTerms = unstable_cache(
  fetchIssuanceTerms,
  ["issuance-terms-v1", String(PROJECT_ID)],
  { revalidate: 300 }
);
