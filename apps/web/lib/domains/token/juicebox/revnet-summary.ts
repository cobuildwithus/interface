import "server-only";

import { base } from "viem/chains";
import juiceboxDb from "@/lib/server/db/cobuild-db-client";
import { getUser } from "@/lib/domains/auth/session";
import { COBUILD_JUICEBOX_PROJECT_ID } from "@/lib/domains/token/juicebox/constants";
import { applyJbDaoCashoutFee, applyRevnetCashoutFee } from "@/lib/domains/token/juicebox/fees";
import { getProject } from "@/lib/domains/token/juicebox/project";
import { toBigIntSafe, toDecimalString, type Numberish } from "@/lib/shared/numbers";

const PROJECT_ID = COBUILD_JUICEBOX_PROJECT_ID;

type RevnetSummary = {
  address?: `0x${string}`;
  tokenSymbol: string | null;
  baseTokenSymbol: string;
  accountingDecimals: number;
  tokenLogoUrl: string | null;
  balance: string;
  cashOutValue: string;
};

const WAD = 10n ** 18n;
const WAD2 = WAD * WAD;

function cashOutValueForBalance(
  balance: Numberish,
  cashoutA: Numberish,
  cashoutB: Numberish
): bigint {
  const balanceValue = toBigIntSafe(balance);
  if (balanceValue === 0n) return 0n;
  const A = toBigIntSafe(cashoutA);
  const B = toBigIntSafe(cashoutB);
  if (A === 0n && B === 0n) return 0n;
  const netBalance = applyRevnetCashoutFee(balanceValue);
  if (netBalance === 0n) return 0n;
  const reclaimable = (A * netBalance) / WAD + (B * netBalance * netBalance) / WAD2;
  return applyJbDaoCashoutFee(reclaimable);
}

export async function getRevnetSummary(): Promise<RevnetSummary> {
  const [address, project] = await Promise.all([getUser(), getProject()]);
  const lowerAddress = address?.toLowerCase();

  const tokenMetadataPromise = project.erc20
    ? juiceboxDb.tokenMetadata.findUnique({
        where: {
          chainId_address: {
            chainId: base.id,
            address: project.erc20.toLowerCase(),
          },
        },
        select: { logoUrl: true },
      })
    : Promise.resolve(null);

  if (!lowerAddress) {
    const tokenMetadata = await tokenMetadataPromise;
    return {
      address,
      tokenSymbol: project.erc20Symbol,
      baseTokenSymbol: project.accountingTokenSymbol,
      accountingDecimals: project.accountingDecimals ?? 18,
      tokenLogoUrl: tokenMetadata?.logoUrl ?? null,
      balance: "0",
      cashOutValue: "0",
    };
  }

  const [tokenMetadata, participant, cashOutParticipants] = await Promise.all([
    tokenMetadataPromise,
    juiceboxDb.juiceboxParticipant.findUnique({
      where: {
        chainId_projectId_address: {
          chainId: base.id,
          projectId: PROJECT_ID,
          address: lowerAddress,
        },
      },
      select: {
        balance: true,
        project: { select: { cashoutA: true, cashoutB: true } },
      },
    }),
    project.suckerGroupId
      ? juiceboxDb.juiceboxParticipant.findMany({
          where: { address: lowerAddress, suckerGroupId: project.suckerGroupId },
          select: {
            balance: true,
            project: { select: { cashoutA: true, cashoutB: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const cashOutValue = cashOutParticipants.reduce((total, row) => {
    return (
      total + cashOutValueForBalance(row.balance, row.project?.cashoutA, row.project?.cashoutB)
    );
  }, 0n);

  const fallbackCashOutValue =
    cashOutParticipants.length === 0 && participant?.project
      ? cashOutValueForBalance(
          participant.balance,
          participant.project.cashoutA,
          participant.project.cashoutB
        )
      : 0n;

  return {
    address,
    tokenSymbol: project.erc20Symbol,
    baseTokenSymbol: project.accountingTokenSymbol,
    accountingDecimals: project.accountingDecimals ?? 18,
    tokenLogoUrl: tokenMetadata?.logoUrl ?? null,
    balance: toDecimalString(participant?.balance ?? 0),
    cashOutValue: toDecimalString(cashOutValue + fallbackCashOutValue),
  };
}
