import "server-only";

import { normalizeEntityId } from "@/lib/shared/entity-id";
import { castHashToBuffer } from "@/lib/domains/rules/cast-rules/normalize";
import { getCobuildActivityByFids } from "@/lib/integrations/farcaster/activity";
import { isFullCastHash } from "@/lib/integrations/farcaster/parse-cast-url";
import { THREAD_PAGE_SIZE, bufferToHash, hasText, toFidNumber } from "./shared";
import type { FlatCastThread, ThreadCast } from "./types";
import {
  getThreadSlices,
  loadCobuildCastsByHashes,
  loadCobuildRootCastRow,
  loadCobuildThreadFocusIndex,
  loadCobuildThreadRepliesPage,
  loadCobuildThreadRows,
  mapThreadRows,
  mergeRootAuthorReplies,
  type ThreadReplyRow,
} from "./thread/helpers";

const MAX_PARENT_DEPTH = 3;

async function resolveFocusPage(params: {
  focusHash: string | null;
  rootHash: string;
  rootBuffer: Buffer;
  showAll: boolean;
}): Promise<number | null> {
  const { focusHash, rootHash, rootBuffer, showAll } = params;
  if (!focusHash || showAll) return null;
  if (focusHash === rootHash) return 1;

  const focusBuffer = castHashToBuffer(focusHash);
  if (!focusBuffer) return null;

  const focusInfo = await loadCobuildThreadFocusIndex(rootBuffer, focusBuffer);
  const focusTarget = bufferToHash(focusInfo.mergeTarget);
  if (focusTarget === rootHash) return 1;
  if (focusInfo.index === null) return null;

  return Math.floor(focusInfo.index / THREAD_PAGE_SIZE) + 1;
}

type ParentRow = Awaited<ReturnType<typeof loadCobuildCastsByHashes>>[number];

async function loadParentRows(
  visibleRows: ThreadReplyRow[],
  replyHashSet: Set<string>,
  rootHash: string
): Promise<ParentRow[]> {
  const parentRows: ParentRow[] = [];
  const seenParents = new Set<string>();
  let frontier = new Set<string>();

  for (const row of visibleRows) {
    const parent = bufferToHash(row.parentHash);
    if (parent && parent !== rootHash && !replyHashSet.has(parent)) {
      frontier.add(parent);
    }
  }

  for (let depth = 0; depth < MAX_PARENT_DEPTH && frontier.size > 0; depth += 1) {
    const hashes = Array.from(frontier).filter((hash) => !seenParents.has(hash));
    frontier = new Set<string>();
    hashes.forEach((hash) => seenParents.add(hash));

    const buffers = hashes
      .map((hash) => castHashToBuffer(hash))
      .filter((buffer): buffer is Buffer => Boolean(buffer));

    if (buffers.length === 0) break;
    const rows = await loadCobuildCastsByHashes(buffers);
    parentRows.push(...rows);

    rows.forEach((row) => {
      const parent = bufferToHash(row.parentHash);
      if (parent && parent !== rootHash && !seenParents.has(parent)) {
        frontier.add(parent);
      }
    });
  }

  return parentRows;
}

export async function getCobuildThreadMergeGroup(
  rootHash: string,
  targetHash: string
): Promise<string[] | null> {
  const normalizedRoot = normalizeEntityId(rootHash);
  const normalizedTarget = normalizeEntityId(targetHash);
  if (!normalizedRoot || !isFullCastHash(normalizedRoot)) return null;
  if (!normalizedTarget || !isFullCastHash(normalizedTarget)) return null;

  const rows = await loadCobuildThreadRows(Buffer.from(normalizedRoot.slice(2), "hex"));
  if (rows.length === 0) return null;

  const mapped = mapThreadRows(rows);
  const slices = getThreadSlices(mapped, normalizedRoot);
  if (!slices) return null;

  const { mergedTo } = mergeRootAuthorReplies(slices.visibleReplies, slices.root);
  const resolvedTarget = mergedTo.get(normalizedTarget) ?? normalizedTarget;
  const mergedHashes = Array.from(mergedTo.entries())
    .filter(([, target]) => target === resolvedTarget)
    .map(([hash]) => hash);

  return Array.from(new Set([resolvedTarget, ...mergedHashes]));
}

