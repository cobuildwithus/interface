import { COBUILD_JUICEBOX_PROJECT_ID } from "@/lib/domains/token/juicebox/constants";

export const PROJECT_ID = COBUILD_JUICEBOX_PROJECT_ID;

export const BUCKET_SIZE_MS = 6 * 60 * 60 * 1000;
export const WEIGHT_SCALE = 1e18;
export const WEIGHT_CUT_SCALE = 1e9;
export const RESERVED_SCALE = 10000;
export const MAX_TAX = 10000n;
export const WAD = 10n ** 18n;
export const WAD2 = WAD * WAD;
export const TOKEN_DECIMALS = 18;
