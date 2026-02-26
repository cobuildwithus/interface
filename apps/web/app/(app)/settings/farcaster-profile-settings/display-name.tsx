"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DisplayNameEditor({
  displayName,
  onChange,
  canEdit,
  isDirty,
  isBusy,
  isDisplayNameInvalid,
  hasFarcasterAccount,
  onSave,
  onLinkAccount,
}: {
  displayName: string;
  onChange: (value: string) => void;
  canEdit: boolean;
  isDirty: boolean;
  isBusy: boolean;
  isDisplayNameInvalid: boolean;
  hasFarcasterAccount: boolean;
  onSave: () => void;
  onLinkAccount: () => void;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor="farcaster-display-name" className="text-muted-foreground text-xs font-medium">
        Display name
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Input
          id="farcaster-display-name"
          className="flex-1"
          value={displayName}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Add your display name"
          aria-invalid={isDisplayNameInvalid}
          disabled={!canEdit}
        />
        {canEdit ? (
          <Button size="sm" onClick={onSave} disabled={!isDirty || isBusy}>
            {isBusy ? "Saving..." : "Save changes"}
          </Button>
        ) : hasFarcasterAccount ? (
          <Button type="button" size="sm" onClick={onLinkAccount}>
            Link account
          </Button>
        ) : null}
      </div>
      {isDisplayNameInvalid && (
        <span className="text-xs text-red-500">Display name cannot be empty.</span>
      )}
      {!canEdit && (
        <span className="text-muted-foreground text-xs">Connect a Farcaster signer to edit.</span>
      )}
    </div>
  );
}