export async function getCobuildFlatCastThread(
  hash: string,
  options: { page?: number; focusHash?: string | null } = {}
): Promise<FlatCastThread | null> {
  const page = options.page ?? 1;
  const focusCandidate = options.focusHash ? normalizeEntityId(options.focusHash) : null;
  const focusHash = focusCandidate && isFullCastHash(focusCandidate) ? focusCandidate : null;

  const normalized = normalizeEntityId(hash);
  if (!normalized || !isFullCastHash(normalized)) return null;

  const hashBuffer = Buffer.from(normalized.slice(2), "hex");

  const rootRow = await loadCobuildRootCastRow(hashBuffer);
  if (!rootRow) return null;

  const showAll = page === 0;
  const requestedPage = showAll ? 1 : page;
  const focusPage = await resolveFocusPage({
    focusHash,
    rootHash: normalized,
    rootBuffer: hashBuffer,
    showAll,
  });
  const initialPage = focusPage ?? requestedPage;
  const initialOffset = (initialPage - 1) * THREAD_PAGE_SIZE;
  const initialLimit = showAll ? Number.MAX_SAFE_INTEGER : THREAD_PAGE_SIZE;
  const replyPage = await loadCobuildThreadRepliesPage(hashBuffer, {
    limit: initialLimit,
    offset: initialOffset,
  });
  const replyCount = replyPage.replyCount;

  if (replyCount === 0 && !hasText(rootRow.text)) return null;

  const totalPages = Math.max(1, Math.ceil(replyCount / THREAD_PAGE_SIZE));
  const safePage = showAll ? 1 : Math.max(1, Math.min(initialPage, totalPages));
  const resolvedPage = showAll ? 0 : safePage;

  let replyRows = replyPage.rows;
  if (!showAll && safePage !== initialPage) {
    const refetchOffset = (safePage - 1) * THREAD_PAGE_SIZE;
    const refetch = await loadCobuildThreadRepliesPage(hashBuffer, {
      limit: THREAD_PAGE_SIZE,
      offset: refetchOffset,
    });
    replyRows = refetch.rows;
  }

  const visibleRows = replyRows.filter((row) => !row.isMerged);
  const replyHashSet = new Set(
    replyRows.map((row) => bufferToHash(row.hash)).filter((hash): hash is string => Boolean(hash))
  );
  const parentRows = await loadParentRows(visibleRows, replyHashSet, normalized);

  const activityRows = [rootRow, ...replyRows, ...parentRows];
  const activityMap = await getCobuildActivityByFids(
    activityRows.map((row) => toFidNumber(row.fid))
  );

  const rootCast = mapThreadRows([rootRow], activityMap)[0];
  if (!rootCast || !hasText(rootCast.text)) return null;

  const replyCasts = mapThreadRows(replyRows, activityMap);
  const parentCasts = mapThreadRows(parentRows, activityMap);

  const castMap: Record<string, ThreadCast> = { [rootCast.hash]: rootCast };
  replyCasts.forEach((cast) => {
    castMap[cast.hash] = cast;
  });
  parentCasts.forEach((cast) => {
    castMap[cast.hash] = cast;
  });

  const replyByHash = new Map<string, ThreadCast>();
  replyCasts.forEach((cast) => {
    replyByHash.set(cast.hash, cast);
  });

  const mergeGroups = new Map<string, { rows: ThreadCast[]; merged: boolean[] }>();
  replyRows.forEach((row, index) => {
    const mergeTarget = bufferToHash(row.mergeTarget);
    const cast = replyCasts[index];
    if (!mergeTarget || !cast) return;
    const entry = mergeGroups.get(mergeTarget) ?? { rows: [], merged: [] };
    entry.rows.push(cast);
    entry.merged.push(row.isMerged);
    mergeGroups.set(mergeTarget, entry);
  });

  const rootMerge = mergeGroups.get(rootCast.hash);
  if (rootMerge) {
    const appended = rootMerge.rows
      .filter((_, i) => rootMerge.merged[i])
      .map((cast) => cast.text)
      .filter(Boolean)
      .join("\n\n");
    if (appended) {
      rootCast.text = [rootCast.text, appended].filter(Boolean).join("\n\n");
    }
  }

  mergeGroups.forEach((group, targetHash) => {
    if (targetHash === rootCast.hash) return;
    const target = replyByHash.get(targetHash);
    if (!target) return;
    const mergedText = group.rows
      .map((cast) => cast.text)
      .filter(Boolean)
      .join("\n\n");
    if (mergedText) target.text = mergedText;
  });

  const paginatedReplies = visibleRows
    .map((row) => replyByHash.get(bufferToHash(row.hash) ?? ""))
    .filter((cast): cast is ThreadCast => Boolean(cast));

  return {
    root: rootCast,
    replies: paginatedReplies,
    replyCount,
    castMap,
    page: resolvedPage,
    pageSize: showAll ? replyCount : THREAD_PAGE_SIZE,
    totalPages: showAll ? 1 : totalPages,
    hasNextPage: !showAll && resolvedPage < totalPages,
    hasPrevPage: !showAll && resolvedPage > 1,
  };
}
