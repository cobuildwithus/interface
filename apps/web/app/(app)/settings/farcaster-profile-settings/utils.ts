export type ProfileSource = {
  fid: number;
  username: string | null;
  displayName: string | null;
  pfp: string | null;
};

export function normalizeText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function toProfileSource(value: {
  fid: number;
  username?: string | null;
  displayName?: string | null;
  pfp?: string | null;
}): ProfileSource {
  return {
    fid: value.fid,
    username: normalizeText(value.username),
    displayName: normalizeText(value.displayName),
    pfp: normalizeText(value.pfp),
  };
}

export function pickFirst(values: Array<string | null>): string | null {
  return values.find(Boolean) ?? null;
}
