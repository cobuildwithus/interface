type DuplicateClauseType = {
  type: string;
  firstIndex: number;
  index: number;
};

export function findDuplicateClauseTypes(entries: Array<{ type: string }>): DuplicateClauseType[] {
  const seen = new Map<string, number>();
  const duplicates: DuplicateClauseType[] = [];

  for (const [idx, entry] of entries.entries()) {
    const firstIdx = seen.get(entry.type);
    if (firstIdx == null) {
      seen.set(entry.type, idx);
      continue;
    }
    duplicates.push({ type: entry.type, firstIndex: firstIdx, index: idx });
  }

  return duplicates;
}
