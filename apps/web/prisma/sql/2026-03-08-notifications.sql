CREATE TABLE IF NOT EXISTS cobuild.notifications (
  id BIGSERIAL PRIMARY KEY,
  recipient_wallet_address VARCHAR(42) NOT NULL,
  recipient_fid BIGINT,
  kind TEXT NOT NULL,
  reason TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_cast_hash BYTEA,
  root_cast_hash BYTEA,
  target_cast_hash BYTEA,
  actor_fid BIGINT,
  actor_wallet_address VARCHAR(42),
  event_at TIMESTAMPTZ NOT NULL,
  invalidated_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notifications_wallet_source_uidx UNIQUE (
    recipient_wallet_address,
    source_type,
    source_id
  )
);

CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON cobuild.notifications (recipient_wallet_address, created_at DESC, id DESC)
  WHERE invalidated_at IS NULL;

CREATE INDEX IF NOT EXISTS notifications_recipient_event_idx
  ON cobuild.notifications (recipient_wallet_address, event_at DESC, id DESC)
  WHERE invalidated_at IS NULL;

CREATE INDEX IF NOT EXISTS notifications_source_cast_idx
  ON cobuild.notifications (source_cast_hash);

CREATE INDEX IF NOT EXISTS notifications_root_cast_idx
  ON cobuild.notifications (root_cast_hash);

CREATE INDEX IF NOT EXISTS notifications_actor_fid_idx
  ON cobuild.notifications (actor_fid);

