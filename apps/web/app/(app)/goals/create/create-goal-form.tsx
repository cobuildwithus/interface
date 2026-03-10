"use client";

import {
  baseAddresses,
  buildGoalCreateTransaction,
  decodeGoalDeployedEvent,
  goalFactoryAbi,
  goalFactoryAddress,
} from "@cobuild/wire";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { isAddress, keccak256, parseUnits, stringToHex, type Address, type Hex } from "viem";
import { usePublicClient } from "wagmi";
import { AuthButton } from "@/components/ui/auth-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BASE_CHAIN_ID } from "@/lib/domains/token/onchain/addresses";
import { useContractTransaction } from "@/lib/domains/token/onchain/use-contract-transaction";

const DEFAULT_RESERVED_PERCENT_BPS = 9900;
const DEFAULT_CASH_OUT_TAX_BPS = 0;
const DEFAULT_TCR_CHALLENGE_SECONDS = 2n * 60n * 60n;
const DEFAULT_TCR_VOTING_PERIOD_SECONDS = 2n * 60n * 60n;
const DEFAULT_TCR_VOTING_DELAY_SECONDS = 1n;
const DEFAULT_TCR_REVEAL_SECONDS = 1n;
const DEFAULT_TCR_ARBITRATION_COST = 1_000_000_000_000_000n;
const DEFAULT_TCR_WRONG_OR_MISSED_SLASH_BPS = 50n;
const DEFAULT_TCR_SLASH_CALLER_BOUNTY_BPS = 100n;
const DEFAULT_TCR_MAX_ACTIVATION_THRESHOLD = parseUnits("1", 18);
const DEFAULT_TCR_MAX_RUNWAY_CAP = parseUnits("1", 18);
const DEFAULT_TCR_ORACLE_LIVENESS = 1n;
const DEFAULT_TCR_ORACLE_BOND = 1n;
const DEFAULT_REGISTRATION_META_EVIDENCE = "ipfs://REG";
const DEFAULT_CLEARING_META_EVIDENCE = "ipfs://CLEAR";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MAX_UINT32 = 4_294_967_295;

type FormState = {
  goalName: string;
  goalTicker: string;
  goalUri: string;
  description: string;
  tagline: string;
  imageUrl: string;
  websiteUrl: string;
  initialIssuance: string;
  minRaise: string;
  durationDays: string;
  minRaiseWindowDays: string;
  successSpec: string;
  successPolicy: string;
  successLivenessHours: string;
  successBond: string;
  successResolver: string;
  budgetSuccessResolver: string;
  goalSpendPolicy: string;
  budgetSpendPolicy: string;
};

type DeploymentState = {
  txHash: string;
  goalTreasury?: string;
  goalFlow?: string;
  goalRevnetId?: string;
};

const defaultSuccessResolver = baseAddresses.config.fakeUmaTreasurySuccessResolver.toLowerCase();
const defaultBudgetSuccessResolver = defaultSuccessResolver;
const defaultInvalidRoundRewardsSink =
  baseAddresses.defaults.defaultInvalidRoundRewardsSink.toLowerCase();
const defaultSubmissionDepositStrategy =
  baseAddresses.defaults.defaultSubmissionDepositStrategy.toLowerCase();

const initialFormState: FormState = {
  goalName: "",
  goalTicker: "",
  goalUri: "ipfs://",
  description: "",
  tagline: "",
  imageUrl: "",
  websiteUrl: "",
  initialIssuance: "1",
  minRaise: "100",
  durationDays: "30",
  minRaiseWindowDays: "7",
  successSpec: "",
  successPolicy: "",
  successLivenessHours: "24",
  successBond: "0",
  successResolver: defaultSuccessResolver,
  budgetSuccessResolver: defaultBudgetSuccessResolver,
  goalSpendPolicy: "",
  budgetSpendPolicy: "",
};

function normalizeAddress(value: string, label: string): Address {
  const trimmed = value.trim();
  if (!isAddress(trimmed)) {
    throw new Error(`${label} must be a valid EVM address.`);
  }
  return trimmed.toLowerCase() as Address;
}

function parseWholeNumber(value: string, label: string, min: number): number {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${label} must be a whole number.`);
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    throw new Error(`${label} must be at least ${min}.`);
  }
  return parsed;
}

function parseTokenAmount(value: string, label: string): bigint {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  try {
    return parseUnits(trimmed, 18);
  } catch {
    throw new Error(`${label} must be a valid decimal number.`);
  }
}

function parseUint256(value: string, label: string): bigint {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${label} must be a whole number.`);
  }
  return BigInt(trimmed);
}

