import type { FarcasterSignupState } from "@/lib/hooks/use-farcaster-signup";

export type FarcasterAccountInfo = {
  fid: number;
  username?: string;
  displayName?: string;
};

export type FarcasterLinkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReadOnly: () => void;
  onSigner: () => void;
  signup: FarcasterSignupState;
  isBusy: boolean;
  linked: boolean;
  hasSigner: boolean;
  isSignerLoading: boolean;
  missingCastPermission: boolean;
  signerPermissions: string[] | null;
  neynarPermissions: string[] | null;
  neynarStatus: string | null;
  neynarError: string | null;
  isDisconnecting: boolean;
  onDisconnect: () => void;
  accountInfo?: FarcasterAccountInfo;
  title: string;
  description: string;
};

export type FarcasterLinkDialogStateOptions = {
  onComplete?: () => void;
};