CREATE TABLE IF NOT EXISTS cobuild.notification_state (
  owner_address VARCHAR(42) PRIMARY KEY,
  last_read_at TIMESTAMPTZ,
  last_read_notification_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cobuild.notification_state
  ADD COLUMN IF NOT EXISTS last_read_notification_id BIGINT;

CREATE OR REPLACE FUNCTION cobuild.notification_reason_priority(input_reason TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE input_reason
    WHEN 'mention' THEN 3
    WHEN 'reply_to_reply' THEN 2
    WHEN 'reply_to_root' THEN 1
    ELSE 0
  END
$$;

CREATE OR REPLACE FUNCTION cobuild.cast_has_renderable_content(
  input_text TEXT,
  input_mentioned_fids BIGINT[],
  input_embed_summaries TEXT[],
  input_embeds_array JSONB
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    (
      input_text IS NOT NULL
      AND btrim(input_text) <> ''
    )
    OR COALESCE(array_length(input_mentioned_fids, 1), 0) > 0
    OR COALESCE(array_length(input_embed_summaries, 1), 0) > 0
    OR (
      input_embeds_array IS NOT NULL
      AND jsonb_path_exists(input_embeds_array, '$[*] ? (@.url != null)')
    )
$$;

CREATE OR REPLACE FUNCTION cobuild.materialize_discussion_notifications(source_hashes BYTEA[])
RETURNS INTEGER
LANGUAGE sql
AS $$
  WITH target_hashes AS (
    SELECT DISTINCT unnest(source_hashes) AS hash
  ),
  candidate_hashes AS (
    SELECT hash
    FROM target_hashes
    UNION
    SELECT source.hash
    FROM farcaster.casts source
    JOIN target_hashes target
      ON source.parent_hash = target.hash
      OR source.root_parent_hash = target.hash
  ),
  source_casts AS (
    SELECT
      source.hash,
      source.fid AS actor_fid,
      source.parent_hash,
      source.parent_fid,
      COALESCE(source.root_parent_hash, source.hash) AS root_hash,
      source.timestamp AS event_at,
      source.mentioned_fids
    FROM farcaster.casts source
    JOIN candidate_hashes target ON target.hash = source.hash
    JOIN farcaster.profiles actor ON actor.fid = source.fid
    JOIN farcaster.casts root ON root.hash = COALESCE(source.root_parent_hash, source.hash)
    JOIN farcaster.profiles root_author ON root_author.fid = root.fid
    WHERE source.deleted_at IS NULL
      AND source.hidden_at IS NULL
      AND source.root_parent_url = 'https://farcaster.xyz/~/channel/cobuild'
      AND cobuild.cast_has_renderable_content(
        source.text,
        source.mentioned_fids,
        source.embed_summaries,
        source.embeds_array
      )
      AND source.fid IS NOT NULL
      AND actor.hidden_at IS NULL
      AND actor.neynar_user_score IS NOT NULL
      AND actor.neynar_user_score >= 0.55
      AND root.deleted_at IS NULL
      AND root.hidden_at IS NULL
      AND cobuild.cast_has_renderable_content(
        root.text,
        root.mentioned_fids,
        root.embed_summaries,
        root.embeds_array
      )
      AND root.fid IS NOT NULL
      AND root_author.hidden_at IS NULL
      AND root_author.neynar_user_score IS NOT NULL
      AND root_author.neynar_user_score >= 0.55
  ),
  mention_candidates AS (
    SELECT
      source.hash AS source_hash,
      source.actor_fid,
      source.event_at,
      source.root_hash,
      source.parent_hash AS target_hash,
      mentioned.fid AS recipient_fid,
      'mention'::text AS reason
    FROM source_casts source
    JOIN LATERAL unnest(COALESCE(source.mentioned_fids, ARRAY[]::bigint[])) AS mentioned(fid) ON TRUE
    WHERE mentioned.fid IS NOT NULL
      AND mentioned.fid <> source.actor_fid
  ),
  reply_candidates AS (
    SELECT
      source.hash AS source_hash,
      source.actor_fid,
      source.event_at,
      source.root_hash,
      source.parent_hash AS target_hash,
      source.parent_fid AS recipient_fid,
      CASE
        WHEN source.parent_hash = source.root_hash THEN 'reply_to_root'
        ELSE 'reply_to_reply'
      END AS reason
    FROM source_casts source
    JOIN farcaster.casts target ON target.hash = source.parent_hash
    WHERE source.parent_hash IS NOT NULL
      AND source.parent_fid IS NOT NULL
      AND source.parent_fid <> source.actor_fid
      AND target.deleted_at IS NULL
      AND target.hidden_at IS NULL
      AND cobuild.cast_has_renderable_content(
        target.text,
        target.mentioned_fids,
        target.embed_summaries,
        target.embeds_array
      )
  ),
  recipient_candidates AS (
    SELECT * FROM reply_candidates
    UNION ALL
    SELECT * FROM mention_candidates
  ),
  prioritized_candidates AS (
    SELECT
      candidate.*,
      row_number() OVER (
        PARTITION BY candidate.source_hash, candidate.recipient_fid
        ORDER BY
          cobuild.notification_reason_priority(candidate.reason) DESC,
          candidate.event_at DESC NULLS LAST,
          candidate.source_hash
      ) AS rn
    FROM recipient_candidates candidate
  ),
  distinct_candidates AS (
    SELECT
      source_hash,
      actor_fid,
      event_at,
      root_hash,
      target_hash,
      recipient_fid,
      reason
    FROM prioritized_candidates
    WHERE rn = 1
  ),
  wallet_fanout AS (
    SELECT
      lower(trim(wallet.address)) AS recipient_wallet_address,
      candidate.recipient_fid,
      candidate.reason,
      candidate.source_hash,
      candidate.root_hash,
      candidate.target_hash,
      candidate.actor_fid,
      candidate.event_at
    FROM distinct_candidates candidate
    JOIN farcaster.profiles recipient ON recipient.fid = candidate.recipient_fid
    JOIN LATERAL unnest(COALESCE(recipient.verified_addresses, ARRAY[]::text[])) AS wallet(address) ON TRUE
    WHERE recipient.hidden_at IS NULL
      AND wallet.address IS NOT NULL
      AND btrim(wallet.address) <> ''
      AND wallet.address ~* '^0x[0-9a-f]{40}$'
  ),
  distinct_wallet_fanout AS (
    SELECT DISTINCT ON (wallet.recipient_wallet_address, wallet.source_hash)
      wallet.recipient_wallet_address,
      wallet.recipient_fid,
      wallet.reason,
      wallet.source_hash,
      wallet.root_hash,
      wallet.target_hash,
      wallet.actor_fid,
      wallet.event_at
    FROM wallet_fanout wallet
    ORDER BY
      wallet.recipient_wallet_address,
      wallet.source_hash,
      cobuild.notification_reason_priority(wallet.reason) DESC,
      wallet.event_at DESC NULLS LAST
  ),
  upserted AS (
    INSERT INTO cobuild.notifications (
      recipient_wallet_address,
      recipient_fid,
      kind,
      reason,
      source_type,
      source_id,
      source_cast_hash,
      root_cast_hash,
      target_cast_hash,
      actor_fid,
      actor_wallet_address,
      event_at,
      payload,
      invalidated_at,
      created_at,
      updated_at
    )
    SELECT
      wallet.recipient_wallet_address,
      wallet.recipient_fid,
      'discussion',
      wallet.reason,
      'farcaster_cast',
      concat('0x', encode(wallet.source_hash, 'hex')),
      wallet.source_hash,
      wallet.root_hash,
      wallet.target_hash,
      wallet.actor_fid,
      NULL,
      wallet.event_at,
      '{}'::jsonb,
      NULL,
      clock_timestamp(),
      clock_timestamp()
    FROM distinct_wallet_fanout wallet
    ON CONFLICT (recipient_wallet_address, source_type, source_id) DO UPDATE
    SET
      recipient_fid = EXCLUDED.recipient_fid,
      kind = EXCLUDED.kind,
      reason = CASE
        WHEN cobuild.notification_reason_priority(EXCLUDED.reason) >
             cobuild.notification_reason_priority(cobuild.notifications.reason)
          THEN EXCLUDED.reason
        ELSE cobuild.notifications.reason
      END,
      source_cast_hash = EXCLUDED.source_cast_hash,
      root_cast_hash = EXCLUDED.root_cast_hash,
      target_cast_hash = EXCLUDED.target_cast_hash,
      actor_fid = EXCLUDED.actor_fid,
      actor_wallet_address = EXCLUDED.actor_wallet_address,
      event_at = EXCLUDED.event_at,
      payload = EXCLUDED.payload,
      invalidated_at = NULL,
      updated_at = clock_timestamp()
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM upserted
$$;

CREATE OR REPLACE FUNCTION cobuild.invalidate_notifications_for_source_hashes(source_hashes BYTEA[])
RETURNS INTEGER
LANGUAGE sql
AS $$
  WITH target_hashes AS (
    SELECT DISTINCT unnest(source_hashes) AS hash
  ),
  invalidated AS (
    UPDATE cobuild.notifications notification
    SET
      invalidated_at = clock_timestamp(),
      updated_at = clock_timestamp()
    FROM target_hashes target
    WHERE notification.source_cast_hash = target.hash
      AND notification.invalidated_at IS NULL
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM invalidated
$$;
