export type {
  RegisterInitResponse,
  RegisterCompleteResponse,
} from "@/lib/integrations/farcaster/register-types";

export type UsernameAvailabilityState = {
  status: "idle" | "checking" | "available" | "taken" | "invalid" | "error";
  message?: string;
};

export type FarcasterSignupState = {
  username: string;
  availability: UsernameAvailabilityState;
  isSubmitting: boolean;
  error: string | null;
  setUsername: (value: string) => void;
  submit: () => Promise<void>;
  reset: () => void;
};