function buildDeployParams(allocationMechanismAdmin: Address, form: FormState) {
  const goalName = form.goalName.trim();
  if (!goalName) throw new Error("Goal name is required.");

  const goalTicker = form.goalTicker.trim().toUpperCase();
  if (!goalTicker) throw new Error("Goal ticker is required.");
  if (goalTicker.length > 12) throw new Error("Goal ticker must be 12 characters or fewer.");

  const goalUri = form.goalUri.trim();
  if (!goalUri) throw new Error("Goal URI is required.");

  const description = form.description.trim();
  if (!description) throw new Error("Description is required.");

  const successSpec = form.successSpec.trim();
  if (!successSpec) throw new Error("Success spec is required.");

  const successPolicy = form.successPolicy.trim();
  if (!successPolicy) throw new Error("Success policy is required.");

  const initialIssuance = parseTokenAmount(form.initialIssuance, "Initial issuance");
  if (initialIssuance <= 0n) {
    throw new Error("Initial issuance must be greater than 0.");
  }

  const minRaise = parseTokenAmount(form.minRaise, "Min raise");

  const durationDays = parseWholeNumber(form.durationDays, "Duration (days)", 1);
  const minRaiseWindowDays = parseWholeNumber(
    form.minRaiseWindowDays,
    "Min-raise window (days)",
    0
  );
  if (minRaiseWindowDays > durationDays) {
    throw new Error("Min-raise window must be less than or equal to duration.");
  }

  const durationSeconds = durationDays * 24 * 60 * 60;
  const minRaiseWindowSeconds = minRaiseWindowDays * 24 * 60 * 60;
  if (durationSeconds > MAX_UINT32 || minRaiseWindowSeconds > MAX_UINT32) {
    throw new Error("Duration values exceed uint32 limits.");
  }

  const successLivenessHours = parseWholeNumber(
    form.successLivenessHours,
    "Assertion liveness (hours)",
    1
  );
  const successAssertionLiveness = BigInt(successLivenessHours * 60 * 60);

  const successAssertionBond = parseUint256(form.successBond, "Assertion bond");

  const successResolver = normalizeAddress(form.successResolver, "Success resolver");
  const budgetSuccessResolver = normalizeAddress(
    form.budgetSuccessResolver,
    "Budget success resolver"
  );
  const goalSpendPolicy = normalizeAddress(form.goalSpendPolicy, "Goal spend policy");
  const budgetSpendPolicy = normalizeAddress(form.budgetSpendPolicy, "Budget spend policy");

  const successOracleSpecHash = keccak256(stringToHex(successSpec));
  const successAssertionPolicyHash = keccak256(stringToHex(successPolicy));

  return {
    revnet: {
      name: goalName,
      ticker: goalTicker,
      uri: goalUri,
      initialIssuance,
      cashOutTaxRate: DEFAULT_CASH_OUT_TAX_BPS,
      reservedPercent: DEFAULT_RESERVED_PERCENT_BPS,
      durationSeconds,
    },
    timing: {
      minRaise,
      minRaiseDurationSeconds: minRaiseWindowSeconds,
    },
    success: {
      successResolver,
      successAssertionLiveness,
      successAssertionBond,
      successOracleSpecHash,
      successAssertionPolicyHash,
    },
    flowMetadata: {
      title: goalName,
      description,
      image: form.imageUrl.trim() || "ipfs://IMAGE",
      tagline: form.tagline.trim(),
      url: form.websiteUrl.trim(),
    },
    underwriting: {
      budgetPremiumPpm: 0,
      budgetSlashPpm: 0,
    },
    budgetTCR: {
      allocationMechanismAdmin,
      invalidRoundRewardsSink: defaultInvalidRoundRewardsSink as Address,
      submissionDepositStrategy: ZERO_ADDRESS as Address,
      submissionBaseDeposit: 0n,
      removalBaseDeposit: 0n,
      submissionChallengeBaseDeposit: 0n,
      removalChallengeBaseDeposit: 0n,
      registrationMetaEvidence: DEFAULT_REGISTRATION_META_EVIDENCE,
      clearingMetaEvidence: DEFAULT_CLEARING_META_EVIDENCE,
      challengePeriodDuration: DEFAULT_TCR_CHALLENGE_SECONDS,
      arbitratorExtraData: "0x" as Hex,
      budgetBounds: {
        minFundingLeadTime: 0n,
        maxFundingHorizon: BigInt(durationSeconds),
        minExecutionDuration: 0n,
        maxExecutionDuration: BigInt(durationSeconds),
        minActivationThreshold: 0n,
        maxActivationThreshold: DEFAULT_TCR_MAX_ACTIVATION_THRESHOLD,
        maxRunwayCap: DEFAULT_TCR_MAX_RUNWAY_CAP,
      },
      oracleBounds: {
        liveness: DEFAULT_TCR_ORACLE_LIVENESS,
        bondAmount: DEFAULT_TCR_ORACLE_BOND,
      },
      budgetSuccessResolver,
      budgetSpendPolicy,
      arbitratorParams: {
        votingPeriod: DEFAULT_TCR_VOTING_PERIOD_SECONDS,
        votingDelay: DEFAULT_TCR_VOTING_DELAY_SECONDS,
        revealPeriod: DEFAULT_TCR_REVEAL_SECONDS,
        arbitrationCost: DEFAULT_TCR_ARBITRATION_COST,
        wrongOrMissedSlashBps: DEFAULT_TCR_WRONG_OR_MISSED_SLASH_BPS,
        slashCallerBountyBps: DEFAULT_TCR_SLASH_CALLER_BOUNTY_BPS,
      },
    },
    goalSpendPolicy,
  } as const;
}

