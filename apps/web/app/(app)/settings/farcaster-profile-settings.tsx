"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SettingsCard, SettingsCardHeader } from "@/components/features/settings/settings-card";
import { FarcasterSignerDialog } from "@/components/features/auth/farcaster/farcaster-link-dialog";
import {
  getPreferredLinkedFarcasterAccount,
  toLinkedAccountsServerView,
} from "@/lib/domains/auth/linked-accounts/server-view";
import type { LinkedAccountsResponse } from "@/lib/domains/auth/linked-accounts/types";
import type { FarcasterSignerStatus } from "@/lib/integrations/farcaster/signer-types";
import { IMAGE_ACCEPT_ATTRIBUTE } from "@/lib/integrations/images/upload-client";
import { useSingleImageUpload } from "@/lib/integrations/images/use-single-image-upload";
import { useFarcasterSigner } from "@/lib/hooks/use-farcaster-signer";
import { useFarcasterSignup } from "@/lib/hooks/use-farcaster-signup";
import { useLinkedAccounts } from "@/lib/hooks/use-linked-accounts";
import { updateFarcasterProfileAction } from "./actions";
import { SignupPrompt } from "./farcaster-profile-settings/signup-panel";
import { ProfilePhotoSection } from "./farcaster-profile-settings/profile-photo";
import { DisplayNameEditor } from "./farcaster-profile-settings/display-name";

type FarcasterProfileSettingsProps = {
  resolvedUsername: string | null;
  resolvedDisplayName: string;
  resolvedPfpUrl: string;
  hasFarcasterAccount: boolean;
  initialLinkedAccounts: LinkedAccountsResponse;
  initialSignerStatus: FarcasterSignerStatus;
  initialSignerIdentityKey: string;
};

