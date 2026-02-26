"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SettingsCard, SettingsCardHeader } from "@/components/features/settings/settings-card";
import { FarcasterSignerDialog } from "@/components/features/auth/farcaster/farcaster-link-dialog";
import {
  IMAGE_ACCEPT_ATTRIBUTE,
  uploadImage,
  validateImageFile,
} from "@/lib/integrations/images/upload-client";
import { useFarcasterSignup } from "@/lib/hooks/use-farcaster-signup";
import { updateFarcasterProfileAction } from "./actions";
import { SignupPrompt } from "./farcaster-profile-settings/signup-panel";
import { ProfilePhotoSection } from "./farcaster-profile-settings/profile-photo";
import { DisplayNameEditor } from "./farcaster-profile-settings/display-name";

type FarcasterProfileSettingsProps = {
  resolvedUsername: string | null;
  resolvedDisplayName: string;
  resolvedPfpUrl: string;
  canEdit: boolean;
  hasFarcasterAccount: boolean;
};

export function FarcasterProfileSettings({
  resolvedUsername,
  resolvedDisplayName,
  resolvedPfpUrl,
  canEdit,
  hasFarcasterAccount,
}: FarcasterProfileSettingsProps) {
  const router = useRouter();
  const signup = useFarcasterSignup({ onComplete: () => {} });
  const { availability, reset } = signup;
  const [displayName, setDisplayName] = useState(resolvedDisplayName);
  const [pfpUrl, setPfpUrl] = useState(resolvedPfpUrl);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSignerDialogOpen, setSignerDialogOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasUserEditedRef = useRef(false);

  const trimmedDisplayName = displayName.trim();
  const initialDisplayNameTrimmed = resolvedDisplayName.trim();
  const isDisplayNameDirty = trimmedDisplayName !== initialDisplayNameTrimmed;
  const isDisplayNameInvalid = isDisplayNameDirty && trimmedDisplayName.length === 0;
  const isPfpDirty = pfpUrl !== resolvedPfpUrl;
  const isDirty = isDisplayNameDirty || isPfpDirty;
  const isBusy = isUploading || isSaving;
  const showSignupPrompt = !hasFarcasterAccount;
  const isSignupReady = availability.status === "available";
  const headerDescription = hasFarcasterAccount
    ? "Edit your display name and photo."
    : "Connect a Farcaster account to update your profile.";

  useEffect(() => {
    if (!hasUserEditedRef.current) {
      setDisplayName(resolvedDisplayName);
      setPfpUrl(resolvedPfpUrl);
    }
  }, [resolvedDisplayName, resolvedPfpUrl]);

  useEffect(() => {
    if (hasFarcasterAccount) {
      reset();
    }
  }, [hasFarcasterAccount, reset]);

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const handleUploadClick = () => {
    if (!canEdit || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
    setIsUploading(true);
    hasUserEditedRef.current = true;

    try {
      const url = await uploadImage(file);
      setPfpUrl(url);
      setLocalPreview(null);
      toast.success("Profile photo uploaded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!isDirty || isBusy || !canEdit) return;
    if (isDisplayNameInvalid) {
      toast.error("Display name cannot be empty.");
      return;
    }

    const payload: { displayName?: string; pfpUrl?: string } = {
      ...(isDisplayNameDirty ? { displayName: trimmedDisplayName } : {}),
      ...(isPfpDirty ? { pfpUrl } : {}),
    };

    if (Object.keys(payload).length === 0) return;

    setIsSaving(true);

    try {
      const result = await updateFarcasterProfileAction(payload);
      if (!result.ok) {
        throw new Error(result.error ?? "Failed to update Farcaster profile.");
      }

      setDisplayName(trimmedDisplayName);
      hasUserEditedRef.current = false;
      toast.success("Farcaster profile updated.");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const previewSrc = localPreview || pfpUrl || null;
  const showProfileEditor = !showSignupPrompt;

  return (
    <SettingsCard>
      <div className="relative space-y-6">
        <FarcasterSignerDialog open={isSignerDialogOpen} onOpenChange={setSignerDialogOpen} />
        <div className="flex items-start justify-between gap-4">
          <SettingsCardHeader title="Farcaster profile" description={headerDescription} />
          {resolvedUsername && (
            <span className="text-muted-foreground shrink-0 text-sm">@{resolvedUsername}</span>
          )}
        </div>

        {showSignupPrompt ? <SignupPrompt signup={signup} isSignupReady={isSignupReady} /> : null}

        {showProfileEditor ? (
          <ProfilePhotoSection
            previewSrc={previewSrc}
            displayName={displayName}
            resolvedUsername={resolvedUsername}
            canEdit={canEdit}
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
              setDisplayName(value);
            }}
            canEdit={canEdit}
            isDirty={isDirty}
            isBusy={isBusy}
            isDisplayNameInvalid={isDisplayNameInvalid}
            hasFarcasterAccount={hasFarcasterAccount}
            onSave={handleSave}
            onLinkAccount={() => setSignerDialogOpen(true)}
          />
        ) : null}
      </div>
    </SettingsCard>
  );
}
