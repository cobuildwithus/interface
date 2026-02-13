import type { JsonRecord, JsonValue } from "@/lib/shared/json";

export type NeynarUser = {
  fid: number;
  username?: string;
  display_name?: string;
  pfp_url?: string;
  experimental?: {
    neynar_user_score?: number;
    [key: string]: JsonValue | undefined;
  };
  score?: number;
};

export type NeynarCastSummary = {
  hash: string;
  [key: string]: JsonValue;
};

export type NeynarCastMentionRange = {
  start?: number | null;
  end?: number | null;
};

export type NeynarCastMentionProfile = {
  fid?: number | null;
};

export type NeynarCastEmbedCastId = {
  fid?: number | null;
  hash?: string | null;
};

export type NeynarCastEmbed = {
  url?: string | null;
  cast_id?: NeynarCastEmbedCastId | null;
  cast?: {
    hash?: string | null;
    author?: { fid?: number | null } | null;
  } | null;
};

export type NeynarCast = {
  hash: string;
  text: string;
  timestamp: string;
  parent_hash: string | null;
  parent_url: string | null;
  parent_author?: { fid?: number | null } | null;
  root_parent_url: string | null;
  thread_hash: string | null;
  author: {
    fid: number;
  };
  embeds?: NeynarCastEmbed[] | null;
  mentioned_profiles?: NeynarCastMentionProfile[] | null;
  mentioned_profiles_ranges?: NeynarCastMentionRange[] | null;
  deleted_at?: string | null;
  deleted?: boolean | null;
};

export type FetchNeynarOptions = {
  timeoutMs?: number;
};

export type NeynarFreshFidPayload = {
  fid?: number;
};

export type NeynarCreateSignerPayload = {
  signer_uuid?: string;
  public_key?: string;
  permissions?: string[];
};

export type NeynarRegisterSignerPayload = {
  uuid: string;
  signed_key_request_metadata_signature: string;
  app_fid: number;
  deadline: number;
};

export type NeynarRegisterAccountPayload = {
  signature: string;
  fid: number;
  requested_user_custody_address: string;
  deadline: number;
  fname?: string;
  signer?: NeynarRegisterSignerPayload;
  metadata?: JsonRecord;
};

export type PublishCastInput = {
  signerUuid: string;
  text: string;
  parentHash?: string | null;
  parentAuthorFid?: number | null;
  idem?: string;
  embeds?: PublishCastEmbed[];
  timeoutMs?: number;
  retriesOn429?: number;
};

export type PublishCastEmbed =
  | {
      url: string;
    }
  | {
      cast_id: {
        hash: string;
        fid: number;
      };
    };

export type PublishCastPayload = {
  signer_uuid: string;
  text: string;
  parent?: string;
  parent_author_fid?: number;
  idem?: string;
  embeds?: PublishCastEmbed[];
};

export type PublishCastResponse = {
  success?: boolean;
  cast?: NeynarCastSummary;
};

export type PublishCastResult =
  | { ok: true; hash: string; cast: PublishCastResponse["cast"] }
  | { ok: false; error: string; status?: number };

export type DeleteCastInput = {
  signerUuid: string;
  castHash: string;
  timeoutMs?: number;
  retriesOn429?: number;
};

export type DeleteCastPayload = {
  signer_uuid: string;
  target_hash: string;
};

export type DeleteCastResponse = {
  success?: boolean;
  message?: string;
};

export type DeleteCastResult = { ok: true } | { ok: false; error: string; status?: number };

export type NeynarSignerStatusPayload = {
  status?: string;
  signer_permissions?: string[];
  signer_uuid?: string;
  result?: {
    status?: string;
    signer_permissions?: string[];
    signer_uuid?: string;
  };
};

export type NeynarSignerStatusResult =
  | { ok: true; status: string | null; permissions: string[] | null }
  | { ok: false; error: string; status?: number };

export type UpdateUserProfileInput = {
  signerUuid: string;
  displayName?: string | null;
  pfpUrl?: string | null;
};

export type UpdateUserProfileResult = { ok: true } | { ok: false; error: string; status?: number };

export type NeynarFreshFidResult = { ok: true; fid: number } | { ok: false; error: string };

export type NeynarCreateSignerResult =
  | { ok: true; signerUuid: string; publicKey: `0x${string}`; permissions: string[] | null }
  | { ok: false; error: string; status?: number };

export type NeynarRegisterAccountResult =
  | { ok: true }
  | { ok: false; error: string; status?: number };

export type ResolveCastResult = { ok: true; hash: string } | { ok: false; error: string };

export type NeynarCastFetchPayload = { cast?: NeynarCast | null };

export type NeynarCastFetchResult =
  | { ok: true; cast: NeynarCast }
  | { ok: false; error: string; status?: number; notFound?: boolean; deleted?: boolean };
