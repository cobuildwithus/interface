import React from "react";
import { describe, expect, it } from "vitest";

import { getRoundVariantConfig, ROUND_VARIANT_CONFIG } from "./round-variant-config";
import { RoundSubmissionsDefault } from "./round-submissions-default";
import { RoundSubmissionsIdeas } from "./round-submissions-ideas";
import { RoundSubmissionsMedia } from "./round-submissions-media";
import { IdeasViewFilter } from "./ideas-view-filter";
import { SortFilter } from "./sort-filter";
import {
  IdeasSkeletonList,
  MediaSkeletonGrid,
  PostCardSkeletonList,
} from "@/components/features/rounds/post-card-skeleton";

const baseProps = {
  submissions: [],
  intentStatsByEntityId: {},
  isAdmin: false,
  ruleId: 1,
  roundId: "1",
};

describe("round variant config", () => {
  it("returns the default config for missing variants", () => {
    expect(getRoundVariantConfig(undefined)).toBe(ROUND_VARIANT_CONFIG.default);
    expect(getRoundVariantConfig(null)).toBe(ROUND_VARIANT_CONFIG.default);
  });

  it("maps variants to the expected UI components", () => {
    const defaultConfig = getRoundVariantConfig("default");
    expect(defaultConfig.Filter).toBe(SortFilter);
    expect(defaultConfig.Skeleton).toBe(PostCardSkeletonList);
    expect(React.isValidElement(defaultConfig.renderSubmissions(baseProps))).toBe(true);
    expect((defaultConfig.renderSubmissions(baseProps) as React.ReactElement).type).toBe(
      RoundSubmissionsDefault
    );

    const ideasConfig = getRoundVariantConfig("ideas");
    expect(ideasConfig.Filter).toBe(IdeasViewFilter);
    expect(ideasConfig.Skeleton).toBe(IdeasSkeletonList);
    expect(React.isValidElement(ideasConfig.renderSubmissions(baseProps))).toBe(true);
    expect((ideasConfig.renderSubmissions(baseProps) as React.ReactElement).type).toBe(
      RoundSubmissionsIdeas
    );

    const mediaConfig = getRoundVariantConfig("media");
    expect(mediaConfig.Filter).toBe(SortFilter);
    expect(mediaConfig.Skeleton).toBe(MediaSkeletonGrid);
    expect(React.isValidElement(mediaConfig.renderSubmissions(baseProps))).toBe(true);
    expect((mediaConfig.renderSubmissions(baseProps) as React.ReactElement).type).toBe(
      RoundSubmissionsMedia
    );
  });
});
