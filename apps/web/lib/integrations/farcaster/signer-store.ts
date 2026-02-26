import "server-only";

import { deleteItem, getDecryptedItem, saveEncryptedItem } from "@/lib/server/kv/kv-store";

const SIGNER_KEY_PREFIX = "neynar_signer:v1";

export type NeynarSignerRecord = {
  fid: number;
  signerUuid: string;
  signerPermissions: string[];
  updatedAt: string;
};

export function getSignerKey(fid: number): string {
  return `${SIGNER_KEY_PREFIX}:${fid}`;
}

export async function setSignerRecord(params: {
  fid: number;
  signerUuid: string;
  signerPermissions: string[];
}): Promise<void> {
  const record: NeynarSignerRecord = {
    fid: params.fid,
    signerUuid: params.signerUuid,
    signerPermissions: params.signerPermissions,
    updatedAt: new Date().toISOString(),
  };

  await saveEncryptedItem(getSignerKey(params.fid), record);
}

export async function getSignerRecord(fid: number): Promise<NeynarSignerRecord | null> {
  return getDecryptedItem<NeynarSignerRecord>(getSignerKey(fid));
}

export async function deleteSignerRecord(fid: number): Promise<void> {
  await deleteItem(getSignerKey(fid));
}

export async function hasSignerRecord(fid: number): Promise<boolean> {
  return (await getSignerRecord(fid)) !== null;
}
