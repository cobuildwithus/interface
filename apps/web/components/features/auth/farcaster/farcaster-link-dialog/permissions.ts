import { hasCastPermission } from "@/lib/integrations/farcaster/signer-utils";

export type CastPermissionState = {
  missingCastPermission: boolean;
};

export function getCastPermissionState(params: {
  hasSigner: boolean;
  signerPermissions: string[] | null;
  neynarPermissions: string[] | null;
}): CastPermissionState {
  const resolvedPermissions = params.neynarPermissions ?? params.signerPermissions;
  const castPermissionKnown = resolvedPermissions !== null;
  const hasCastPermissionValue = hasCastPermission(resolvedPermissions);
  return {
    missingCastPermission: params.hasSigner && castPermissionKnown && !hasCastPermissionValue,
  };
}

export function formatPermissions(permissions: string[] | null) {
  if (!permissions || permissions.length === 0) return "none";
  return permissions.join(", ");
}