export function CreateGoalForm() {
  const router = useRouter();
  const publicClient = usePublicClient({ chainId: BASE_CHAIN_ID });

  const [form, setForm] = useState<FormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<DeploymentState | null>(null);

  const handleDeploymentConfirmed = useCallback(
    async (hash: string) => {
      if (!publicClient) {
        setDeployment({ txHash: hash });
        return;
      }

      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: hash as Hex });
        const deploymentEvent = decodeGoalDeployedEvent(receipt.logs);
        const stack = deploymentEvent?.stack;

        const goalTreasury =
          typeof stack?.goalTreasury === "string" && isAddress(stack.goalTreasury)
            ? stack.goalTreasury.toLowerCase()
            : undefined;
        const goalFlow =
          typeof stack?.goalFlow === "string" && isAddress(stack.goalFlow)
            ? stack.goalFlow.toLowerCase()
            : undefined;
        const goalRevnetId =
          typeof stack?.goalRevnetId === "bigint" ? stack.goalRevnetId.toString(10) : undefined;

        setDeployment({
          txHash: hash,
          goalTreasury,
          goalFlow,
          goalRevnetId,
        });

        if (goalTreasury) {
          router.push(`/${goalTreasury}`);
        }
      } catch (error) {
        console.error(error);
        setDeployment({ txHash: hash });
      }
    },
    [publicClient, router]
  );

  const tx = useContractTransaction({
    chainId: BASE_CHAIN_ID,
    loading: "Deploying goal stack…",
    success: "Goal deployment confirmed",
    onSuccess: (hash) => {
      void handleDeploymentConfirmed(hash);
    },
  });

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeploy = async () => {
    setFormError(null);

    try {
      // Validate curated inputs before opening wallet/deploy toasts.
      const preflightDeployParams = buildDeployParams(ZERO_ADDRESS as Address, form);
      buildGoalCreateTransaction({
        deployParams: preflightDeployParams,
      });

      await tx.prepareWallet();
      if (!tx.account) return;

      const deployParams = buildDeployParams(
        normalizeAddress(tx.account, "Allocation mechanism admin"),
        form
      );
      const goalCreateTx = buildGoalCreateTransaction({
        deployParams,
      });

      await tx.writeContractAsync({
        address: goalCreateTx.to,
        abi: goalFactoryAbi,
        functionName: "deployGoal",
        args: [deployParams],
        chainId: BASE_CHAIN_ID,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to deploy goal.");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Goal Details</CardTitle>
          <CardDescription>
            Curated inputs plus required treasury spend-policy addresses. Advanced TCR parameters
            stay pinned to protocol defaults.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goal-name">Goal name</Label>
              <Input
                id="goal-name"
                value={form.goalName}
                onChange={(event) => updateField("goalName", event.target.value)}
                placeholder="Raise $1M for Open Science"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-ticker">Ticker</Label>
              <Input
                id="goal-ticker"
                value={form.goalTicker}
                onChange={(event) =>
                  updateField("goalTicker", event.target.value.toUpperCase().replace(/\s+/g, ""))
                }
                placeholder="SCI"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-description">Description</Label>
            <Textarea
              id="goal-description"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="What this goal aims to achieve."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goal-tagline">Tagline</Label>
              <Input
                id="goal-tagline"
                value={form.tagline}
                onChange={(event) => updateField("tagline", event.target.value)}
                placeholder="Fund builders, not gatekeepers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-uri">Goal URI</Label>
              <Input
                id="goal-uri"
                value={form.goalUri}
                onChange={(event) => updateField("goalUri", event.target.value)}
                placeholder="ipfs://..."
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goal-image-url">Image URL</Label>
              <Input
                id="goal-image-url"
                value={form.imageUrl}
                onChange={(event) => updateField("imageUrl", event.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-site-url">Website URL</Label>
              <Input
                id="goal-site-url"
                value={form.websiteUrl}
                onChange={(event) => updateField("websiteUrl", event.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Funding and Timing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="initial-issuance">Initial issuance (18-decimal units)</Label>
            <Input
              id="initial-issuance"
              value={form.initialIssuance}
              onChange={(event) => updateField("initialIssuance", event.target.value)}
              placeholder="1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-raise">Min raise (18-decimal units)</Label>
            <Input
              id="min-raise"
              value={form.minRaise}
              onChange={(event) => updateField("minRaise", event.target.value)}
              placeholder="100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration-days">Duration (days)</Label>
            <Input
              id="duration-days"
              inputMode="numeric"
              value={form.durationDays}
              onChange={(event) => updateField("durationDays", event.target.value)}
              placeholder="30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-raise-window-days">Min-raise window (days)</Label>
            <Input
              id="min-raise-window-days"
              inputMode="numeric"
              value={form.minRaiseWindowDays}
              onChange={(event) => updateField("minRaiseWindowDays", event.target.value)}
              placeholder="7"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Success Assertion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="success-liveness">Assertion liveness (hours)</Label>
              <Input
                id="success-liveness"
                inputMode="numeric"
                value={form.successLivenessHours}
                onChange={(event) => updateField("successLivenessHours", event.target.value)}
                placeholder="24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="success-bond">Assertion bond (raw uint256)</Label>
              <Input
                id="success-bond"
                inputMode="numeric"
                value={form.successBond}
                onChange={(event) => updateField("successBond", event.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="success-resolver">Success resolver</Label>
            <Input
              id="success-resolver"
              value={form.successResolver}
              onChange={(event) => updateField("successResolver", event.target.value)}
              placeholder="0x..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget-success-resolver">Budget success resolver</Label>
            <Input
              id="budget-success-resolver"
              value={form.budgetSuccessResolver}
              onChange={(event) => updateField("budgetSuccessResolver", event.target.value)}
              placeholder="0x..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="success-spec">Success spec (plain text hashed to bytes32)</Label>
            <Textarea
              id="success-spec"
              value={form.successSpec}
              onChange={(event) => updateField("successSpec", event.target.value)}
              placeholder="Detailed oracle spec text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="success-policy">Success policy (plain text hashed to bytes32)</Label>
            <Textarea
              id="success-policy"
              value={form.successPolicy}
              onChange={(event) => updateField("successPolicy", event.target.value)}
              placeholder="Policy constraints for success assertion"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Treasury Policies</CardTitle>
          <CardDescription>
            These spend-policy contracts are now required by the deployed GoalFactory.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="goal-spend-policy">Goal spend policy</Label>
            <Input
              id="goal-spend-policy"
              value={form.goalSpendPolicy}
              onChange={(event) => updateField("goalSpendPolicy", event.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-spend-policy">Budget spend policy</Label>
            <Input
              id="budget-spend-policy"
              value={form.budgetSpendPolicy}
              onChange={(event) => updateField("budgetSpendPolicy", event.target.value)}
              placeholder="0x..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Protocol Defaults</CardTitle>
          <CardDescription>
            These fields are sourced from local <code>@cobuild/wire</code> exports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="text-muted-foreground">
            GoalFactory: <span className="text-foreground font-mono">{goalFactoryAddress}</span>
          </div>
          <div className="text-muted-foreground">
            Default submission deposit strategy:{" "}
            <span className="text-foreground font-mono">{defaultSubmissionDepositStrategy}</span>
          </div>
          <div className="text-muted-foreground">
            Invalid-round rewards sink:{" "}
            <span className="text-foreground font-mono">{defaultInvalidRoundRewardsSink}</span>
          </div>
          <div className="text-muted-foreground">
            Submission deposit strategy override in deploy params:{" "}
            <span className="text-foreground font-mono">{ZERO_ADDRESS}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {formError ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {formError}
          </div>
        ) : null}

        {deployment ? (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            <div>Transaction: {deployment.txHash}</div>
            {deployment.goalRevnetId ? <div>Goal Revnet ID: {deployment.goalRevnetId}</div> : null}
            {deployment.goalTreasury ? <div>Goal Treasury: {deployment.goalTreasury}</div> : null}
            {deployment.goalFlow ? <div>Goal Flow: {deployment.goalFlow}</div> : null}
          </div>
        ) : null}

        <AuthButton
          onClick={handleDeploy}
          disabled={tx.isLoading}
          connectLabel="Connect wallet"
          className="w-full md:w-auto"
        >
          {tx.isLoading ? "Deploying..." : "Create goal"}
        </AuthButton>
      </div>
    </div>
  );
}
