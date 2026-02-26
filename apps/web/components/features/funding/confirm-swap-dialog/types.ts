export type ConfirmSwapDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payAmount: string;
  userTokens: string;
  builderTokens: string;
  ethBalanceWei?: bigint;
  isLoading: boolean;
  isSwapDisabled?: boolean;
  onConfirm: (memo?: string) => void;
  onUserTokensChange?: (tokens: string) => void;
};
