import { getPrivyIdToken, getUser } from "@/lib/domains/auth/session";
import { GoalAiInputClient } from "./goal-ai-input-client";

type GoalAiInputProps = {
  goalAddress: string;
};

export async function GoalAiInput({ goalAddress }: GoalAiInputProps) {
  const [userAddress, identityToken] = await Promise.all([getUser(), getPrivyIdToken()]);
  const key = `goal-ai-${goalAddress}-${userAddress ?? "unauth"}-${identityToken ? "auth" : "anon"}`;

  return <GoalAiInputClient key={key} goalAddress={goalAddress} identityToken={identityToken} />;
}