export function FarcasterProfileSettings({
  resolvedUsername,
  resolvedDisplayName,
  resolvedPfpUrl,
  hasFarcasterAccount,
  initialLinkedAccounts,
  initialSignerStatus,
  initialSignerIdentityKey,
}: FarcasterProfileSettingsProps) {
  const signup = useFarcasterSignup({
    onComplete: () => {},
  });
  const { data: linkedAccountsData } = useLinkedAccounts({
    initialData: initialLinkedAccounts,
    initialIdentityKey: initialSignerIdentityKey,
  });
  const { status: currentSignerStatus } = useFarcasterSigner({
    initialStatus: initialSignerStatus,
    initialIdentityKey: initialSignerIdentityKey,
  });
  const { availability, reset } = signup;
  const linkedAccountsServerView = toLinkedAccountsServerView(linkedAccountsData);
  const linkedFarcasterAccount = getPreferredLinkedFarcasterAccount(
    linkedAccountsServerView.accounts
  );
  const [displayName, setDisplayName] = useState(resolvedDisplayName);
  const [savedDisplayName, setSavedDisplayName] = useState(resolvedDisplayName);
  const [savedPfpUrl, setSavedPfpUrl] = useState(resolvedPfpUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [isSignerDialogOpen, setSignerDialogOpen] = useState(false);
  const {
    imageUrl: pfpUrl,
    isUploading,
    previewSrc,
    setImageUrl: setPfpUrl,
    uploadFile,
  } = useSingleImageUpload({
    initialImageUrl: resolvedPfpUrl,
    uploadSuccessMessage: "Profile photo uploaded.",
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasUserEditedRef = useRef(false);

  const trimmedDisplayName = displayName.trim();
  const savedDisplayNameTrimmed = savedDisplayName.trim();
  const isDisplayNameDirty = trimmedDisplayName !== savedDisplayNameTrimmed;
  const isDisplayNameInvalid = isDisplayNameDirty && trimmedDisplayName.length === 0;
  const isPfpDirty = pfpUrl !== savedPfpUrl;
  const isDirty = isDisplayNameDirty || isPfpDirty;
  const isBusy = isUploading || isSaving;
  const currentHasFarcasterAccount = Boolean(
    hasFarcasterAccount || linkedFarcasterAccount || currentSignerStatus.fid
  );
  const currentCanEdit = currentSignerStatus.hasSigner;
  const currentResolvedUsername =
    getResolvedAccountUsername(linkedFarcasterAccount) || resolvedUsername;
  const syncedDisplayName = linkedFarcasterAccount?.displayName?.trim() || resolvedDisplayName;
  const syncedPfpUrl = linkedFarcasterAccount?.avatarUrl?.trim() || resolvedPfpUrl;
  const showSignupPrompt = !currentHasFarcasterAccount;
  const isSignupReady = availability.status === "available";
  const headerDescription = currentHasFarcasterAccount
    ? "Edit your display name and photo."
    : "Connect a Farcaster account to update your profile.";

  useEffect(() => {
    if (!hasUserEditedRef.current) {
      setDisplayName(syncedDisplayName);
      setPfpUrl(syncedPfpUrl);
      setSavedDisplayName(syncedDisplayName);
      setSavedPfpUrl(syncedPfpUrl);
    }
  }, [setPfpUrl, syncedDisplayName, syncedPfpUrl]);

  useEffect(() => {
    if (currentHasFarcasterAccount) {
      reset();
    }
  }, [currentHasFarcasterAccount, reset]);

  const handleUploadClick = () => {
    if (!currentCanEdit || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    hasUserEditedRef.current = true;
    await uploadFile(file);
  };

  const handleSave = async () => {
    if (!isDirty || isBusy || !currentCanEdit) return;
    if (isDisplayNameInvalid) {
      toast.error("Display name cannot be empty.");
      return;
    }

    const payload: { displayName?: string; pfpUrl?: string } = {
      ...(isDisplayNameDirty ? { displayName: trimmedDisplayName } : {}),
      ...(isPfpDirty && pfpUrl ? { pfpUrl } : {}),
    };

    if (Object.keys(payload).length === 0) return;

    setIsSaving(true);

    try {
      const result = await updateFarcasterProfileAction(payload);
      if (!result.ok) {
        throw new Error(result.error ?? "Failed to update Farcaster profile.");
      }

      const nextDisplayName = result.displayName ?? trimmedDisplayName;
      const nextPfpUrl = result.pfpUrl ?? pfpUrl;
      setDisplayName(nextDisplayName);
      setSavedDisplayName(nextDisplayName);
      if (nextPfpUrl) {
        setPfpUrl(nextPfpUrl);
        setSavedPfpUrl(nextPfpUrl);
      }
      hasUserEditedRef.current = false;
      toast.success("Farcaster profile updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const showProfileEditor = !showSignupPrompt;

  return (
    <SettingsCard>
      <div className="relative space-y-6">
        <FarcasterSignerDialog open={isSignerDialogOpen} onOpenChange={setSignerDialogOpen} />
        <div className="flex items-start justify-between gap-4">
          <SettingsCardHeader title="Farcaster profile" description={headerDescription} />
          {currentResolvedUsername && (
            <span className="text-muted-foreground shrink-0 text-sm">
              @{currentResolvedUsername}
            </span>
          )}
        </div>

        {showSignupPrompt ? <SignupPrompt signup={signup} isSignupReady={isSignupReady} /> : null}

        {showProfileEditor ? (
          <ProfilePhotoSection
            previewSrc={previewSrc}
            displayName={displayName}
            resolvedUsername={currentResolvedUsername}
            canEdit={currentCanEdit}
            isUploading={isUploading}
            onUploadClick={handleUploadClick}
            onFileChange={handleFileChange}
            fileInputRef={fileInputRef}
            accept={IMAGE_ACCEPT_ATTRIBUTE}
          />
        ) : null}

        {showProfileEditor ? (
          <DisplayNameEditor
            displayName={displayName}
            onChange={(value) => {
              hasUserEditedRef.current = true;
              setDisplayName(value);
            }}
            canEdit={currentCanEdit}
            isDirty={isDirty}
            isBusy={isBusy}
            isDisplayNameInvalid={isDisplayNameInvalid}
            hasFarcasterAccount={currentHasFarcasterAccount}
            onSave={handleSave}
            onLinkAccount={() => setSignerDialogOpen(true)}
          />
        ) : null}
      </div>
    </SettingsCard>
  );
}

function getResolvedAccountUsername(account: { username?: string | null } | null) {
  return account?.username?.trim().replace(/^@/, "") || undefined;
}
