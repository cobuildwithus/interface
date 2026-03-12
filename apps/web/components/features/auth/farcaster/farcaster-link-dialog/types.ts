import type {
  ResolvedFarcasterAccount,
  ResolvedXAccount,
} from "@/lib/domains/auth/linked-accounts/server-view";
import type { LinkedAccountsResponse } from "@/lib/domains/auth/linked-accounts/types";
import type { FarcasterSignerStatus } from "@/lib/integrations/farcaster/signer-types";
import type { FarcasterSignupState } from "@/lib/hooks/use-farcaster-signup";

export type FarcasterAccountInfo = ResolvedFarcasterAccount;

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
  accountInfo?: FarcasterAccountInfo | null;
  title: string;
  description: string;
};

export type FarcasterLinkDialogStateOptions = {
  address?: `0x${string}` | null;
  initialLinkedAccounts?: {
    farcaster?: FarcasterAccountInfo | null;
    twitter?: ResolvedXAccount | null;
  };
  initialLinkedAccountsResponse?: LinkedAccountsResponse;
  initialSignerStatus?: FarcasterSignerStatus;
  initialSignerIdentityKey?: string;
  onComplete?: () => void;
};
