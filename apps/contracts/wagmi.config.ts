import { defineConfig, loadEnv } from "@wagmi/cli";
import { etherscan } from "@wagmi/cli/plugins";
import { contracts } from "./addresses";

const contractsToGenerate = [
  { name: "CobuildSwapImpl", address: contracts.CobuildSwapImpl },
  // Juicebox v4 contracts
  { name: "JBDirectory", address: contracts.JBDirectory },
  { name: "JBMultiTerminal", address: contracts.JBMultiTerminal },
  { name: "JBController", address: contracts.JBController },
  { name: "JBPermissions", address: contracts.JBPermissions },
  { name: "JBTerminalStore", address: contracts.JBTerminalStore },
  // Revnet contracts
  { name: "REVDeployer", address: contracts.REVDeployer },
  { name: "REVLoans", address: contracts.REVLoans },
  { name: "JBTokens", address: contracts.JBTokens },
];

export default defineConfig(() => {
  const env = loadEnv({ mode: process.env.NODE_ENV, envDir: process.cwd() });
  const generalizedTcrProxy = env.GENERALIZED_TCR_ADDRESS as `0x${string}` | undefined;

  const plugins = [
    etherscan({
      apiKey: env.BASESCAN_API_KEY,
      chainId: 8453,
      contracts: contractsToGenerate,
    }),
    etherscan({
      apiKey: env.ETHERSCAN_API_KEY,
      chainId: 1,
      contracts: [
        {
          name: "superfluidImpl",
          address: "0x07e4a282f8f20032f3e766fffb73c8b86ba7e1f1" as `0x${string}`,
        },
        {
          name: "superfluid",
          address: {
            1: "0x4E583d9390082B65Bef884b629DFA426114CED6d",
            10: "0x567c4B141ED61923967cA25Ef4906C8781069a10",
            8453: "0x4C073B3baB6d8826b8C5b229f3cfdC1eC6E47E74",
          },
        },
      ],
    }),
  ];

  if (generalizedTcrProxy) {
    plugins.push(
      etherscan({
        apiKey: env.BASESCAN_API_KEY,
        chainId: 8453,
        tryFetchProxyImplementation: true,
        contracts: [
          {
            name: "generalizedTcrProxy",
            address: generalizedTcrProxy,
          },
        ],
      })
    );
  }

  return {
    out: "src/generated.ts",
    contracts: [],
    plugins,
  };
});
