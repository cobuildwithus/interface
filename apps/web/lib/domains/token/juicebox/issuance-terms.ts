import "server-only";

import { buildRevnetIssuanceBaseTerms, buildRevnetIssuanceTerms } from "@cobuild/wire";
import { unstable_cache } from "next/cache";
import { base } from "viem/chains";
import juiceboxDb from "@/lib/server/db/cobuild-db-client";
import {
  MAX_HORIZON_YEARS,
  PROJECT_ID,
} from "@/lib/domains/token/juicebox/issuance-terms/constants";
import type {
  IssuanceBaseTerms,
  IssuanceTerms,
  RawRuleset,
} from "@/lib/domains/token/juicebox/issuance-terms/types";

export type {
  IssuanceBaseTerms,
  IssuancePoint,
  IssuanceStage,
  IssuanceSummary,
  IssuanceTerms,
} from "@/lib/domains/token/juicebox/issuance-terms/types";

async function fetchIssuanceProjectData() {
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

  const rawRulesets = await juiceboxDb.juiceboxRuleset.findMany({
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
  });

  const baseSymbol = project.accountingTokenSymbol;
  const tokenSymbol = project.erc20Symbol ?? "TOKEN";

  return {
    baseSymbol,
    tokenSymbol,
    rawRulesets: rawRulesets.map((ruleset) => ({
      ...ruleset,
      weight: ruleset.weight.toString(),
    })) as RawRuleset[],
  };
}

async function fetchIssuanceTermsBase(): Promise<IssuanceBaseTerms> {
  const { baseSymbol, tokenSymbol, rawRulesets } = await fetchIssuanceProjectData();

  return buildRevnetIssuanceBaseTerms({
    baseSymbol,
    tokenSymbol,
    rulesets: rawRulesets,
    chainId: base.id,
    projectId: PROJECT_ID,
    horizonYears: MAX_HORIZON_YEARS,
  }) as IssuanceBaseTerms;
}

async function fetchIssuanceTerms(): Promise<IssuanceTerms> {
  const { baseSymbol, tokenSymbol, rawRulesets } = await fetchIssuanceProjectData();
  return buildRevnetIssuanceTerms({
    baseSymbol,
    tokenSymbol,
    rulesets: rawRulesets,
    chainId: base.id,
    projectId: PROJECT_ID,
    horizonYears: MAX_HORIZON_YEARS,
  }) as IssuanceTerms;
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
