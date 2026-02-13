//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CobuildSwapImpl
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0xe5e248e5877cc4d71986ec6fc2b4cc321c80a23e)
 */
export const cobuildSwapImplAbi = [
  { type: "constructor", inputs: [], stateMutability: "nonpayable" },
  { type: "error", inputs: [], name: "AMOUNT_LT_MIN_FEE" },
  { type: "error", inputs: [], name: "BAD_BATCH_SIZE" },
  { type: "error", inputs: [], name: "ETH_TRANSFER_FAIL" },
  { type: "error", inputs: [], name: "EXPIRED_DEADLINE" },
  { type: "error", inputs: [], name: "FEE_TOO_HIGH" },
  { type: "error", inputs: [], name: "INVALID_ADDRESS" },
  { type: "error", inputs: [], name: "INVALID_AMOUNTS" },
  { type: "error", inputs: [], name: "INVALID_MIN_OUT" },
  { type: "error", inputs: [], name: "INVALID_TOKEN_OUT" },
  { type: "error", inputs: [], name: "INVALID_V3_FEE" },
  { type: "error", inputs: [], name: "JB_TOKEN_UNAVAILABLE" },
  { type: "error", inputs: [], name: "NET_AMOUNT_ZERO" },
  { type: "error", inputs: [], name: "NOT_EXECUTOR" },
  { type: "error", inputs: [], name: "NO_ETH_TERMINAL" },
  { type: "error", inputs: [], name: "PATH_IN_MISMATCH" },
  { type: "error", inputs: [], name: "ROUTER_NOT_ALLOWED" },
  { type: "error", inputs: [], name: "SLIPPAGE" },
  { type: "error", inputs: [], name: "SPENDER_NOT_ALLOWED" },
  { type: "error", inputs: [], name: "ZERO_ADDR" },
  { type: "error", inputs: [], name: "ZERO_MINT_TO_BENEFICIARY" },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "previousAdmin", internalType: "address", type: "address", indexed: false },
      { name: "newAdmin", internalType: "address", type: "address", indexed: false },
    ],
    name: "AdminChanged",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "tokenIn", internalType: "address", type: "address", indexed: true },
      { name: "tokenOut", internalType: "address", type: "address", indexed: true },
      { name: "amountIn", internalType: "uint256", type: "uint256", indexed: false },
      { name: "amountOut", internalType: "uint256", type: "uint256", indexed: false },
      { name: "fee", internalType: "uint256", type: "uint256", indexed: false },
      { name: "router", internalType: "address", type: "address", indexed: false },
    ],
    name: "BatchReactionSwap",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [{ name: "beacon", internalType: "address", type: "address", indexed: true }],
    name: "BeaconUpgraded",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "oldExec", internalType: "address", type: "address", indexed: true },
      { name: "newExec", internalType: "address", type: "address", indexed: true },
    ],
    name: "ExecutorChanged",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "feeBps", internalType: "uint16", type: "uint16", indexed: false },
      { name: "feeCollector", internalType: "address", type: "address", indexed: false },
    ],
    name: "FeeParamsChanged",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [{ name: "version", internalType: "uint8", type: "uint8", indexed: false }],
    name: "Initialized",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [{ name: "minFeeAbsolute", internalType: "uint256", type: "uint256", indexed: false }],
    name: "MinFeeAbsoluteChanged",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "previousOwner", internalType: "address", type: "address", indexed: true },
      { name: "newOwner", internalType: "address", type: "address", indexed: true },
    ],
    name: "OwnershipTransferStarted",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "previousOwner", internalType: "address", type: "address", indexed: true },
      { name: "newOwner", internalType: "address", type: "address", indexed: true },
    ],
    name: "OwnershipTransferred",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "router", internalType: "address", type: "address", indexed: false },
      { name: "allowed", internalType: "bool", type: "bool", indexed: false },
    ],
    name: "RouterAllowed",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "spender", internalType: "address", type: "address", indexed: false },
      { name: "allowed", internalType: "bool", type: "bool", indexed: false },
    ],
    name: "SpenderAllowed",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [{ name: "implementation", internalType: "address", type: "address", indexed: true }],
    name: "Upgraded",
  },
  {
    type: "function",
    inputs: [],
    name: "JB_DIRECTORY",
    outputs: [{ name: "", internalType: "contract IJBDirectory", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "JB_TOKENS",
    outputs: [{ name: "", internalType: "contract IJBTokens", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "PERMIT2",
    outputs: [{ name: "", internalType: "contract IPermit2", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "USDC",
    outputs: [{ name: "", internalType: "contract IERC20", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "WETH9",
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "ZORA",
    outputs: [{ name: "", internalType: "contract IERC20", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "acceptOwnership",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "", internalType: "address", type: "address" }],
    name: "allowedRouters",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "", internalType: "address", type: "address" }],
    name: "allowedSpenders",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "amountIn", internalType: "uint256", type: "uint256" }],
    name: "computeFeeAndNet",
    outputs: [
      { name: "fee", internalType: "uint256", type: "uint256" },
      { name: "net", internalType: "uint256", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "expectedRouter", internalType: "address", type: "address" },
      {
        name: "s",
        internalType: "struct ICobuildSwap.OxOneToMany",
        type: "tuple",
        components: [
          { name: "tokenOut", internalType: "address", type: "address" },
          { name: "minAmountOut", internalType: "uint256", type: "uint256" },
          { name: "spender", internalType: "address", type: "address" },
          { name: "callTarget", internalType: "address", type: "address" },
          { name: "callData", internalType: "bytes", type: "bytes" },
          { name: "value", internalType: "uint256", type: "uint256" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          {
            name: "payees",
            internalType: "struct ICobuildSwap.Payee[]",
            type: "tuple[]",
            components: [
              { name: "user", internalType: "address", type: "address" },
              { name: "recipient", internalType: "address", type: "address" },
              { name: "amountIn", internalType: "uint256", type: "uint256" },
            ],
          },
        ],
      },
    ],
    name: "executeBatch0x",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      {
        name: "s",
        internalType: "struct ICobuildSwap.JuiceboxPayMany",
        type: "tuple",
        components: [
          { name: "universalRouter", internalType: "address", type: "address" },
          { name: "v3Fee", internalType: "uint24", type: "uint24" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          { name: "projectToken", internalType: "address", type: "address" },
          { name: "minEthOut", internalType: "uint256", type: "uint256" },
          { name: "memo", internalType: "string", type: "string" },
          { name: "metadata", internalType: "bytes", type: "bytes" },
          {
            name: "payees",
            internalType: "struct ICobuildSwap.Payee[]",
            type: "tuple[]",
            components: [
              { name: "user", internalType: "address", type: "address" },
              { name: "recipient", internalType: "address", type: "address" },
              { name: "amountIn", internalType: "uint256", type: "uint256" },
            ],
          },
        ],
      },
    ],
    name: "executeJuiceboxPayMany",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "universalRouter", internalType: "address", type: "address" },
      {
        name: "s",
        internalType: "struct ICobuildSwap.ZoraCreatorCoinOneToMany",
        type: "tuple",
        components: [
          {
            name: "key",
            internalType: "struct PoolKey",
            type: "tuple",
            components: [
              { name: "currency0", internalType: "Currency", type: "address" },
              { name: "currency1", internalType: "Currency", type: "address" },
              { name: "fee", internalType: "uint24", type: "uint24" },
              { name: "tickSpacing", internalType: "int24", type: "int24" },
              { name: "hooks", internalType: "contract IHooks", type: "address" },
            ],
          },
          { name: "v3Fee", internalType: "uint24", type: "uint24" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          { name: "minZoraOut", internalType: "uint256", type: "uint256" },
          { name: "minCreatorOut", internalType: "uint128", type: "uint128" },
          {
            name: "payees",
            internalType: "struct ICobuildSwap.Payee[]",
            type: "tuple[]",
            components: [
              { name: "user", internalType: "address", type: "address" },
              { name: "recipient", internalType: "address", type: "address" },
              { name: "amountIn", internalType: "uint256", type: "uint256" },
            ],
          },
        ],
      },
    ],
    name: "executeZoraCreatorCoinOneToMany",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [],
    name: "executor",
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "feeBps",
    outputs: [{ name: "", internalType: "uint16", type: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "feeCollector",
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "_usdc", internalType: "address", type: "address" },
      { name: "_zora", internalType: "address", type: "address" },
      { name: "_universalRouter", internalType: "address", type: "address" },
      { name: "_jbDirectory", internalType: "address", type: "address" },
      { name: "_jbTokens", internalType: "address", type: "address" },
      { name: "_weth9", internalType: "address", type: "address" },
      { name: "_executor", internalType: "address", type: "address" },
      { name: "_feeCollector", internalType: "address", type: "address" },
      { name: "_feeBps", internalType: "uint16", type: "uint16" },
      { name: "_minFeeAbsolute", internalType: "uint256", type: "uint256" },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [],
    name: "minFeeAbsolute",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "owner",
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "pendingOwner",
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "proxiableUUID",
    outputs: [{ name: "", internalType: "bytes32", type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "to", internalType: "address payable", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "rescueETH",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "token", internalType: "address", type: "address" },
      { name: "to", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "rescueTokens",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "e", internalType: "address", type: "address" }],
    name: "setExecutor",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "bps", internalType: "uint16", type: "uint16" }],
    name: "setFeeBps",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "c", internalType: "address", type: "address" }],
    name: "setFeeCollector",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "minAbs", internalType: "uint256", type: "uint256" }],
    name: "setMinFeeAbsolute",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "r", internalType: "address", type: "address" },
      { name: "allowed", internalType: "bool", type: "bool" },
    ],
    name: "setRouterAllowed",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "s", internalType: "address", type: "address" },
      { name: "allowed", internalType: "bool", type: "bool" },
    ],
    name: "setSpenderAllowed",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "newOwner", internalType: "address", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "newImplementation", internalType: "address", type: "address" }],
    name: "upgradeTo",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "newImplementation", internalType: "address", type: "address" },
      { name: "data", internalType: "bytes", type: "bytes" },
    ],
    name: "upgradeToAndCall",
    outputs: [],
    stateMutability: "payable",
  },
  { type: "receive", stateMutability: "payable" },
] as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0xe5e248e5877cc4d71986ec6fc2b4cc321c80a23e)
 */
export const cobuildSwapImplAddress = {
  8453: "0xe5e248E5877cc4D71986Ec6FC2B4cc321c80a23e",
} as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0xe5e248e5877cc4d71986ec6fc2b4cc321c80a23e)
 */
export const cobuildSwapImplConfig = {
  address: cobuildSwapImplAddress,
  abi: cobuildSwapImplAbi,
} as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBController
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x27da30646502e2f642be5281322ae8c394f7668a)
 */
export const jbControllerAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "directory", internalType: "contract IJBDirectory", type: "address" },
      { name: "fundAccessLimits", internalType: "contract IJBFundAccessLimits", type: "address" },
      { name: "permissions", internalType: "contract IJBPermissions", type: "address" },
      { name: "prices", internalType: "contract IJBPrices", type: "address" },
      { name: "projects", internalType: "contract IJBProjects", type: "address" },
      { name: "rulesets", internalType: "contract IJBRulesets", type: "address" },
      { name: "splits", internalType: "contract IJBSplits", type: "address" },
      { name: "tokens", internalType: "contract IJBTokens", type: "address" },
      { name: "omnichainRulesetOperator", internalType: "address", type: "address" },
      { name: "trustedForwarder", internalType: "address", type: "address" },
    ],
    stateMutability: "nonpayable",
  },
  { type: "error", inputs: [], name: "JBController_AddingPriceFeedNotAllowed" },
  { type: "error", inputs: [], name: "JBController_CreditTransfersPaused" },
  {
    type: "error",
    inputs: [
      { name: "rate", internalType: "uint256", type: "uint256" },
      { name: "limit", internalType: "uint256", type: "uint256" },
    ],
    name: "JBController_InvalidCashOutTaxRate",
  },
  {
    type: "error",
    inputs: [
      { name: "percent", internalType: "uint256", type: "uint256" },
      { name: "limit", internalType: "uint256", type: "uint256" },
    ],
    name: "JBController_InvalidReservedPercent",
  },
  { type: "error", inputs: [], name: "JBController_MintNotAllowedAndNotTerminalOrHook" },
  { type: "error", inputs: [], name: "JBController_NoReservedTokens" },
  {
    type: "error",
    inputs: [
      { name: "sender", internalType: "address", type: "address" },
      { name: "directory", internalType: "contract IJBDirectory", type: "address" },
    ],
    name: "JBController_OnlyDirectory",
  },
  {
    type: "error",
    inputs: [{ name: "pendingReservedTokenBalance", internalType: "uint256", type: "uint256" }],
    name: "JBController_PendingReservedTokens",
  },
  { type: "error", inputs: [], name: "JBController_RulesetSetTokenNotAllowed" },
  { type: "error", inputs: [], name: "JBController_RulesetsAlreadyLaunched" },
  { type: "error", inputs: [], name: "JBController_RulesetsArrayEmpty" },
  { type: "error", inputs: [], name: "JBController_ZeroTokensToBurn" },
  { type: "error", inputs: [], name: "JBController_ZeroTokensToMint" },
  {
    type: "error",
    inputs: [
      { name: "account", internalType: "address", type: "address" },
      { name: "sender", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "permissionId", internalType: "uint256", type: "uint256" },
    ],
    name: "JBPermissioned_Unauthorized",
  },
  {
    type: "error",
    inputs: [
      { name: "x", internalType: "uint256", type: "uint256" },
      { name: "y", internalType: "uint256", type: "uint256" },
      { name: "denominator", internalType: "uint256", type: "uint256" },
    ],
    name: "PRBMath_MulDiv_Overflow",
  },
  {
    type: "error",
    inputs: [{ name: "token", internalType: "address", type: "address" }],
    name: "SafeERC20FailedOperation",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "holder", internalType: "address", type: "address", indexed: true },
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "tokenCount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "memo", internalType: "string", type: "string", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "BurnTokens",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "deployer", internalType: "address", type: "address", indexed: true },
      { name: "salt", internalType: "bytes32", type: "bytes32", indexed: false },
      { name: "saltHash", internalType: "bytes32", type: "bytes32", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "DeployERC20",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "rulesetId", internalType: "uint256", type: "uint256", indexed: false },
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: false },
      { name: "projectUri", internalType: "string", type: "string", indexed: false },
      { name: "memo", internalType: "string", type: "string", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "LaunchProject",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "rulesetId", internalType: "uint256", type: "uint256", indexed: false },
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: false },
      { name: "memo", internalType: "string", type: "string", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "LaunchRulesets",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "to", internalType: "contract IERC165", type: "address", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "Migrate",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "beneficiary", internalType: "address", type: "address", indexed: true },
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "tokenCount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "beneficiaryTokenCount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "memo", internalType: "string", type: "string", indexed: false },
      { name: "reservedPercent", internalType: "uint256", type: "uint256", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "MintTokens",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "from", internalType: "address", type: "address", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "PrepMigration",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "rulesetId", internalType: "uint256", type: "uint256", indexed: false },
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: false },
      { name: "memo", internalType: "string", type: "string", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "QueueRulesets",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      {
        name: "split",
        internalType: "struct JBSplit",
        type: "tuple",
        components: [
          { name: "percent", internalType: "uint32", type: "uint32" },
          { name: "projectId", internalType: "uint64", type: "uint64" },
          { name: "beneficiary", internalType: "address payable", type: "address" },
          { name: "preferAddToBalance", internalType: "bool", type: "bool" },
          { name: "lockedUntil", internalType: "uint48", type: "uint48" },
          { name: "hook", internalType: "contract IJBSplitHook", type: "address" },
        ],
        indexed: false,
      },
      { name: "tokenCount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "reason", internalType: "bytes", type: "bytes", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "ReservedDistributionReverted",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "rulesetId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "groupId", internalType: "uint256", type: "uint256", indexed: true },
      {
        name: "split",
        internalType: "struct JBSplit",
        type: "tuple",
        components: [
          { name: "percent", internalType: "uint32", type: "uint32" },
          { name: "projectId", internalType: "uint64", type: "uint64" },
          { name: "beneficiary", internalType: "address payable", type: "address" },
          { name: "preferAddToBalance", internalType: "bool", type: "bool" },
          { name: "lockedUntil", internalType: "uint48", type: "uint48" },
          { name: "hook", internalType: "contract IJBSplitHook", type: "address" },
        ],
        indexed: false,
      },
      { name: "tokenCount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "SendReservedTokensToSplit",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "rulesetId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "rulesetCycleNumber", internalType: "uint256", type: "uint256", indexed: true },
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "owner", internalType: "address", type: "address", indexed: false },
      { name: "tokenCount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "leftoverAmount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "SendReservedTokensToSplits",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "uri", internalType: "string", type: "string", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "SetUri",
  },
  {
    type: "function",
    inputs: [],
    name: "DIRECTORY",
    outputs: [{ name: "", internalType: "contract IJBDirectory", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "FUND_ACCESS_LIMITS",
    outputs: [{ name: "", internalType: "contract IJBFundAccessLimits", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "OMNICHAIN_RULESET_OPERATOR",
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "PERMISSIONS",
    outputs: [{ name: "", internalType: "contract IJBPermissions", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "PRICES",
    outputs: [{ name: "", internalType: "contract IJBPrices", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "PROJECTS",
    outputs: [{ name: "", internalType: "contract IJBProjects", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "RULESETS",
    outputs: [{ name: "", internalType: "contract IJBRulesets", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "SPLITS",
    outputs: [{ name: "", internalType: "contract IJBSplits", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "TOKENS",
    outputs: [{ name: "", internalType: "contract IJBTokens", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "pricingCurrency", internalType: "uint256", type: "uint256" },
      { name: "unitCurrency", internalType: "uint256", type: "uint256" },
      { name: "feed", internalType: "contract IJBPriceFeed", type: "address" },
    ],
    name: "addPriceFeed",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "startingId", internalType: "uint256", type: "uint256" },
      { name: "size", internalType: "uint256", type: "uint256" },
    ],
    name: "allRulesetsOf",
    outputs: [
      {
        name: "rulesets",
        internalType: "struct JBRulesetWithMetadata[]",
        type: "tuple[]",
        components: [
          {
            name: "ruleset",
            internalType: "struct JBRuleset",
            type: "tuple",
            components: [
              { name: "cycleNumber", internalType: "uint48", type: "uint48" },
              { name: "id", internalType: "uint48", type: "uint48" },
              { name: "basedOnId", internalType: "uint48", type: "uint48" },
              { name: "start", internalType: "uint48", type: "uint48" },
              { name: "duration", internalType: "uint32", type: "uint32" },
              { name: "weight", internalType: "uint112", type: "uint112" },
              { name: "weightCutPercent", internalType: "uint32", type: "uint32" },
              {
                name: "approvalHook",
                internalType: "contract IJBRulesetApprovalHook",
                type: "address",
              },
              { name: "metadata", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "metadata",
            internalType: "struct JBRulesetMetadata",
            type: "tuple",
            components: [
              { name: "reservedPercent", internalType: "uint16", type: "uint16" },
              { name: "cashOutTaxRate", internalType: "uint16", type: "uint16" },
              { name: "baseCurrency", internalType: "uint32", type: "uint32" },
              { name: "pausePay", internalType: "bool", type: "bool" },
              { name: "pauseCreditTransfers", internalType: "bool", type: "bool" },
              { name: "allowOwnerMinting", internalType: "bool", type: "bool" },
              { name: "allowSetCustomToken", internalType: "bool", type: "bool" },
              { name: "allowTerminalMigration", internalType: "bool", type: "bool" },
              { name: "allowSetTerminals", internalType: "bool", type: "bool" },
              { name: "allowSetController", internalType: "bool", type: "bool" },
              { name: "allowAddAccountingContext", internalType: "bool", type: "bool" },
              { name: "allowAddPriceFeed", internalType: "bool", type: "bool" },
              { name: "ownerMustSendPayouts", internalType: "bool", type: "bool" },
              { name: "holdFees", internalType: "bool", type: "bool" },
              { name: "useTotalSurplusForCashOuts", internalType: "bool", type: "bool" },
              { name: "useDataHookForPay", internalType: "bool", type: "bool" },
              { name: "useDataHookForCashOut", internalType: "bool", type: "bool" },
              { name: "dataHook", internalType: "address", type: "address" },
              { name: "metadata", internalType: "uint16", type: "uint16" },
            ],
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "from", internalType: "contract IERC165", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
    ],
    name: "beforeReceiveMigrationFrom",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "tokenCount", internalType: "uint256", type: "uint256" },
      { name: "memo", internalType: "string", type: "string" },
    ],
    name: "burnTokensOf",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "tokenCount", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address", type: "address" },
    ],
    name: "claimTokensFor",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "currentRulesetOf",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint48", type: "uint48" },
          { name: "id", internalType: "uint48", type: "uint48" },
          { name: "basedOnId", internalType: "uint48", type: "uint48" },
          { name: "start", internalType: "uint48", type: "uint48" },
          { name: "duration", internalType: "uint32", type: "uint32" },
          { name: "weight", internalType: "uint112", type: "uint112" },
          { name: "weightCutPercent", internalType: "uint32", type: "uint32" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      {
        name: "metadata",
        internalType: "struct JBRulesetMetadata",
        type: "tuple",
        components: [
          { name: "reservedPercent", internalType: "uint16", type: "uint16" },
          { name: "cashOutTaxRate", internalType: "uint16", type: "uint16" },
          { name: "baseCurrency", internalType: "uint32", type: "uint32" },
          { name: "pausePay", internalType: "bool", type: "bool" },
          { name: "pauseCreditTransfers", internalType: "bool", type: "bool" },
          { name: "allowOwnerMinting", internalType: "bool", type: "bool" },
          { name: "allowSetCustomToken", internalType: "bool", type: "bool" },
          { name: "allowTerminalMigration", internalType: "bool", type: "bool" },
          { name: "allowSetTerminals", internalType: "bool", type: "bool" },
          { name: "allowSetController", internalType: "bool", type: "bool" },
          { name: "allowAddAccountingContext", internalType: "bool", type: "bool" },
          { name: "allowAddPriceFeed", internalType: "bool", type: "bool" },
          { name: "ownerMustSendPayouts", internalType: "bool", type: "bool" },
          { name: "holdFees", internalType: "bool", type: "bool" },
          { name: "useTotalSurplusForCashOuts", internalType: "bool", type: "bool" },
          { name: "useDataHookForPay", internalType: "bool", type: "bool" },
          { name: "useDataHookForCashOut", internalType: "bool", type: "bool" },
          { name: "dataHook", internalType: "address", type: "address" },
          { name: "metadata", internalType: "uint16", type: "uint16" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "name", internalType: "string", type: "string" },
      { name: "symbol", internalType: "string", type: "string" },
      { name: "salt", internalType: "bytes32", type: "bytes32" },
    ],
    name: "deployERC20For",
    outputs: [{ name: "token", internalType: "contract IJBToken", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "terminal", internalType: "contract IJBTerminal", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "contract IJBToken", type: "address" },
      { name: "splitTokenCount", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address", type: "address" },
      { name: "metadata", internalType: "bytes", type: "bytes" },
    ],
    name: "executePayReservedTokenToTerminal",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "rulesetId", internalType: "uint256", type: "uint256" },
    ],
    name: "getRulesetOf",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint48", type: "uint48" },
          { name: "id", internalType: "uint48", type: "uint48" },
          { name: "basedOnId", internalType: "uint48", type: "uint48" },
          { name: "start", internalType: "uint48", type: "uint48" },
          { name: "duration", internalType: "uint32", type: "uint32" },
          { name: "weight", internalType: "uint112", type: "uint112" },
          { name: "weightCutPercent", internalType: "uint32", type: "uint32" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      {
        name: "metadata",
        internalType: "struct JBRulesetMetadata",
        type: "tuple",
        components: [
          { name: "reservedPercent", internalType: "uint16", type: "uint16" },
          { name: "cashOutTaxRate", internalType: "uint16", type: "uint16" },
          { name: "baseCurrency", internalType: "uint32", type: "uint32" },
          { name: "pausePay", internalType: "bool", type: "bool" },
          { name: "pauseCreditTransfers", internalType: "bool", type: "bool" },
          { name: "allowOwnerMinting", internalType: "bool", type: "bool" },
          { name: "allowSetCustomToken", internalType: "bool", type: "bool" },
          { name: "allowTerminalMigration", internalType: "bool", type: "bool" },
          { name: "allowSetTerminals", internalType: "bool", type: "bool" },
          { name: "allowSetController", internalType: "bool", type: "bool" },
          { name: "allowAddAccountingContext", internalType: "bool", type: "bool" },
          { name: "allowAddPriceFeed", internalType: "bool", type: "bool" },
          { name: "ownerMustSendPayouts", internalType: "bool", type: "bool" },
          { name: "holdFees", internalType: "bool", type: "bool" },
          { name: "useTotalSurplusForCashOuts", internalType: "bool", type: "bool" },
          { name: "useDataHookForPay", internalType: "bool", type: "bool" },
          { name: "useDataHookForCashOut", internalType: "bool", type: "bool" },
          { name: "dataHook", internalType: "address", type: "address" },
          { name: "metadata", internalType: "uint16", type: "uint16" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "forwarder", internalType: "address", type: "address" }],
    name: "isTrustedForwarder",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "latestQueuedRulesetOf",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint48", type: "uint48" },
          { name: "id", internalType: "uint48", type: "uint48" },
          { name: "basedOnId", internalType: "uint48", type: "uint48" },
          { name: "start", internalType: "uint48", type: "uint48" },
          { name: "duration", internalType: "uint32", type: "uint32" },
          { name: "weight", internalType: "uint112", type: "uint112" },
          { name: "weightCutPercent", internalType: "uint32", type: "uint32" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      {
        name: "metadata",
        internalType: "struct JBRulesetMetadata",
        type: "tuple",
        components: [
          { name: "reservedPercent", internalType: "uint16", type: "uint16" },
          { name: "cashOutTaxRate", internalType: "uint16", type: "uint16" },
          { name: "baseCurrency", internalType: "uint32", type: "uint32" },
          { name: "pausePay", internalType: "bool", type: "bool" },
          { name: "pauseCreditTransfers", internalType: "bool", type: "bool" },
          { name: "allowOwnerMinting", internalType: "bool", type: "bool" },
          { name: "allowSetCustomToken", internalType: "bool", type: "bool" },
          { name: "allowTerminalMigration", internalType: "bool", type: "bool" },
          { name: "allowSetTerminals", internalType: "bool", type: "bool" },
          { name: "allowSetController", internalType: "bool", type: "bool" },
          { name: "allowAddAccountingContext", internalType: "bool", type: "bool" },
          { name: "allowAddPriceFeed", internalType: "bool", type: "bool" },
          { name: "ownerMustSendPayouts", internalType: "bool", type: "bool" },
          { name: "holdFees", internalType: "bool", type: "bool" },
          { name: "useTotalSurplusForCashOuts", internalType: "bool", type: "bool" },
          { name: "useDataHookForPay", internalType: "bool", type: "bool" },
          { name: "useDataHookForCashOut", internalType: "bool", type: "bool" },
          { name: "dataHook", internalType: "address", type: "address" },
          { name: "metadata", internalType: "uint16", type: "uint16" },
        ],
      },
      { name: "approvalStatus", internalType: "enum JBApprovalStatus", type: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "owner", internalType: "address", type: "address" },
      { name: "projectUri", internalType: "string", type: "string" },
      {
        name: "rulesetConfigurations",
        internalType: "struct JBRulesetConfig[]",
        type: "tuple[]",
        components: [
          { name: "mustStartAtOrAfter", internalType: "uint48", type: "uint48" },
          { name: "duration", internalType: "uint32", type: "uint32" },
          { name: "weight", internalType: "uint112", type: "uint112" },
          { name: "weightCutPercent", internalType: "uint32", type: "uint32" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          {
            name: "metadata",
            internalType: "struct JBRulesetMetadata",
            type: "tuple",
            components: [
              { name: "reservedPercent", internalType: "uint16", type: "uint16" },
              { name: "cashOutTaxRate", internalType: "uint16", type: "uint16" },
              { name: "baseCurrency", internalType: "uint32", type: "uint32" },
              { name: "pausePay", internalType: "bool", type: "bool" },
              { name: "pauseCreditTransfers", internalType: "bool", type: "bool" },
              { name: "allowOwnerMinting", internalType: "bool", type: "bool" },
              { name: "allowSetCustomToken", internalType: "bool", type: "bool" },
              { name: "allowTerminalMigration", internalType: "bool", type: "bool" },
              { name: "allowSetTerminals", internalType: "bool", type: "bool" },
              { name: "allowSetController", internalType: "bool", type: "bool" },
              { name: "allowAddAccountingContext", internalType: "bool", type: "bool" },
              { name: "allowAddPriceFeed", internalType: "bool", type: "bool" },
              { name: "ownerMustSendPayouts", internalType: "bool", type: "bool" },
              { name: "holdFees", internalType: "bool", type: "bool" },
              { name: "useTotalSurplusForCashOuts", internalType: "bool", type: "bool" },
              { name: "useDataHookForPay", internalType: "bool", type: "bool" },
              { name: "useDataHookForCashOut", internalType: "bool", type: "bool" },
              { name: "dataHook", internalType: "address", type: "address" },
              { name: "metadata", internalType: "uint16", type: "uint16" },
            ],
          },
          {
            name: "splitGroups",
            internalType: "struct JBSplitGroup[]",
            type: "tuple[]",
            components: [
              { name: "groupId", internalType: "uint256", type: "uint256" },
              {
                name: "splits",
                internalType: "struct JBSplit[]",
                type: "tuple[]",
                components: [
                  { name: "percent", internalType: "uint32", type: "uint32" },
                  { name: "projectId", internalType: "uint64", type: "uint64" },
                  { name: "beneficiary", internalType: "address payable", type: "address" },
                  { name: "preferAddToBalance", internalType: "bool", type: "bool" },
                  { name: "lockedUntil", internalType: "uint48", type: "uint48" },
                  { name: "hook", internalType: "contract IJBSplitHook", type: "address" },
                ],
              },
            ],
          },
          {
            name: "fundAccessLimitGroups",
            internalType: "struct JBFundAccessLimitGroup[]",
            type: "tuple[]",
            components: [
              { name: "terminal", internalType: "address", type: "address" },
              { name: "token", internalType: "address", type: "address" },
              {
                name: "payoutLimits",
                internalType: "struct JBCurrencyAmount[]",
                type: "tuple[]",
                components: [
                  { name: "amount", internalType: "uint224", type: "uint224" },
                  { name: "currency", internalType: "uint32", type: "uint32" },
                ],
              },
              {
                name: "surplusAllowances",
                internalType: "struct JBCurrencyAmount[]",
                type: "tuple[]",
                components: [
                  { name: "amount", internalType: "uint224", type: "uint224" },
                  { name: "currency", internalType: "uint32", type: "uint32" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "terminalConfigurations",
        internalType: "struct JBTerminalConfig[]",
        type: "tuple[]",
        components: [
          { name: "terminal", internalType: "contract IJBTerminal", type: "address" },
          {
            name: "accountingContextsToAccept",
            internalType: "struct JBAccountingContext[]",
            type: "tuple[]",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "decimals", internalType: "uint8", type: "uint8" },
              { name: "currency", internalType: "uint32", type: "uint32" },
            ],
          },
        ],
      },
      { name: "memo", internalType: "string", type: "string" },
    ],
    name: "launchProjectFor",
    outputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      {
        name: "rulesetConfigurations",
        internalType: "struct JBRulesetConfig[]",
        type: "tuple[]",
        components: [
          { name: "mustStartAtOrAfter", internalType: "uint48", type: "uint48" },
          { name: "duration", internalType: "uint32", type: "uint32" },
          { name: "weight", internalType: "uint112", type: "uint112" },
          { name: "weightCutPercent", internalType: "uint32", type: "uint32" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          {
            name: "metadata",
            internalType: "struct JBRulesetMetadata",
            type: "tuple",
            components: [
              { name: "reservedPercent", internalType: "uint16", type: "uint16" },
              { name: "cashOutTaxRate", internalType: "uint16", type: "uint16" },
              { name: "baseCurrency", internalType: "uint32", type: "uint32" },
              { name: "pausePay", internalType: "bool", type: "bool" },
              { name: "pauseCreditTransfers", internalType: "bool", type: "bool" },
              { name: "allowOwnerMinting", internalType: "bool", type: "bool" },
              { name: "allowSetCustomToken", internalType: "bool", type: "bool" },
              { name: "allowTerminalMigration", internalType: "bool", type: "bool" },
              { name: "allowSetTerminals", internalType: "bool", type: "bool" },
              { name: "allowSetController", internalType: "bool", type: "bool" },
              { name: "allowAddAccountingContext", internalType: "bool", type: "bool" },
              { name: "allowAddPriceFeed", internalType: "bool", type: "bool" },
              { name: "ownerMustSendPayouts", internalType: "bool", type: "bool" },
              { name: "holdFees", internalType: "bool", type: "bool" },
              { name: "useTotalSurplusForCashOuts", internalType: "bool", type: "bool" },
              { name: "useDataHookForPay", internalType: "bool", type: "bool" },
              { name: "useDataHookForCashOut", internalType: "bool", type: "bool" },
              { name: "dataHook", internalType: "address", type: "address" },
              { name: "metadata", internalType: "uint16", type: "uint16" },
            ],
          },
          {
            name: "splitGroups",
            internalType: "struct JBSplitGroup[]",
            type: "tuple[]",
            components: [
              { name: "groupId", internalType: "uint256", type: "uint256" },
              {
                name: "splits",
                internalType: "struct JBSplit[]",
                type: "tuple[]",
                components: [
                  { name: "percent", internalType: "uint32", type: "uint32" },
                  { name: "projectId", internalType: "uint64", type: "uint64" },
                  { name: "beneficiary", internalType: "address payable", type: "address" },
                  { name: "preferAddToBalance", internalType: "bool", type: "bool" },
                  { name: "lockedUntil", internalType: "uint48", type: "uint48" },
                  { name: "hook", internalType: "contract IJBSplitHook", type: "address" },
                ],
              },
            ],
          },
          {
            name: "fundAccessLimitGroups",
            internalType: "struct JBFundAccessLimitGroup[]",
            type: "tuple[]",
            components: [
              { name: "terminal", internalType: "address", type: "address" },
              { name: "token", internalType: "address", type: "address" },
              {
                name: "payoutLimits",
                internalType: "struct JBCurrencyAmount[]",
                type: "tuple[]",
                components: [
                  { name: "amount", internalType: "uint224", type: "uint224" },
                  { name: "currency", internalType: "uint32", type: "uint32" },
                ],
              },
              {
                name: "surplusAllowances",
                internalType: "struct JBCurrencyAmount[]",
                type: "tuple[]",
                components: [
                  { name: "amount", internalType: "uint224", type: "uint224" },
                  { name: "currency", internalType: "uint32", type: "uint32" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "terminalConfigurations",
        internalType: "struct JBTerminalConfig[]",
        type: "tuple[]",
        components: [
          { name: "terminal", internalType: "contract IJBTerminal", type: "address" },
          {
            name: "accountingContextsToAccept",
            internalType: "struct JBAccountingContext[]",
            type: "tuple[]",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "decimals", internalType: "uint8", type: "uint8" },
              { name: "currency", internalType: "uint32", type: "uint32" },
            ],
          },
        ],
      },
      { name: "memo", internalType: "string", type: "string" },
    ],
    name: "launchRulesetsFor",
    outputs: [{ name: "rulesetId", internalType: "uint256", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "to", internalType: "contract IERC165", type: "address" },
    ],
    name: "migrate",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "tokenCount", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address", type: "address" },
      { name: "memo", internalType: "string", type: "string" },
      { name: "useReservedPercent", internalType: "bool", type: "bool" },
    ],
    name: "mintTokensOf",
    outputs: [{ name: "beneficiaryTokenCount", internalType: "uint256", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "pendingReservedTokenBalanceOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      {
        name: "rulesetConfigurations",
        internalType: "struct JBRulesetConfig[]",
        type: "tuple[]",
        components: [
          { name: "mustStartAtOrAfter", internalType: "uint48", type: "uint48" },
          { name: "duration", internalType: "uint32", type: "uint32" },
          { name: "weight", internalType: "uint112", type: "uint112" },
          { name: "weightCutPercent", internalType: "uint32", type: "uint32" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          {
            name: "metadata",
            internalType: "struct JBRulesetMetadata",
            type: "tuple",
            components: [
              { name: "reservedPercent", internalType: "uint16", type: "uint16" },
              { name: "cashOutTaxRate", internalType: "uint16", type: "uint16" },
              { name: "baseCurrency", internalType: "uint32", type: "uint32" },
              { name: "pausePay", internalType: "bool", type: "bool" },
              { name: "pauseCreditTransfers", internalType: "bool", type: "bool" },
              { name: "allowOwnerMinting", internalType: "bool", type: "bool" },
              { name: "allowSetCustomToken", internalType: "bool", type: "bool" },
              { name: "allowTerminalMigration", internalType: "bool", type: "bool" },
              { name: "allowSetTerminals", internalType: "bool", type: "bool" },
              { name: "allowSetController", internalType: "bool", type: "bool" },
              { name: "allowAddAccountingContext", internalType: "bool", type: "bool" },
              { name: "allowAddPriceFeed", internalType: "bool", type: "bool" },
              { name: "ownerMustSendPayouts", internalType: "bool", type: "bool" },
              { name: "holdFees", internalType: "bool", type: "bool" },
              { name: "useTotalSurplusForCashOuts", internalType: "bool", type: "bool" },
              { name: "useDataHookForPay", internalType: "bool", type: "bool" },
              { name: "useDataHookForCashOut", internalType: "bool", type: "bool" },
              { name: "dataHook", internalType: "address", type: "address" },
              { name: "metadata", internalType: "uint16", type: "uint16" },
            ],
          },
          {
            name: "splitGroups",
            internalType: "struct JBSplitGroup[]",
            type: "tuple[]",
            components: [
              { name: "groupId", internalType: "uint256", type: "uint256" },
              {
                name: "splits",
                internalType: "struct JBSplit[]",
                type: "tuple[]",
                components: [
                  { name: "percent", internalType: "uint32", type: "uint32" },
                  { name: "projectId", internalType: "uint64", type: "uint64" },
                  { name: "beneficiary", internalType: "address payable", type: "address" },
                  { name: "preferAddToBalance", internalType: "bool", type: "bool" },
                  { name: "lockedUntil", internalType: "uint48", type: "uint48" },
                  { name: "hook", internalType: "contract IJBSplitHook", type: "address" },
                ],
              },
            ],
          },
          {
            name: "fundAccessLimitGroups",
            internalType: "struct JBFundAccessLimitGroup[]",
            type: "tuple[]",
            components: [
              { name: "terminal", internalType: "address", type: "address" },
              { name: "token", internalType: "address", type: "address" },
              {
                name: "payoutLimits",
                internalType: "struct JBCurrencyAmount[]",
                type: "tuple[]",
                components: [
                  { name: "amount", internalType: "uint224", type: "uint224" },
                  { name: "currency", internalType: "uint32", type: "uint32" },
                ],
              },
              {
                name: "surplusAllowances",
                internalType: "struct JBCurrencyAmount[]",
                type: "tuple[]",
                components: [
                  { name: "amount", internalType: "uint224", type: "uint224" },
                  { name: "currency", internalType: "uint32", type: "uint32" },
                ],
              },
            ],
          },
        ],
      },
      { name: "memo", internalType: "string", type: "string" },
    ],
    name: "queueRulesetsOf",
    outputs: [{ name: "rulesetId", internalType: "uint256", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "sendReservedTokensToSplitsOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "setControllerAllowed",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "rulesetId", internalType: "uint256", type: "uint256" },
      {
        name: "splitGroups",
        internalType: "struct JBSplitGroup[]",
        type: "tuple[]",
        components: [
          { name: "groupId", internalType: "uint256", type: "uint256" },
          {
            name: "splits",
            internalType: "struct JBSplit[]",
            type: "tuple[]",
            components: [
              { name: "percent", internalType: "uint32", type: "uint32" },
              { name: "projectId", internalType: "uint64", type: "uint64" },
              { name: "beneficiary", internalType: "address payable", type: "address" },
              { name: "preferAddToBalance", internalType: "bool", type: "bool" },
              { name: "lockedUntil", internalType: "uint48", type: "uint48" },
              { name: "hook", internalType: "contract IJBSplitHook", type: "address" },
            ],
          },
        ],
      },
    ],
    name: "setSplitGroupsOf",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "setTerminalsAllowed",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "contract IJBToken", type: "address" },
    ],
    name: "setTokenFor",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "uri", internalType: "string", type: "string" },
    ],
    name: "setUriOf",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "interfaceId", internalType: "bytes4", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "totalTokenSupplyWithReservedTokensOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "recipient", internalType: "address", type: "address" },
      { name: "creditCount", internalType: "uint256", type: "uint256" },
    ],
    name: "transferCreditsFrom",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [],
    name: "trustedForwarder",
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "upcomingRulesetOf",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint48", type: "uint48" },
          { name: "id", internalType: "uint48", type: "uint48" },
          { name: "basedOnId", internalType: "uint48", type: "uint48" },
          { name: "start", internalType: "uint48", type: "uint48" },
          { name: "duration", internalType: "uint32", type: "uint32" },
          { name: "weight", internalType: "uint112", type: "uint112" },
          { name: "weightCutPercent", internalType: "uint32", type: "uint32" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      {
        name: "metadata",
        internalType: "struct JBRulesetMetadata",
        type: "tuple",
        components: [
          { name: "reservedPercent", internalType: "uint16", type: "uint16" },
          { name: "cashOutTaxRate", internalType: "uint16", type: "uint16" },
          { name: "baseCurrency", internalType: "uint32", type: "uint32" },
          { name: "pausePay", internalType: "bool", type: "bool" },
          { name: "pauseCreditTransfers", internalType: "bool", type: "bool" },
          { name: "allowOwnerMinting", internalType: "bool", type: "bool" },
          { name: "allowSetCustomToken", internalType: "bool", type: "bool" },
          { name: "allowTerminalMigration", internalType: "bool", type: "bool" },
          { name: "allowSetTerminals", internalType: "bool", type: "bool" },
          { name: "allowSetController", internalType: "bool", type: "bool" },
          { name: "allowAddAccountingContext", internalType: "bool", type: "bool" },
          { name: "allowAddPriceFeed", internalType: "bool", type: "bool" },
          { name: "ownerMustSendPayouts", internalType: "bool", type: "bool" },
          { name: "holdFees", internalType: "bool", type: "bool" },
          { name: "useTotalSurplusForCashOuts", internalType: "bool", type: "bool" },
          { name: "useDataHookForPay", internalType: "bool", type: "bool" },
          { name: "useDataHookForCashOut", internalType: "bool", type: "bool" },
          { name: "dataHook", internalType: "address", type: "address" },
          { name: "metadata", internalType: "uint16", type: "uint16" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "uriOf",
    outputs: [{ name: "", internalType: "string", type: "string" }],
    stateMutability: "view",
  },
] as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x27da30646502e2f642be5281322ae8c394f7668a)
 */
export const jbControllerAddress = {
  8453: "0x27da30646502e2f642bE5281322Ae8C394F7668a",
} as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x27da30646502e2f642be5281322ae8c394f7668a)
 */
export const jbControllerConfig = { address: jbControllerAddress, abi: jbControllerAbi } as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBDirectory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x0061e516886a0540f63157f112c0588ee0651dcf)
 */
export const jbDirectoryAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "permissions", internalType: "contract IJBPermissions", type: "address" },
      { name: "projects", internalType: "contract IJBProjects", type: "address" },
      { name: "owner", internalType: "address", type: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "error",
    inputs: [{ name: "terminal", internalType: "contract IJBTerminal", type: "address" }],
    name: "JBDirectory_DuplicateTerminals",
  },
  {
    type: "error",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "limit", internalType: "uint256", type: "uint256" },
    ],
    name: "JBDirectory_InvalidProjectIdInDirectory",
  },
  { type: "error", inputs: [], name: "JBDirectory_SetControllerNotAllowed" },
  { type: "error", inputs: [], name: "JBDirectory_SetTerminalsNotAllowed" },
  {
    type: "error",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "terminal", internalType: "contract IJBTerminal", type: "address" },
    ],
    name: "JBDirectory_TokenNotAccepted",
  },
  {
    type: "error",
    inputs: [
      { name: "account", internalType: "address", type: "address" },
      { name: "sender", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "permissionId", internalType: "uint256", type: "uint256" },
    ],
    name: "JBPermissioned_Unauthorized",
  },
  {
    type: "error",
    inputs: [{ name: "owner", internalType: "address", type: "address" }],
    name: "OwnableInvalidOwner",
  },
  {
    type: "error",
    inputs: [{ name: "account", internalType: "address", type: "address" }],
    name: "OwnableUnauthorizedAccount",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "terminal", internalType: "contract IJBTerminal", type: "address", indexed: true },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "AddTerminal",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "previousOwner", internalType: "address", type: "address", indexed: true },
      { name: "newOwner", internalType: "address", type: "address", indexed: true },
    ],
    name: "OwnershipTransferred",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "controller", internalType: "contract IERC165", type: "address", indexed: true },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "SetController",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "addr", internalType: "address", type: "address", indexed: true },
      { name: "isAllowed", internalType: "bool", type: "bool", indexed: true },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "SetIsAllowedToSetFirstController",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "token", internalType: "address", type: "address", indexed: true },
      { name: "terminal", internalType: "contract IJBTerminal", type: "address", indexed: true },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "SetPrimaryTerminal",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      {
        name: "terminals",
        internalType: "contract IJBTerminal[]",
        type: "address[]",
        indexed: false,
      },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "SetTerminals",
  },
  {
    type: "function",
    inputs: [],
    name: "PERMISSIONS",
    outputs: [{ name: "", internalType: "contract IJBPermissions", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "PROJECTS",
    outputs: [{ name: "", internalType: "contract IJBProjects", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "controllerOf",
    outputs: [{ name: "", internalType: "contract IERC165", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "addr", internalType: "address", type: "address" }],
    name: "isAllowedToSetFirstController",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "terminal", internalType: "contract IJBTerminal", type: "address" },
    ],
    name: "isTerminalOf",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "owner",
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
    ],
    name: "primaryTerminalOf",
    outputs: [{ name: "", internalType: "contract IJBTerminal", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "controller", internalType: "contract IERC165", type: "address" },
    ],
    name: "setControllerOf",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "addr", internalType: "address", type: "address" },
      { name: "flag", internalType: "bool", type: "bool" },
    ],
    name: "setIsAllowedToSetFirstController",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "terminal", internalType: "contract IJBTerminal", type: "address" },
    ],
    name: "setPrimaryTerminalOf",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "terminals", internalType: "contract IJBTerminal[]", type: "address[]" },
    ],
    name: "setTerminalsOf",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "terminalsOf",
    outputs: [{ name: "", internalType: "contract IJBTerminal[]", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "newOwner", internalType: "address", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x0061e516886a0540f63157f112c0588ee0651dcf)
 */
export const jbDirectoryAddress = {
  8453: "0x0061E516886A0540F63157f112C0588eE0651dCF",
} as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x0061e516886a0540f63157f112c0588ee0651dcf)
 */
export const jbDirectoryConfig = { address: jbDirectoryAddress, abi: jbDirectoryAbi } as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBMultiTerminal
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x2db6d704058e552defe415753465df8df0361846)
 */
export const jbMultiTerminalAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "feelessAddresses", internalType: "contract IJBFeelessAddresses", type: "address" },
      { name: "permissions", internalType: "contract IJBPermissions", type: "address" },
      { name: "projects", internalType: "contract IJBProjects", type: "address" },
      { name: "splits", internalType: "contract IJBSplits", type: "address" },
      { name: "store", internalType: "contract IJBTerminalStore", type: "address" },
      { name: "tokens", internalType: "contract IJBTokens", type: "address" },
      { name: "permit2", internalType: "contract IPermit2", type: "address" },
      { name: "trustedForwarder", internalType: "address", type: "address" },
    ],
    stateMutability: "nonpayable",
  },
  { type: "error", inputs: [], name: "FailedCall" },
  {
    type: "error",
    inputs: [
      { name: "balance", internalType: "uint256", type: "uint256" },
      { name: "needed", internalType: "uint256", type: "uint256" },
    ],
    name: "InsufficientBalance",
  },
  {
    type: "error",
    inputs: [{ name: "token", internalType: "address", type: "address" }],
    name: "JBMultiTerminal_AccountingContextAlreadySet",
  },
  { type: "error", inputs: [], name: "JBMultiTerminal_AddingAccountingContextNotAllowed" },
  { type: "error", inputs: [], name: "JBMultiTerminal_FeeTerminalNotFound" },
  {
    type: "error",
    inputs: [{ name: "value", internalType: "uint256", type: "uint256" }],
    name: "JBMultiTerminal_NoMsgValueAllowed",
  },
  {
    type: "error",
    inputs: [
      { name: "value", internalType: "uint256", type: "uint256" },
      { name: "limit", internalType: "uint256", type: "uint256" },
    ],
    name: "JBMultiTerminal_OverflowAlert",
  },
  {
    type: "error",
    inputs: [
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "allowance", internalType: "uint256", type: "uint256" },
    ],
    name: "JBMultiTerminal_PermitAllowanceNotEnough",
  },
  {
    type: "error",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
    ],
    name: "JBMultiTerminal_RecipientProjectTerminalNotFound",
  },
  {
    type: "error",
    inputs: [{ name: "hook", internalType: "contract IJBSplitHook", type: "address" }],
    name: "JBMultiTerminal_SplitHookInvalid",
  },
  { type: "error", inputs: [], name: "JBMultiTerminal_TerminalTokensIncompatible" },
  {
    type: "error",
    inputs: [{ name: "token", internalType: "address", type: "address" }],
    name: "JBMultiTerminal_TokenNotAccepted",
  },
  {
    type: "error",
    inputs: [
      { name: "count", internalType: "uint256", type: "uint256" },
      { name: "min", internalType: "uint256", type: "uint256" },
    ],
    name: "JBMultiTerminal_UnderMinReturnedTokens",
  },
  {
    type: "error",
    inputs: [
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "min", internalType: "uint256", type: "uint256" },
    ],
    name: "JBMultiTerminal_UnderMinTokensPaidOut",
  },
  {
    type: "error",
    inputs: [
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "min", internalType: "uint256", type: "uint256" },
    ],
    name: "JBMultiTerminal_UnderMinTokensReclaimed",
  },
  { type: "error", inputs: [], name: "JBMultiTerminal_ZeroAccountingContextCurrency" },
  { type: "error", inputs: [], name: "JBMultiTerminal_ZeroAccountingContextDecimals" },
  {
    type: "error",
    inputs: [
      { name: "account", internalType: "address", type: "address" },
      { name: "sender", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "permissionId", internalType: "uint256", type: "uint256" },
    ],
    name: "JBPermissioned_Unauthorized",
  },
  {
    type: "error",
    inputs: [
      { name: "x", internalType: "uint256", type: "uint256" },
      { name: "y", internalType: "uint256", type: "uint256" },
      { name: "denominator", internalType: "uint256", type: "uint256" },
    ],
    name: "PRBMath_MulDiv_Overflow",
  },
  {
    type: "error",
    inputs: [{ name: "token", internalType: "address", type: "address" }],
    name: "SafeERC20FailedOperation",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "amount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "returnedFees", internalType: "uint256", type: "uint256", indexed: false },
      { name: "memo", internalType: "string", type: "string", indexed: false },
      { name: "metadata", internalType: "bytes", type: "bytes", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "AddToBalance",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "rulesetId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "rulesetCycleNumber", internalType: "uint256", type: "uint256", indexed: true },
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "holder", internalType: "address", type: "address", indexed: false },
      { name: "beneficiary", internalType: "address", type: "address", indexed: false },
      { name: "cashOutCount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "cashOutTaxRate", internalType: "uint256", type: "uint256", indexed: false },
      { name: "reclaimAmount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "metadata", internalType: "bytes", type: "bytes", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "CashOutTokens",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "token", internalType: "address", type: "address", indexed: true },
      { name: "feeProjectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "amount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "reason", internalType: "bytes", type: "bytes", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "FeeReverted",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "token", internalType: "address", type: "address", indexed: true },
      { name: "amount", internalType: "uint256", type: "uint256", indexed: true },
      { name: "fee", internalType: "uint256", type: "uint256", indexed: false },
      { name: "beneficiary", internalType: "address", type: "address", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "HoldFee",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "hook", internalType: "contract IJBCashOutHook", type: "address", indexed: true },
      {
        name: "context",
        internalType: "struct JBAfterCashOutRecordedContext",
        type: "tuple",
        components: [
          { name: "holder", internalType: "address", type: "address" },
          { name: "projectId", internalType: "uint256", type: "uint256" },
          { name: "rulesetId", internalType: "uint256", type: "uint256" },
          { name: "cashOutCount", internalType: "uint256", type: "uint256" },
          {
            name: "reclaimedAmount",
            internalType: "struct JBTokenAmount",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "decimals", internalType: "uint8", type: "uint8" },
              { name: "currency", internalType: "uint32", type: "uint32" },
              { name: "value", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "forwardedAmount",
            internalType: "struct JBTokenAmount",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "decimals", internalType: "uint8", type: "uint8" },
              { name: "currency", internalType: "uint32", type: "uint32" },
              { name: "value", internalType: "uint256", type: "uint256" },
            ],
          },
          { name: "cashOutTaxRate", internalType: "uint256", type: "uint256" },
          { name: "beneficiary", internalType: "address payable", type: "address" },
          { name: "hookMetadata", internalType: "bytes", type: "bytes" },
          { name: "cashOutMetadata", internalType: "bytes", type: "bytes" },
        ],
        indexed: false,
      },
      { name: "specificationAmount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "fee", internalType: "uint256", type: "uint256", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "HookAfterRecordCashOut",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "hook", internalType: "contract IJBPayHook", type: "address", indexed: true },
      {
        name: "context",
        internalType: "struct JBAfterPayRecordedContext",
        type: "tuple",
        components: [
          { name: "payer", internalType: "address", type: "address" },
          { name: "projectId", internalType: "uint256", type: "uint256" },
          { name: "rulesetId", internalType: "uint256", type: "uint256" },
          {
            name: "amount",
            internalType: "struct JBTokenAmount",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "decimals", internalType: "uint8", type: "uint8" },
              { name: "currency", internalType: "uint32", type: "uint32" },
              { name: "value", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "forwardedAmount",
            internalType: "struct JBTokenAmount",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "decimals", internalType: "uint8", type: "uint8" },
              { name: "currency", internalType: "uint32", type: "uint32" },
              { name: "value", internalType: "uint256", type: "uint256" },
            ],
          },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "newlyIssuedTokenCount", internalType: "uint256", type: "uint256" },
          { name: "beneficiary", internalType: "address", type: "address" },
          { name: "hookMetadata", internalType: "bytes", type: "bytes" },
          { name: "payerMetadata", internalType: "bytes", type: "bytes" },
        ],
        indexed: false,
      },
      { name: "specificationAmount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "HookAfterRecordPay",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "token", internalType: "address", type: "address", indexed: true },
      { name: "to", internalType: "contract IJBTerminal", type: "address", indexed: true },
      { name: "amount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "MigrateTerminal",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "rulesetId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "rulesetCycleNumber", internalType: "uint256", type: "uint256", indexed: true },
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "payer", internalType: "address", type: "address", indexed: false },
      { name: "beneficiary", internalType: "address", type: "address", indexed: false },
      { name: "amount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "newlyIssuedTokenCount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "memo", internalType: "string", type: "string", indexed: false },
      { name: "metadata", internalType: "bytes", type: "bytes", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "Pay",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      {
        name: "split",
        internalType: "struct JBSplit",
        type: "tuple",
        components: [
          { name: "percent", internalType: "uint32", type: "uint32" },
          { name: "projectId", internalType: "uint64", type: "uint64" },
          { name: "beneficiary", internalType: "address payable", type: "address" },
          { name: "preferAddToBalance", internalType: "bool", type: "bool" },
          { name: "lockedUntil", internalType: "uint48", type: "uint48" },
          { name: "hook", internalType: "contract IJBSplitHook", type: "address" },
        ],
        indexed: false,
      },
      { name: "amount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "reason", internalType: "bytes", type: "bytes", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "PayoutReverted",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "addr", internalType: "address", type: "address", indexed: false },
      { name: "token", internalType: "address", type: "address", indexed: false },
      { name: "amount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "fee", internalType: "uint256", type: "uint256", indexed: false },
      { name: "reason", internalType: "bytes", type: "bytes", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "PayoutTransferReverted",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "token", internalType: "address", type: "address", indexed: true },
      { name: "amount", internalType: "uint256", type: "uint256", indexed: true },
      { name: "wasHeld", internalType: "bool", type: "bool", indexed: false },
      { name: "beneficiary", internalType: "address", type: "address", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "ProcessFee",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "token", internalType: "address", type: "address", indexed: true },
      { name: "amount", internalType: "uint256", type: "uint256", indexed: true },
      { name: "returnedFees", internalType: "uint256", type: "uint256", indexed: false },
      { name: "leftoverAmount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "ReturnHeldFees",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "rulesetId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "group", internalType: "uint256", type: "uint256", indexed: true },
      {
        name: "split",
        internalType: "struct JBSplit",
        type: "tuple",
        components: [
          { name: "percent", internalType: "uint32", type: "uint32" },
          { name: "projectId", internalType: "uint64", type: "uint64" },
          { name: "beneficiary", internalType: "address payable", type: "address" },
          { name: "preferAddToBalance", internalType: "bool", type: "bool" },
          { name: "lockedUntil", internalType: "uint48", type: "uint48" },
          { name: "hook", internalType: "contract IJBSplitHook", type: "address" },
        ],
        indexed: false,
      },
      { name: "amount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "netAmount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "SendPayoutToSplit",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "rulesetId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "rulesetCycleNumber", internalType: "uint256", type: "uint256", indexed: true },
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "projectOwner", internalType: "address", type: "address", indexed: false },
      { name: "amount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "amountPaidOut", internalType: "uint256", type: "uint256", indexed: false },
      { name: "fee", internalType: "uint256", type: "uint256", indexed: false },
      { name: "netLeftoverPayoutAmount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "SendPayouts",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      {
        name: "context",
        internalType: "struct JBAccountingContext",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
        indexed: false,
      },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "SetAccountingContext",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "rulesetId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "rulesetCycleNumber", internalType: "uint256", type: "uint256", indexed: true },
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "beneficiary", internalType: "address", type: "address", indexed: false },
      { name: "feeBeneficiary", internalType: "address", type: "address", indexed: false },
      { name: "amount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "amountPaidOut", internalType: "uint256", type: "uint256", indexed: false },
      { name: "netAmountPaidOut", internalType: "uint256", type: "uint256", indexed: false },
      { name: "memo", internalType: "string", type: "string", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "UseAllowance",
  },
  {
    type: "function",
    inputs: [],
    name: "DIRECTORY",
    outputs: [{ name: "", internalType: "contract IJBDirectory", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "FEE",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "FEELESS_ADDRESSES",
    outputs: [{ name: "", internalType: "contract IJBFeelessAddresses", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "PERMISSIONS",
    outputs: [{ name: "", internalType: "contract IJBPermissions", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "PERMIT2",
    outputs: [{ name: "", internalType: "contract IPermit2", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "PROJECTS",
    outputs: [{ name: "", internalType: "contract IJBProjects", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "RULESETS",
    outputs: [{ name: "", internalType: "contract IJBRulesets", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "SPLITS",
    outputs: [{ name: "", internalType: "contract IJBSplits", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "STORE",
    outputs: [{ name: "", internalType: "contract IJBTerminalStore", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "TOKENS",
    outputs: [{ name: "", internalType: "contract IJBTokens", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
    ],
    name: "accountingContextForTokenOf",
    outputs: [
      {
        name: "",
        internalType: "struct JBAccountingContext",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "accountingContextsOf",
    outputs: [
      {
        name: "",
        internalType: "struct JBAccountingContext[]",
        type: "tuple[]",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      {
        name: "accountingContexts",
        internalType: "struct JBAccountingContext[]",
        type: "tuple[]",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
    ],
    name: "addAccountingContextsFor",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "shouldReturnHeldFees", internalType: "bool", type: "bool" },
      { name: "memo", internalType: "string", type: "string" },
      { name: "metadata", internalType: "bytes", type: "bytes" },
    ],
    name: "addToBalanceOf",
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "cashOutCount", internalType: "uint256", type: "uint256" },
      { name: "tokenToReclaim", internalType: "address", type: "address" },
      { name: "minTokensReclaimed", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address payable", type: "address" },
      { name: "metadata", internalType: "bytes", type: "bytes" },
    ],
    name: "cashOutTokensOf",
    outputs: [{ name: "reclaimAmount", internalType: "uint256", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      {
        name: "accountingContexts",
        internalType: "struct JBAccountingContext[]",
        type: "tuple[]",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
      { name: "decimals", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
    ],
    name: "currentSurplusOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "split",
        internalType: "struct JBSplit",
        type: "tuple",
        components: [
          { name: "percent", internalType: "uint32", type: "uint32" },
          { name: "projectId", internalType: "uint64", type: "uint64" },
          { name: "beneficiary", internalType: "address payable", type: "address" },
          { name: "preferAddToBalance", internalType: "bool", type: "bool" },
          { name: "lockedUntil", internalType: "uint48", type: "uint48" },
          { name: "hook", internalType: "contract IJBSplitHook", type: "address" },
        ],
      },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "originalMessageSender", internalType: "address", type: "address" },
    ],
    name: "executePayout",
    outputs: [{ name: "netPayoutAmount", internalType: "uint256", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address", type: "address" },
      { name: "feeTerminal", internalType: "contract IJBTerminal", type: "address" },
    ],
    name: "executeProcessFee",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "addr", internalType: "address payable", type: "address" },
      { name: "token", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "executeTransferTo",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "count", internalType: "uint256", type: "uint256" },
    ],
    name: "heldFeesOf",
    outputs: [
      {
        name: "heldFees",
        internalType: "struct JBFee[]",
        type: "tuple[]",
        components: [
          { name: "amount", internalType: "uint256", type: "uint256" },
          { name: "beneficiary", internalType: "address", type: "address" },
          { name: "unlockTimestamp", internalType: "uint48", type: "uint48" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "forwarder", internalType: "address", type: "address" }],
    name: "isTrustedForwarder",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "to", internalType: "contract IJBTerminal", type: "address" },
    ],
    name: "migrateBalanceOf",
    outputs: [{ name: "balance", internalType: "uint256", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address", type: "address" },
      { name: "minReturnedTokens", internalType: "uint256", type: "uint256" },
      { name: "memo", internalType: "string", type: "string" },
      { name: "metadata", internalType: "bytes", type: "bytes" },
    ],
    name: "pay",
    outputs: [{ name: "beneficiaryTokenCount", internalType: "uint256", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "count", internalType: "uint256", type: "uint256" },
    ],
    name: "processHeldFeesOf",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
      { name: "minTokensPaidOut", internalType: "uint256", type: "uint256" },
    ],
    name: "sendPayoutsOf",
    outputs: [{ name: "amountPaidOut", internalType: "uint256", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "interfaceId", internalType: "bytes4", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    inputs: [],
    name: "trustedForwarder",
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
      { name: "minTokensPaidOut", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address payable", type: "address" },
      { name: "feeBeneficiary", internalType: "address payable", type: "address" },
      { name: "memo", internalType: "string", type: "string" },
    ],
    name: "useAllowanceOf",
    outputs: [{ name: "netAmountPaidOut", internalType: "uint256", type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x2db6d704058e552defe415753465df8df0361846)
 */
export const jbMultiTerminalAddress = {
  8453: "0x2dB6d704058E552DeFE415753465df8dF0361846",
} as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x2db6d704058e552defe415753465df8df0361846)
 */
export const jbMultiTerminalConfig = {
  address: jbMultiTerminalAddress,
  abi: jbMultiTerminalAbi,
} as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBPermissions
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x04fD6913d6c32D8C216e153a43C04b1857a7793d)
 */
export const jbPermissionsAbi = [
  {
    type: "constructor",
    inputs: [{ name: "trustedForwarder", internalType: "address", type: "address" }],
    stateMutability: "nonpayable",
  },
  { type: "error", inputs: [], name: "JBPermissions_CantSetRootPermissionForWildcardProject" },
  { type: "error", inputs: [], name: "JBPermissions_NoZeroPermission" },
  {
    type: "error",
    inputs: [{ name: "permissionId", internalType: "uint256", type: "uint256" }],
    name: "JBPermissions_PermissionIdOutOfBounds",
  },
  { type: "error", inputs: [], name: "JBPermissions_Unauthorized" },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "operator", internalType: "address", type: "address", indexed: true },
      { name: "account", internalType: "address", type: "address", indexed: true },
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "permissionIds", internalType: "uint8[]", type: "uint8[]", indexed: false },
      { name: "packed", internalType: "uint256", type: "uint256", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "OperatorPermissionsSet",
  },
  {
    type: "function",
    inputs: [],
    name: "WILDCARD_PROJECT_ID",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "operator", internalType: "address", type: "address" },
      { name: "account", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "permissionId", internalType: "uint256", type: "uint256" },
      { name: "includeRoot", internalType: "bool", type: "bool" },
      { name: "includeWildcardProjectId", internalType: "bool", type: "bool" },
    ],
    name: "hasPermission",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "operator", internalType: "address", type: "address" },
      { name: "account", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "permissionIds", internalType: "uint256[]", type: "uint256[]" },
      { name: "includeRoot", internalType: "bool", type: "bool" },
      { name: "includeWildcardProjectId", internalType: "bool", type: "bool" },
    ],
    name: "hasPermissions",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "forwarder", internalType: "address", type: "address" }],
    name: "isTrustedForwarder",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "operator", internalType: "address", type: "address" },
      { name: "account", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
    ],
    name: "permissionsOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "account", internalType: "address", type: "address" },
      {
        name: "permissionsData",
        internalType: "struct JBPermissionsData",
        type: "tuple",
        components: [
          { name: "operator", internalType: "address", type: "address" },
          { name: "projectId", internalType: "uint64", type: "uint64" },
          { name: "permissionIds", internalType: "uint8[]", type: "uint8[]" },
        ],
      },
    ],
    name: "setPermissionsFor",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [],
    name: "trustedForwarder",
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
] as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x04fD6913d6c32D8C216e153a43C04b1857a7793d)
 */
export const jbPermissionsAddress = {
  8453: "0x04fD6913d6c32D8C216e153a43C04b1857a7793d",
} as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x04fD6913d6c32D8C216e153a43C04b1857a7793d)
 */
export const jbPermissionsConfig = {
  address: jbPermissionsAddress,
  abi: jbPermissionsAbi,
} as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBTerminalStore
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0xfE33B439Ec53748C87DcEDACb83f05aDd5014744)
 */
export const jbTerminalStoreAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "directory", internalType: "contract IJBDirectory", type: "address" },
      { name: "prices", internalType: "contract IJBPrices", type: "address" },
      { name: "rulesets", internalType: "contract IJBRulesets", type: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "error",
    inputs: [
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "allowance", internalType: "uint256", type: "uint256" },
    ],
    name: "JBTerminalStore_InadequateControllerAllowance",
  },
  {
    type: "error",
    inputs: [
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "limit", internalType: "uint256", type: "uint256" },
    ],
    name: "JBTerminalStore_InadequateControllerPayoutLimit",
  },
  {
    type: "error",
    inputs: [
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "balance", internalType: "uint256", type: "uint256" },
    ],
    name: "JBTerminalStore_InadequateTerminalStoreBalance",
  },
  {
    type: "error",
    inputs: [
      { name: "count", internalType: "uint256", type: "uint256" },
      { name: "totalSupply", internalType: "uint256", type: "uint256" },
    ],
    name: "JBTerminalStore_InsufficientTokens",
  },
  {
    type: "error",
    inputs: [
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "paidAmount", internalType: "uint256", type: "uint256" },
    ],
    name: "JBTerminalStore_InvalidAmountToForwardHook",
  },
  { type: "error", inputs: [], name: "JBTerminalStore_RulesetNotFound" },
  { type: "error", inputs: [], name: "JBTerminalStore_RulesetPaymentPaused" },
  { type: "error", inputs: [], name: "JBTerminalStore_TerminalMigrationNotAllowed" },
  {
    type: "error",
    inputs: [
      { name: "x", internalType: "uint256", type: "uint256" },
      { name: "y", internalType: "uint256", type: "uint256" },
      { name: "denominator", internalType: "uint256", type: "uint256" },
    ],
    name: "PRBMath_MulDiv_Overflow",
  },
  {
    type: "function",
    inputs: [],
    name: "DIRECTORY",
    outputs: [{ name: "", internalType: "contract IJBDirectory", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "PRICES",
    outputs: [{ name: "", internalType: "contract IJBPrices", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "RULESETS",
    outputs: [{ name: "", internalType: "contract IJBRulesets", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "terminal", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
    ],
    name: "balanceOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "cashOutCount", internalType: "uint256", type: "uint256" },
      { name: "totalSupply", internalType: "uint256", type: "uint256" },
      { name: "surplus", internalType: "uint256", type: "uint256" },
    ],
    name: "currentReclaimableSurplusOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "cashOutCount", internalType: "uint256", type: "uint256" },
      { name: "terminals", internalType: "contract IJBTerminal[]", type: "address[]" },
      {
        name: "accountingContexts",
        internalType: "struct JBAccountingContext[]",
        type: "tuple[]",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
      { name: "decimals", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
    ],
    name: "currentReclaimableSurplusOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "terminal", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      {
        name: "accountingContexts",
        internalType: "struct JBAccountingContext[]",
        type: "tuple[]",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
      { name: "decimals", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
    ],
    name: "currentSurplusOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "decimals", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
    ],
    name: "currentTotalSurplusOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "recordAddedBalanceFor",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "cashOutCount", internalType: "uint256", type: "uint256" },
      {
        name: "accountingContext",
        internalType: "struct JBAccountingContext",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
      {
        name: "balanceAccountingContexts",
        internalType: "struct JBAccountingContext[]",
        type: "tuple[]",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
      { name: "metadata", internalType: "bytes", type: "bytes" },
    ],
    name: "recordCashOutFor",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint48", type: "uint48" },
          { name: "id", internalType: "uint48", type: "uint48" },
          { name: "basedOnId", internalType: "uint48", type: "uint48" },
          { name: "start", internalType: "uint48", type: "uint48" },
          { name: "duration", internalType: "uint32", type: "uint32" },
          { name: "weight", internalType: "uint112", type: "uint112" },
          { name: "weightCutPercent", internalType: "uint32", type: "uint32" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "reclaimAmount", internalType: "uint256", type: "uint256" },
      { name: "cashOutTaxRate", internalType: "uint256", type: "uint256" },
      {
        name: "hookSpecifications",
        internalType: "struct JBCashOutHookSpecification[]",
        type: "tuple[]",
        components: [
          { name: "hook", internalType: "contract IJBCashOutHook", type: "address" },
          { name: "amount", internalType: "uint256", type: "uint256" },
          { name: "metadata", internalType: "bytes", type: "bytes" },
        ],
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "payer", internalType: "address", type: "address" },
      {
        name: "amount",
        internalType: "struct JBTokenAmount",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
          { name: "value", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address", type: "address" },
      { name: "metadata", internalType: "bytes", type: "bytes" },
    ],
    name: "recordPaymentFrom",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint48", type: "uint48" },
          { name: "id", internalType: "uint48", type: "uint48" },
          { name: "basedOnId", internalType: "uint48", type: "uint48" },
          { name: "start", internalType: "uint48", type: "uint48" },
          { name: "duration", internalType: "uint32", type: "uint32" },
          { name: "weight", internalType: "uint112", type: "uint112" },
          { name: "weightCutPercent", internalType: "uint32", type: "uint32" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "tokenCount", internalType: "uint256", type: "uint256" },
      {
        name: "hookSpecifications",
        internalType: "struct JBPayHookSpecification[]",
        type: "tuple[]",
        components: [
          { name: "hook", internalType: "contract IJBPayHook", type: "address" },
          { name: "amount", internalType: "uint256", type: "uint256" },
          { name: "metadata", internalType: "bytes", type: "bytes" },
        ],
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      {
        name: "accountingContext",
        internalType: "struct JBAccountingContext",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
    ],
    name: "recordPayoutFor",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint48", type: "uint48" },
          { name: "id", internalType: "uint48", type: "uint48" },
          { name: "basedOnId", internalType: "uint48", type: "uint48" },
          { name: "start", internalType: "uint48", type: "uint48" },
          { name: "duration", internalType: "uint32", type: "uint32" },
          { name: "weight", internalType: "uint112", type: "uint112" },
          { name: "weightCutPercent", internalType: "uint32", type: "uint32" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "amountPaidOut", internalType: "uint256", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
    ],
    name: "recordTerminalMigration",
    outputs: [{ name: "balance", internalType: "uint256", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      {
        name: "accountingContext",
        internalType: "struct JBAccountingContext",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
    ],
    name: "recordUsedAllowanceOf",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint48", type: "uint48" },
          { name: "id", internalType: "uint48", type: "uint48" },
          { name: "basedOnId", internalType: "uint48", type: "uint48" },
          { name: "start", internalType: "uint48", type: "uint48" },
          { name: "duration", internalType: "uint32", type: "uint32" },
          { name: "weight", internalType: "uint112", type: "uint112" },
          { name: "weightCutPercent", internalType: "uint32", type: "uint32" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "usedAmount", internalType: "uint256", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "terminal", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "rulesetCycleNumber", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
    ],
    name: "usedPayoutLimitOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "terminal", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "rulesetId", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
    ],
    name: "usedSurplusAllowanceOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0xfE33B439Ec53748C87DcEDACb83f05aDd5014744)
 */
export const jbTerminalStoreAddress = {
  8453: "0xfE33B439Ec53748C87DcEDACb83f05aDd5014744",
} as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0xfE33B439Ec53748C87DcEDACb83f05aDd5014744)
 */
export const jbTerminalStoreConfig = {
  address: jbTerminalStoreAddress,
  abi: jbTerminalStoreAbi,
} as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBTokens
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x4d0edd347fb1fa21589c1e109b3474924be87636)
 */
export const jbTokensAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "directory", internalType: "contract IJBDirectory", type: "address" },
      { name: "token", internalType: "contract IJBToken", type: "address" },
    ],
    stateMutability: "nonpayable",
  },
  { type: "error", inputs: [], name: "FailedDeployment" },
  {
    type: "error",
    inputs: [
      { name: "balance", internalType: "uint256", type: "uint256" },
      { name: "needed", internalType: "uint256", type: "uint256" },
    ],
    name: "InsufficientBalance",
  },
  {
    type: "error",
    inputs: [{ name: "controller", internalType: "address", type: "address" }],
    name: "JBControlled_ControllerUnauthorized",
  },
  { type: "error", inputs: [], name: "JBTokens_EmptyName" },
  { type: "error", inputs: [], name: "JBTokens_EmptySymbol" },
  { type: "error", inputs: [], name: "JBTokens_EmptyToken" },
  {
    type: "error",
    inputs: [
      { name: "count", internalType: "uint256", type: "uint256" },
      { name: "creditBalance", internalType: "uint256", type: "uint256" },
    ],
    name: "JBTokens_InsufficientCredits",
  },
  {
    type: "error",
    inputs: [
      { name: "count", internalType: "uint256", type: "uint256" },
      { name: "tokenBalance", internalType: "uint256", type: "uint256" },
    ],
    name: "JBTokens_InsufficientTokensToBurn",
  },
  {
    type: "error",
    inputs: [
      { name: "value", internalType: "uint256", type: "uint256" },
      { name: "limit", internalType: "uint256", type: "uint256" },
    ],
    name: "JBTokens_OverflowAlert",
  },
  {
    type: "error",
    inputs: [{ name: "token", internalType: "contract IJBToken", type: "address" }],
    name: "JBTokens_ProjectAlreadyHasToken",
  },
  {
    type: "error",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "JBTokens_TokenAlreadyBeingUsed",
  },
  {
    type: "error",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "JBTokens_TokenCantBeAdded",
  },
  { type: "error", inputs: [], name: "JBTokens_TokenNotFound" },
  {
    type: "error",
    inputs: [{ name: "decimals", internalType: "uint256", type: "uint256" }],
    name: "JBTokens_TokensMustHave18Decimals",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "holder", internalType: "address", type: "address", indexed: true },
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "count", internalType: "uint256", type: "uint256", indexed: false },
      { name: "creditBalance", internalType: "uint256", type: "uint256", indexed: false },
      { name: "tokenBalance", internalType: "uint256", type: "uint256", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "Burn",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "holder", internalType: "address", type: "address", indexed: true },
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "creditBalance", internalType: "uint256", type: "uint256", indexed: false },
      { name: "count", internalType: "uint256", type: "uint256", indexed: false },
      { name: "beneficiary", internalType: "address", type: "address", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "ClaimTokens",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "token", internalType: "contract IJBToken", type: "address", indexed: true },
      { name: "name", internalType: "string", type: "string", indexed: false },
      { name: "symbol", internalType: "string", type: "string", indexed: false },
      { name: "salt", internalType: "bytes32", type: "bytes32", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "DeployERC20",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "holder", internalType: "address", type: "address", indexed: true },
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "count", internalType: "uint256", type: "uint256", indexed: false },
      { name: "tokensWereClaimed", internalType: "bool", type: "bool", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "Mint",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "token", internalType: "contract IJBToken", type: "address", indexed: true },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "SetToken",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "holder", internalType: "address", type: "address", indexed: true },
      { name: "projectId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "recipient", internalType: "address", type: "address", indexed: true },
      { name: "count", internalType: "uint256", type: "uint256", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "TransferCredits",
  },
  {
    type: "function",
    inputs: [],
    name: "DIRECTORY",
    outputs: [{ name: "", internalType: "contract IJBDirectory", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "TOKEN",
    outputs: [{ name: "", internalType: "contract IJBToken", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "count", internalType: "uint256", type: "uint256" },
    ],
    name: "burnFrom",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "count", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address", type: "address" },
    ],
    name: "claimTokensFor",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
    ],
    name: "creditBalanceOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "name", internalType: "string", type: "string" },
      { name: "symbol", internalType: "string", type: "string" },
      { name: "salt", internalType: "bytes32", type: "bytes32" },
    ],
    name: "deployERC20For",
    outputs: [{ name: "token", internalType: "contract IJBToken", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "count", internalType: "uint256", type: "uint256" },
    ],
    name: "mintFor",
    outputs: [{ name: "token", internalType: "contract IJBToken", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "token", internalType: "contract IJBToken", type: "address" }],
    name: "projectIdOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "contract IJBToken", type: "address" },
    ],
    name: "setTokenFor",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "tokenOf",
    outputs: [{ name: "", internalType: "contract IJBToken", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
    ],
    name: "totalBalanceOf",
    outputs: [{ name: "balance", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "totalCreditSupplyOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "totalSupplyOf",
    outputs: [{ name: "totalSupply", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "recipient", internalType: "address", type: "address" },
      { name: "count", internalType: "uint256", type: "uint256" },
    ],
    name: "transferCreditsFrom",
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x4d0edd347fb1fa21589c1e109b3474924be87636)
 */
export const jbTokensAddress = {
  8453: "0x4d0Edd347FB1fA21589C1E109B3474924BE87636",
} as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x4d0edd347fb1fa21589c1e109b3474924be87636)
 */
export const jbTokensConfig = { address: jbTokensAddress, abi: jbTokensAbi } as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// REVDeployer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x2cA27BDe7e7D33E353b44c27aCfCf6c78ddE251d)
 */
export const revDeployerAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "controller", internalType: "contract IJBController", type: "address" },
      { name: "suckerRegistry", internalType: "contract IJBSuckerRegistry", type: "address" },
      { name: "feeRevnetId", internalType: "uint256", type: "uint256" },
      { name: "hookDeployer", internalType: "contract IJB721TiersHookDeployer", type: "address" },
      { name: "publisher", internalType: "contract CTPublisher", type: "address" },
      { name: "trustedForwarder", internalType: "address", type: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "error",
    inputs: [
      { name: "x", internalType: "uint256", type: "uint256" },
      { name: "y", internalType: "uint256", type: "uint256" },
      { name: "denominator", internalType: "uint256", type: "uint256" },
    ],
    name: "PRBMath_MulDiv_Overflow",
  },
  { type: "error", inputs: [], name: "REVDeployer_AutoIssuanceBeneficiaryZeroAddress" },
  {
    type: "error",
    inputs: [
      { name: "cashOutDelay", internalType: "uint256", type: "uint256" },
      { name: "blockTimestamp", internalType: "uint256", type: "uint256" },
    ],
    name: "REVDeployer_CashOutDelayNotFinished",
  },
  {
    type: "error",
    inputs: [
      { name: "cashOutTaxRate", internalType: "uint256", type: "uint256" },
      { name: "maxCashOutTaxRate", internalType: "uint256", type: "uint256" },
    ],
    name: "REVDeployer_CashOutsCantBeTurnedOffCompletely",
  },
  {
    type: "error",
    inputs: [
      { name: "token", internalType: "address", type: "address" },
      { name: "terminal", internalType: "address", type: "address" },
    ],
    name: "REVDeployer_LoanSourceDoesntMatchTerminalConfigurations",
  },
  { type: "error", inputs: [], name: "REVDeployer_MustHaveSplits" },
  { type: "error", inputs: [], name: "REVDeployer_NothingToAutoIssue" },
  { type: "error", inputs: [], name: "REVDeployer_RulesetDoesNotAllowDeployingSuckers" },
  {
    type: "error",
    inputs: [{ name: "stageId", internalType: "uint256", type: "uint256" }],
    name: "REVDeployer_StageNotStarted",
  },
  { type: "error", inputs: [], name: "REVDeployer_StageTimesMustIncrease" },
  { type: "error", inputs: [], name: "REVDeployer_StagesRequired" },
  {
    type: "error",
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256" },
      { name: "caller", internalType: "address", type: "address" },
    ],
    name: "REVDeployer_Unauthorized",
  },
  {
    type: "error",
    inputs: [
      { name: "spender", internalType: "address", type: "address" },
      { name: "currentAllowance", internalType: "uint256", type: "uint256" },
      { name: "requestedDecrease", internalType: "uint256", type: "uint256" },
    ],
    name: "SafeERC20FailedDecreaseAllowance",
  },
  {
    type: "error",
    inputs: [{ name: "token", internalType: "address", type: "address" }],
    name: "SafeERC20FailedOperation",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "stageId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "beneficiary", internalType: "address", type: "address", indexed: true },
      { name: "count", internalType: "uint256", type: "uint256", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "AutoIssue",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256", indexed: true },
      {
        name: "configuration",
        internalType: "struct REVConfig",
        type: "tuple",
        components: [
          {
            name: "description",
            internalType: "struct REVDescription",
            type: "tuple",
            components: [
              { name: "name", internalType: "string", type: "string" },
              { name: "ticker", internalType: "string", type: "string" },
              { name: "uri", internalType: "string", type: "string" },
              { name: "salt", internalType: "bytes32", type: "bytes32" },
            ],
          },
          { name: "baseCurrency", internalType: "uint32", type: "uint32" },
          { name: "splitOperator", internalType: "address", type: "address" },
          {
            name: "stageConfigurations",
            internalType: "struct REVStageConfig[]",
            type: "tuple[]",
            components: [
              { name: "startsAtOrAfter", internalType: "uint48", type: "uint48" },
              {
                name: "autoIssuances",
                internalType: "struct REVAutoIssuance[]",
                type: "tuple[]",
                components: [
                  { name: "chainId", internalType: "uint32", type: "uint32" },
                  { name: "count", internalType: "uint104", type: "uint104" },
                  { name: "beneficiary", internalType: "address", type: "address" },
                ],
              },
              { name: "splitPercent", internalType: "uint16", type: "uint16" },
              {
                name: "splits",
                internalType: "struct JBSplit[]",
                type: "tuple[]",
                components: [
                  { name: "percent", internalType: "uint32", type: "uint32" },
                  { name: "projectId", internalType: "uint64", type: "uint64" },
                  { name: "beneficiary", internalType: "address payable", type: "address" },
                  { name: "preferAddToBalance", internalType: "bool", type: "bool" },
                  { name: "lockedUntil", internalType: "uint48", type: "uint48" },
                  { name: "hook", internalType: "contract IJBSplitHook", type: "address" },
                ],
              },
              { name: "initialIssuance", internalType: "uint112", type: "uint112" },
              { name: "issuanceCutFrequency", internalType: "uint32", type: "uint32" },
              { name: "issuanceCutPercent", internalType: "uint32", type: "uint32" },
              { name: "cashOutTaxRate", internalType: "uint16", type: "uint16" },
              { name: "extraMetadata", internalType: "uint16", type: "uint16" },
            ],
          },
          {
            name: "loanSources",
            internalType: "struct REVLoanSource[]",
            type: "tuple[]",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
            ],
          },
          { name: "loans", internalType: "address", type: "address" },
        ],
        indexed: false,
      },
      {
        name: "terminalConfigurations",
        internalType: "struct JBTerminalConfig[]",
        type: "tuple[]",
        components: [
          { name: "terminal", internalType: "contract IJBTerminal", type: "address" },
          {
            name: "accountingContextsToAccept",
            internalType: "struct JBAccountingContext[]",
            type: "tuple[]",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "decimals", internalType: "uint8", type: "uint8" },
              { name: "currency", internalType: "uint32", type: "uint32" },
            ],
          },
        ],
        indexed: false,
      },
      {
        name: "buybackHookConfiguration",
        internalType: "struct REVBuybackHookConfig",
        type: "tuple",
        components: [
          { name: "dataHook", internalType: "contract IJBRulesetDataHook", type: "address" },
          { name: "hookToConfigure", internalType: "contract IJBBuybackHook", type: "address" },
          {
            name: "poolConfigurations",
            internalType: "struct REVBuybackPoolConfig[]",
            type: "tuple[]",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "fee", internalType: "uint24", type: "uint24" },
              { name: "twapWindow", internalType: "uint32", type: "uint32" },
            ],
          },
        ],
        indexed: false,
      },
      {
        name: "suckerDeploymentConfiguration",
        internalType: "struct REVSuckerDeploymentConfig",
        type: "tuple",
        components: [
          {
            name: "deployerConfigurations",
            internalType: "struct JBSuckerDeployerConfig[]",
            type: "tuple[]",
            components: [
              { name: "deployer", internalType: "contract IJBSuckerDeployer", type: "address" },
              {
                name: "mappings",
                internalType: "struct JBTokenMapping[]",
                type: "tuple[]",
                components: [
                  { name: "localToken", internalType: "address", type: "address" },
                  { name: "minGas", internalType: "uint32", type: "uint32" },
                  { name: "remoteToken", internalType: "address", type: "address" },
                  { name: "minBridgeAmount", internalType: "uint256", type: "uint256" },
                ],
              },
            ],
          },
          { name: "salt", internalType: "bytes32", type: "bytes32" },
        ],
        indexed: false,
      },
      {
        name: "rulesetConfigurations",
        internalType: "struct JBRulesetConfig[]",
        type: "tuple[]",
        components: [
          { name: "mustStartAtOrAfter", internalType: "uint48", type: "uint48" },
          { name: "duration", internalType: "uint32", type: "uint32" },
          { name: "weight", internalType: "uint112", type: "uint112" },
          { name: "weightCutPercent", internalType: "uint32", type: "uint32" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          {
            name: "metadata",
            internalType: "struct JBRulesetMetadata",
            type: "tuple",
            components: [
              { name: "reservedPercent", internalType: "uint16", type: "uint16" },
              { name: "cashOutTaxRate", internalType: "uint16", type: "uint16" },
              { name: "baseCurrency", internalType: "uint32", type: "uint32" },
              { name: "pausePay", internalType: "bool", type: "bool" },
              { name: "pauseCreditTransfers", internalType: "bool", type: "bool" },
              { name: "allowOwnerMinting", internalType: "bool", type: "bool" },
              { name: "allowSetCustomToken", internalType: "bool", type: "bool" },
              { name: "allowTerminalMigration", internalType: "bool", type: "bool" },
              { name: "allowSetTerminals", internalType: "bool", type: "bool" },
              { name: "allowSetController", internalType: "bool", type: "bool" },
              { name: "allowAddAccountingContext", internalType: "bool", type: "bool" },
              { name: "allowAddPriceFeed", internalType: "bool", type: "bool" },
              { name: "ownerMustSendPayouts", internalType: "bool", type: "bool" },
              { name: "holdFees", internalType: "bool", type: "bool" },
              { name: "useTotalSurplusForCashOuts", internalType: "bool", type: "bool" },
              { name: "useDataHookForPay", internalType: "bool", type: "bool" },
              { name: "useDataHookForCashOut", internalType: "bool", type: "bool" },
              { name: "dataHook", internalType: "address", type: "address" },
              { name: "metadata", internalType: "uint16", type: "uint16" },
            ],
          },
          {
            name: "splitGroups",
            internalType: "struct JBSplitGroup[]",
            type: "tuple[]",
            components: [
              { name: "groupId", internalType: "uint256", type: "uint256" },
              {
                name: "splits",
                internalType: "struct JBSplit[]",
                type: "tuple[]",
                components: [
                  { name: "percent", internalType: "uint32", type: "uint32" },
                  { name: "projectId", internalType: "uint64", type: "uint64" },
                  { name: "beneficiary", internalType: "address payable", type: "address" },
                  { name: "preferAddToBalance", internalType: "bool", type: "bool" },
                  { name: "lockedUntil", internalType: "uint48", type: "uint48" },
                  { name: "hook", internalType: "contract IJBSplitHook", type: "address" },
                ],
              },
            ],
          },
          {
            name: "fundAccessLimitGroups",
            internalType: "struct JBFundAccessLimitGroup[]",
            type: "tuple[]",
            components: [
              { name: "terminal", internalType: "address", type: "address" },
              { name: "token", internalType: "address", type: "address" },
              {
                name: "payoutLimits",
                internalType: "struct JBCurrencyAmount[]",
                type: "tuple[]",
                components: [
                  { name: "amount", internalType: "uint224", type: "uint224" },
                  { name: "currency", internalType: "uint32", type: "uint32" },
                ],
              },
              {
                name: "surplusAllowances",
                internalType: "struct JBCurrencyAmount[]",
                type: "tuple[]",
                components: [
                  { name: "amount", internalType: "uint224", type: "uint224" },
                  { name: "currency", internalType: "uint32", type: "uint32" },
                ],
              },
            ],
          },
        ],
        indexed: false,
      },
      {
        name: "encodedConfigurationHash",
        internalType: "bytes32",
        type: "bytes32",
        indexed: false,
      },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "DeployRevnet",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256", indexed: true },
      {
        name: "encodedConfigurationHash",
        internalType: "bytes32",
        type: "bytes32",
        indexed: false,
      },
      {
        name: "suckerDeploymentConfiguration",
        internalType: "struct REVSuckerDeploymentConfig",
        type: "tuple",
        components: [
          {
            name: "deployerConfigurations",
            internalType: "struct JBSuckerDeployerConfig[]",
            type: "tuple[]",
            components: [
              { name: "deployer", internalType: "contract IJBSuckerDeployer", type: "address" },
              {
                name: "mappings",
                internalType: "struct JBTokenMapping[]",
                type: "tuple[]",
                components: [
                  { name: "localToken", internalType: "address", type: "address" },
                  { name: "minGas", internalType: "uint32", type: "uint32" },
                  { name: "remoteToken", internalType: "address", type: "address" },
                  { name: "minBridgeAmount", internalType: "uint256", type: "uint256" },
                ],
              },
            ],
          },
          { name: "salt", internalType: "bytes32", type: "bytes32" },
        ],
        indexed: false,
      },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "DeploySuckers",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "newSplitOperator", internalType: "address", type: "address", indexed: true },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "ReplaceSplitOperator",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256", indexed: false },
      { name: "additionalOperator", internalType: "address", type: "address", indexed: false },
      { name: "permissionIds", internalType: "uint256[]", type: "uint256[]", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "SetAdditionalOperator",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "cashOutDelay", internalType: "uint256", type: "uint256", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "SetCashOutDelay",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "stageId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "beneficiary", internalType: "address", type: "address", indexed: true },
      { name: "count", internalType: "uint256", type: "uint256", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "StoreAutoIssuanceAmount",
  },
  {
    type: "function",
    inputs: [],
    name: "CASH_OUT_DELAY",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "CONTROLLER",
    outputs: [{ name: "", internalType: "contract IJBController", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "DIRECTORY",
    outputs: [{ name: "", internalType: "contract IJBDirectory", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "FEE",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "FEE_REVNET_ID",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "HOOK_DEPLOYER",
    outputs: [{ name: "", internalType: "contract IJB721TiersHookDeployer", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "PERMISSIONS",
    outputs: [{ name: "", internalType: "contract IJBPermissions", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "PROJECTS",
    outputs: [{ name: "", internalType: "contract IJBProjects", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "PUBLISHER",
    outputs: [{ name: "", internalType: "contract CTPublisher", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "SUCKER_REGISTRY",
    outputs: [{ name: "", internalType: "contract IJBSuckerRegistry", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "context",
        internalType: "struct JBAfterCashOutRecordedContext",
        type: "tuple",
        components: [
          { name: "holder", internalType: "address", type: "address" },
          { name: "projectId", internalType: "uint256", type: "uint256" },
          { name: "rulesetId", internalType: "uint256", type: "uint256" },
          { name: "cashOutCount", internalType: "uint256", type: "uint256" },
          {
            name: "reclaimedAmount",
            internalType: "struct JBTokenAmount",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "decimals", internalType: "uint8", type: "uint8" },
              { name: "currency", internalType: "uint32", type: "uint32" },
              { name: "value", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "forwardedAmount",
            internalType: "struct JBTokenAmount",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "decimals", internalType: "uint8", type: "uint8" },
              { name: "currency", internalType: "uint32", type: "uint32" },
              { name: "value", internalType: "uint256", type: "uint256" },
            ],
          },
          { name: "cashOutTaxRate", internalType: "uint256", type: "uint256" },
          { name: "beneficiary", internalType: "address payable", type: "address" },
          { name: "hookMetadata", internalType: "bytes", type: "bytes" },
          { name: "cashOutMetadata", internalType: "bytes", type: "bytes" },
        ],
      },
    ],
    name: "afterCashOutRecordedWith",
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256" },
      { name: "stageId", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address", type: "address" },
    ],
    name: "amountToAutoIssue",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256" },
      { name: "stageId", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address", type: "address" },
    ],
    name: "autoIssueFor",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      {
        name: "context",
        internalType: "struct JBBeforeCashOutRecordedContext",
        type: "tuple",
        components: [
          { name: "terminal", internalType: "address", type: "address" },
          { name: "holder", internalType: "address", type: "address" },
          { name: "projectId", internalType: "uint256", type: "uint256" },
          { name: "rulesetId", internalType: "uint256", type: "uint256" },
          { name: "cashOutCount", internalType: "uint256", type: "uint256" },
          { name: "totalSupply", internalType: "uint256", type: "uint256" },
          {
            name: "surplus",
            internalType: "struct JBTokenAmount",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "decimals", internalType: "uint8", type: "uint8" },
              { name: "currency", internalType: "uint32", type: "uint32" },
              { name: "value", internalType: "uint256", type: "uint256" },
            ],
          },
          { name: "useTotalSurplus", internalType: "bool", type: "bool" },
          { name: "cashOutTaxRate", internalType: "uint256", type: "uint256" },
          { name: "metadata", internalType: "bytes", type: "bytes" },
        ],
      },
    ],
    name: "beforeCashOutRecordedWith",
    outputs: [
      { name: "cashOutTaxRate", internalType: "uint256", type: "uint256" },
      { name: "cashOutCount", internalType: "uint256", type: "uint256" },
      { name: "totalSupply", internalType: "uint256", type: "uint256" },
      {
        name: "hookSpecifications",
        internalType: "struct JBCashOutHookSpecification[]",
        type: "tuple[]",
        components: [
          { name: "hook", internalType: "contract IJBCashOutHook", type: "address" },
          { name: "amount", internalType: "uint256", type: "uint256" },
          { name: "metadata", internalType: "bytes", type: "bytes" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "context",
        internalType: "struct JBBeforePayRecordedContext",
        type: "tuple",
        components: [
          { name: "terminal", internalType: "address", type: "address" },
          { name: "payer", internalType: "address", type: "address" },
          {
            name: "amount",
            internalType: "struct JBTokenAmount",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "decimals", internalType: "uint8", type: "uint8" },
              { name: "currency", internalType: "uint32", type: "uint32" },
              { name: "value", internalType: "uint256", type: "uint256" },
            ],
          },
          { name: "projectId", internalType: "uint256", type: "uint256" },
          { name: "rulesetId", internalType: "uint256", type: "uint256" },
          { name: "beneficiary", internalType: "address", type: "address" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "reservedPercent", internalType: "uint256", type: "uint256" },
          { name: "metadata", internalType: "bytes", type: "bytes" },
        ],
      },
    ],
    name: "beforePayRecordedWith",
    outputs: [
      { name: "weight", internalType: "uint256", type: "uint256" },
      {
        name: "hookSpecifications",
        internalType: "struct JBPayHookSpecification[]",
        type: "tuple[]",
        components: [
          { name: "hook", internalType: "contract IJBPayHook", type: "address" },
          { name: "amount", internalType: "uint256", type: "uint256" },
          { name: "metadata", internalType: "bytes", type: "bytes" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "revnetId", internalType: "uint256", type: "uint256" }],
    name: "buybackHookOf",
    outputs: [
      { name: "buybackHook", internalType: "contract IJBRulesetDataHook", type: "address" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "revnetId", internalType: "uint256", type: "uint256" }],
    name: "cashOutDelayOf",
    outputs: [{ name: "cashOutDelay", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256" },
      {
        name: "configuration",
        internalType: "struct REVConfig",
        type: "tuple",
        components: [
          {
            name: "description",
            internalType: "struct REVDescription",
            type: "tuple",
            components: [
              { name: "name", internalType: "string", type: "string" },
              { name: "ticker", internalType: "string", type: "string" },
              { name: "uri", internalType: "string", type: "string" },
              { name: "salt", internalType: "bytes32", type: "bytes32" },
            ],
          },
          { name: "baseCurrency", internalType: "uint32", type: "uint32" },
          { name: "splitOperator", internalType: "address", type: "address" },
          {
            name: "stageConfigurations",
            internalType: "struct REVStageConfig[]",
            type: "tuple[]",
            components: [
              { name: "startsAtOrAfter", internalType: "uint48", type: "uint48" },
              {
                name: "autoIssuances",
                internalType: "struct REVAutoIssuance[]",
                type: "tuple[]",
                components: [
                  { name: "chainId", internalType: "uint32", type: "uint32" },
                  { name: "count", internalType: "uint104", type: "uint104" },
                  { name: "beneficiary", internalType: "address", type: "address" },
                ],
              },
              { name: "splitPercent", internalType: "uint16", type: "uint16" },
              {
                name: "splits",
                internalType: "struct JBSplit[]",
                type: "tuple[]",
                components: [
                  { name: "percent", internalType: "uint32", type: "uint32" },
                  { name: "projectId", internalType: "uint64", type: "uint64" },
                  { name: "beneficiary", internalType: "address payable", type: "address" },
                  { name: "preferAddToBalance", internalType: "bool", type: "bool" },
                  { name: "lockedUntil", internalType: "uint48", type: "uint48" },
                  { name: "hook", internalType: "contract IJBSplitHook", type: "address" },
                ],
              },
              { name: "initialIssuance", internalType: "uint112", type: "uint112" },
              { name: "issuanceCutFrequency", internalType: "uint32", type: "uint32" },
              { name: "issuanceCutPercent", internalType: "uint32", type: "uint32" },
              { name: "cashOutTaxRate", internalType: "uint16", type: "uint16" },
              { name: "extraMetadata", internalType: "uint16", type: "uint16" },
            ],
          },
          {
            name: "loanSources",
            internalType: "struct REVLoanSource[]",
            type: "tuple[]",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
            ],
          },
          { name: "loans", internalType: "address", type: "address" },
        ],
      },
      {
        name: "terminalConfigurations",
        internalType: "struct JBTerminalConfig[]",
        type: "tuple[]",
        components: [
          { name: "terminal", internalType: "contract IJBTerminal", type: "address" },
          {
            name: "accountingContextsToAccept",
            internalType: "struct JBAccountingContext[]",
            type: "tuple[]",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "decimals", internalType: "uint8", type: "uint8" },
              { name: "currency", internalType: "uint32", type: "uint32" },
            ],
          },
        ],
      },
      {
        name: "buybackHookConfiguration",
        internalType: "struct REVBuybackHookConfig",
        type: "tuple",
        components: [
          { name: "dataHook", internalType: "contract IJBRulesetDataHook", type: "address" },
          { name: "hookToConfigure", internalType: "contract IJBBuybackHook", type: "address" },
          {
            name: "poolConfigurations",
            internalType: "struct REVBuybackPoolConfig[]",
            type: "tuple[]",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "fee", internalType: "uint24", type: "uint24" },
              { name: "twapWindow", internalType: "uint32", type: "uint32" },
            ],
          },
        ],
      },
      {
        name: "suckerDeploymentConfiguration",
        internalType: "struct REVSuckerDeploymentConfig",
        type: "tuple",
        components: [
          {
            name: "deployerConfigurations",
            internalType: "struct JBSuckerDeployerConfig[]",
            type: "tuple[]",
            components: [
              { name: "deployer", internalType: "contract IJBSuckerDeployer", type: "address" },
              {
                name: "mappings",
                internalType: "struct JBTokenMapping[]",
                type: "tuple[]",
                components: [
                  { name: "localToken", internalType: "address", type: "address" },
                  { name: "minGas", internalType: "uint32", type: "uint32" },
                  { name: "remoteToken", internalType: "address", type: "address" },
                  { name: "minBridgeAmount", internalType: "uint256", type: "uint256" },
                ],
              },
            ],
          },
          { name: "salt", internalType: "bytes32", type: "bytes32" },
        ],
      },
    ],
    name: "deployFor",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256" },
      {
        name: "suckerDeploymentConfiguration",
        internalType: "struct REVSuckerDeploymentConfig",
        type: "tuple",
        components: [
          {
            name: "deployerConfigurations",
            internalType: "struct JBSuckerDeployerConfig[]",
            type: "tuple[]",
            components: [
              { name: "deployer", internalType: "contract IJBSuckerDeployer", type: "address" },
              {
                name: "mappings",
                internalType: "struct JBTokenMapping[]",
                type: "tuple[]",
                components: [
                  { name: "localToken", internalType: "address", type: "address" },
                  { name: "minGas", internalType: "uint32", type: "uint32" },
                  { name: "remoteToken", internalType: "address", type: "address" },
                  { name: "minBridgeAmount", internalType: "uint256", type: "uint256" },
                ],
              },
            ],
          },
          { name: "salt", internalType: "bytes32", type: "bytes32" },
        ],
      },
    ],
    name: "deploySuckersFor",
    outputs: [{ name: "suckers", internalType: "address[]", type: "address[]" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256" },
      {
        name: "configuration",
        internalType: "struct REVConfig",
        type: "tuple",
        components: [
          {
            name: "description",
            internalType: "struct REVDescription",
            type: "tuple",
            components: [
              { name: "name", internalType: "string", type: "string" },
              { name: "ticker", internalType: "string", type: "string" },
              { name: "uri", internalType: "string", type: "string" },
              { name: "salt", internalType: "bytes32", type: "bytes32" },
            ],
          },
          { name: "baseCurrency", internalType: "uint32", type: "uint32" },
          { name: "splitOperator", internalType: "address", type: "address" },
          {
            name: "stageConfigurations",
            internalType: "struct REVStageConfig[]",
            type: "tuple[]",
            components: [
              { name: "startsAtOrAfter", internalType: "uint48", type: "uint48" },
              {
                name: "autoIssuances",
                internalType: "struct REVAutoIssuance[]",
                type: "tuple[]",
                components: [
                  { name: "chainId", internalType: "uint32", type: "uint32" },
                  { name: "count", internalType: "uint104", type: "uint104" },
                  { name: "beneficiary", internalType: "address", type: "address" },
                ],
              },
              { name: "splitPercent", internalType: "uint16", type: "uint16" },
              {
                name: "splits",
                internalType: "struct JBSplit[]",
                type: "tuple[]",
                components: [
                  { name: "percent", internalType: "uint32", type: "uint32" },
                  { name: "projectId", internalType: "uint64", type: "uint64" },
                  { name: "beneficiary", internalType: "address payable", type: "address" },
                  { name: "preferAddToBalance", internalType: "bool", type: "bool" },
                  { name: "lockedUntil", internalType: "uint48", type: "uint48" },
                  { name: "hook", internalType: "contract IJBSplitHook", type: "address" },
                ],
              },
              { name: "initialIssuance", internalType: "uint112", type: "uint112" },
              { name: "issuanceCutFrequency", internalType: "uint32", type: "uint32" },
              { name: "issuanceCutPercent", internalType: "uint32", type: "uint32" },
              { name: "cashOutTaxRate", internalType: "uint16", type: "uint16" },
              { name: "extraMetadata", internalType: "uint16", type: "uint16" },
            ],
          },
          {
            name: "loanSources",
            internalType: "struct REVLoanSource[]",
            type: "tuple[]",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
            ],
          },
          { name: "loans", internalType: "address", type: "address" },
        ],
      },
      {
        name: "terminalConfigurations",
        internalType: "struct JBTerminalConfig[]",
        type: "tuple[]",
        components: [
          { name: "terminal", internalType: "contract IJBTerminal", type: "address" },
          {
            name: "accountingContextsToAccept",
            internalType: "struct JBAccountingContext[]",
            type: "tuple[]",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "decimals", internalType: "uint8", type: "uint8" },
              { name: "currency", internalType: "uint32", type: "uint32" },
            ],
          },
        ],
      },
      {
        name: "buybackHookConfiguration",
        internalType: "struct REVBuybackHookConfig",
        type: "tuple",
        components: [
          { name: "dataHook", internalType: "contract IJBRulesetDataHook", type: "address" },
          { name: "hookToConfigure", internalType: "contract IJBBuybackHook", type: "address" },
          {
            name: "poolConfigurations",
            internalType: "struct REVBuybackPoolConfig[]",
            type: "tuple[]",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "fee", internalType: "uint24", type: "uint24" },
              { name: "twapWindow", internalType: "uint32", type: "uint32" },
            ],
          },
        ],
      },
      {
        name: "suckerDeploymentConfiguration",
        internalType: "struct REVSuckerDeploymentConfig",
        type: "tuple",
        components: [
          {
            name: "deployerConfigurations",
            internalType: "struct JBSuckerDeployerConfig[]",
            type: "tuple[]",
            components: [
              { name: "deployer", internalType: "contract IJBSuckerDeployer", type: "address" },
              {
                name: "mappings",
                internalType: "struct JBTokenMapping[]",
                type: "tuple[]",
                components: [
                  { name: "localToken", internalType: "address", type: "address" },
                  { name: "minGas", internalType: "uint32", type: "uint32" },
                  { name: "remoteToken", internalType: "address", type: "address" },
                  { name: "minBridgeAmount", internalType: "uint256", type: "uint256" },
                ],
              },
            ],
          },
          { name: "salt", internalType: "bytes32", type: "bytes32" },
        ],
      },
      {
        name: "tiered721HookConfiguration",
        internalType: "struct REVDeploy721TiersHookConfig",
        type: "tuple",
        components: [
          {
            name: "baseline721HookConfiguration",
            internalType: "struct JBDeploy721TiersHookConfig",
            type: "tuple",
            components: [
              { name: "name", internalType: "string", type: "string" },
              { name: "symbol", internalType: "string", type: "string" },
              { name: "baseUri", internalType: "string", type: "string" },
              {
                name: "tokenUriResolver",
                internalType: "contract IJB721TokenUriResolver",
                type: "address",
              },
              { name: "contractUri", internalType: "string", type: "string" },
              {
                name: "tiersConfig",
                internalType: "struct JB721InitTiersConfig",
                type: "tuple",
                components: [
                  {
                    name: "tiers",
                    internalType: "struct JB721TierConfig[]",
                    type: "tuple[]",
                    components: [
                      { name: "price", internalType: "uint104", type: "uint104" },
                      { name: "initialSupply", internalType: "uint32", type: "uint32" },
                      { name: "votingUnits", internalType: "uint32", type: "uint32" },
                      { name: "reserveFrequency", internalType: "uint16", type: "uint16" },
                      { name: "reserveBeneficiary", internalType: "address", type: "address" },
                      { name: "encodedIPFSUri", internalType: "bytes32", type: "bytes32" },
                      { name: "category", internalType: "uint24", type: "uint24" },
                      { name: "discountPercent", internalType: "uint8", type: "uint8" },
                      { name: "allowOwnerMint", internalType: "bool", type: "bool" },
                      {
                        name: "useReserveBeneficiaryAsDefault",
                        internalType: "bool",
                        type: "bool",
                      },
                      { name: "transfersPausable", internalType: "bool", type: "bool" },
                      { name: "useVotingUnits", internalType: "bool", type: "bool" },
                      { name: "cannotBeRemoved", internalType: "bool", type: "bool" },
                      { name: "cannotIncreaseDiscountPercent", internalType: "bool", type: "bool" },
                    ],
                  },
                  { name: "currency", internalType: "uint32", type: "uint32" },
                  { name: "decimals", internalType: "uint8", type: "uint8" },
                  { name: "prices", internalType: "contract IJBPrices", type: "address" },
                ],
              },
              { name: "reserveBeneficiary", internalType: "address", type: "address" },
              {
                name: "flags",
                internalType: "struct JB721TiersHookFlags",
                type: "tuple",
                components: [
                  { name: "noNewTiersWithReserves", internalType: "bool", type: "bool" },
                  { name: "noNewTiersWithVotes", internalType: "bool", type: "bool" },
                  { name: "noNewTiersWithOwnerMinting", internalType: "bool", type: "bool" },
                  { name: "preventOverspending", internalType: "bool", type: "bool" },
                ],
              },
            ],
          },
          { name: "salt", internalType: "bytes32", type: "bytes32" },
          { name: "splitOperatorCanAdjustTiers", internalType: "bool", type: "bool" },
          { name: "splitOperatorCanUpdateMetadata", internalType: "bool", type: "bool" },
          { name: "splitOperatorCanMint", internalType: "bool", type: "bool" },
          { name: "splitOperatorCanIncreaseDiscountPercent", internalType: "bool", type: "bool" },
        ],
      },
      {
        name: "allowedPosts",
        internalType: "struct REVCroptopAllowedPost[]",
        type: "tuple[]",
        components: [
          { name: "category", internalType: "uint24", type: "uint24" },
          { name: "minimumPrice", internalType: "uint104", type: "uint104" },
          { name: "minimumTotalSupply", internalType: "uint32", type: "uint32" },
          { name: "maximumTotalSupply", internalType: "uint32", type: "uint32" },
          { name: "allowedAddresses", internalType: "address[]", type: "address[]" },
        ],
      },
    ],
    name: "deployWith721sFor",
    outputs: [
      { name: "", internalType: "uint256", type: "uint256" },
      { name: "hook", internalType: "contract IJB721TiersHook", type: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256" },
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint48", type: "uint48" },
          { name: "id", internalType: "uint48", type: "uint48" },
          { name: "basedOnId", internalType: "uint48", type: "uint48" },
          { name: "start", internalType: "uint48", type: "uint48" },
          { name: "duration", internalType: "uint32", type: "uint32" },
          { name: "weight", internalType: "uint112", type: "uint112" },
          { name: "weightCutPercent", internalType: "uint32", type: "uint32" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "addr", internalType: "address", type: "address" },
    ],
    name: "hasMintPermissionFor",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "revnetId", internalType: "uint256", type: "uint256" }],
    name: "hashedEncodedConfigurationOf",
    outputs: [{ name: "hashedEncodedConfiguration", internalType: "bytes32", type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256" },
      { name: "addr", internalType: "address", type: "address" },
    ],
    name: "isSplitOperatorOf",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "forwarder", internalType: "address", type: "address" }],
    name: "isTrustedForwarder",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "revnetId", internalType: "uint256", type: "uint256" }],
    name: "loansOf",
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "", internalType: "address", type: "address" },
      { name: "", internalType: "address", type: "address" },
      { name: "", internalType: "uint256", type: "uint256" },
      { name: "", internalType: "bytes", type: "bytes" },
    ],
    name: "onERC721Received",
    outputs: [{ name: "", internalType: "bytes4", type: "bytes4" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256" },
      { name: "newSplitOperator", internalType: "address", type: "address" },
    ],
    name: "setSplitOperatorOf",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "interfaceId", internalType: "bytes4", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "revnetId", internalType: "uint256", type: "uint256" }],
    name: "tiered721HookOf",
    outputs: [{ name: "tiered721Hook", internalType: "contract IJB721TiersHook", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "trustedForwarder",
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
] as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x2cA27BDe7e7D33E353b44c27aCfCf6c78ddE251d)
 */
export const revDeployerAddress = {
  8453: "0x2cA27BDe7e7D33E353b44c27aCfCf6c78ddE251d",
} as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x2cA27BDe7e7D33E353b44c27aCfCf6c78ddE251d)
 */
export const revDeployerConfig = { address: revDeployerAddress, abi: revDeployerAbi } as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// REVLoans
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x1880D832aa283d05b8eAB68877717E25FbD550Bb)
 */
export const revLoansAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "revnets", internalType: "contract IREVDeployer", type: "address" },
      { name: "revId", internalType: "uint256", type: "uint256" },
      { name: "owner", internalType: "address", type: "address" },
      { name: "permit2", internalType: "contract IPermit2", type: "address" },
      { name: "trustedForwarder", internalType: "address", type: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "error",
    inputs: [
      { name: "sender", internalType: "address", type: "address" },
      { name: "tokenId", internalType: "uint256", type: "uint256" },
      { name: "owner", internalType: "address", type: "address" },
    ],
    name: "ERC721IncorrectOwner",
  },
  {
    type: "error",
    inputs: [
      { name: "operator", internalType: "address", type: "address" },
      { name: "tokenId", internalType: "uint256", type: "uint256" },
    ],
    name: "ERC721InsufficientApproval",
  },
  {
    type: "error",
    inputs: [{ name: "approver", internalType: "address", type: "address" }],
    name: "ERC721InvalidApprover",
  },
  {
    type: "error",
    inputs: [{ name: "operator", internalType: "address", type: "address" }],
    name: "ERC721InvalidOperator",
  },
  {
    type: "error",
    inputs: [{ name: "owner", internalType: "address", type: "address" }],
    name: "ERC721InvalidOwner",
  },
  {
    type: "error",
    inputs: [{ name: "receiver", internalType: "address", type: "address" }],
    name: "ERC721InvalidReceiver",
  },
  {
    type: "error",
    inputs: [{ name: "sender", internalType: "address", type: "address" }],
    name: "ERC721InvalidSender",
  },
  {
    type: "error",
    inputs: [{ name: "tokenId", internalType: "uint256", type: "uint256" }],
    name: "ERC721NonexistentToken",
  },
  { type: "error", inputs: [], name: "FailedCall" },
  {
    type: "error",
    inputs: [
      { name: "balance", internalType: "uint256", type: "uint256" },
      { name: "needed", internalType: "uint256", type: "uint256" },
    ],
    name: "InsufficientBalance",
  },
  {
    type: "error",
    inputs: [{ name: "owner", internalType: "address", type: "address" }],
    name: "OwnableInvalidOwner",
  },
  {
    type: "error",
    inputs: [{ name: "account", internalType: "address", type: "address" }],
    name: "OwnableUnauthorizedAccount",
  },
  {
    type: "error",
    inputs: [
      { name: "x", internalType: "uint256", type: "uint256" },
      { name: "y", internalType: "uint256", type: "uint256" },
      { name: "denominator", internalType: "uint256", type: "uint256" },
    ],
    name: "PRBMath_MulDiv_Overflow",
  },
  {
    type: "error",
    inputs: [
      { name: "collateralToReturn", internalType: "uint256", type: "uint256" },
      { name: "loanCollateral", internalType: "uint256", type: "uint256" },
    ],
    name: "REVLoans_CollateralExceedsLoan",
  },
  {
    type: "error",
    inputs: [
      { name: "prepaidFeePercent", internalType: "uint256", type: "uint256" },
      { name: "min", internalType: "uint256", type: "uint256" },
      { name: "max", internalType: "uint256", type: "uint256" },
    ],
    name: "REVLoans_InvalidPrepaidFeePercent",
  },
  {
    type: "error",
    inputs: [
      { name: "timeSinceLoanCreated", internalType: "uint256", type: "uint256" },
      { name: "loanLiquidationDuration", internalType: "uint256", type: "uint256" },
    ],
    name: "REVLoans_LoanExpired",
  },
  {
    type: "error",
    inputs: [
      { name: "newBorrowAmount", internalType: "uint256", type: "uint256" },
      { name: "loanAmount", internalType: "uint256", type: "uint256" },
    ],
    name: "REVLoans_NewBorrowAmountGreaterThanLoanAmount",
  },
  { type: "error", inputs: [], name: "REVLoans_NoMsgValueAllowed" },
  { type: "error", inputs: [], name: "REVLoans_NotEnoughCollateral" },
  {
    type: "error",
    inputs: [
      { name: "maxRepayBorrowAmount", internalType: "uint256", type: "uint256" },
      { name: "repayBorrowAmount", internalType: "uint256", type: "uint256" },
    ],
    name: "REVLoans_OverMaxRepayBorrowAmount",
  },
  {
    type: "error",
    inputs: [
      { name: "value", internalType: "uint256", type: "uint256" },
      { name: "limit", internalType: "uint256", type: "uint256" },
    ],
    name: "REVLoans_OverflowAlert",
  },
  {
    type: "error",
    inputs: [
      { name: "allowanceAmount", internalType: "uint256", type: "uint256" },
      { name: "requiredAmount", internalType: "uint256", type: "uint256" },
    ],
    name: "REVLoans_PermitAllowanceNotEnough",
  },
  {
    type: "error",
    inputs: [
      { name: "newBorrowAmount", internalType: "uint256", type: "uint256" },
      { name: "loanAmount", internalType: "uint256", type: "uint256" },
    ],
    name: "REVLoans_ReallocatingMoreCollateralThanBorrowedAmountAllows",
  },
  {
    type: "error",
    inputs: [
      { name: "revnetOwner", internalType: "address", type: "address" },
      { name: "revnets", internalType: "address", type: "address" },
    ],
    name: "REVLoans_RevnetsMismatch",
  },
  {
    type: "error",
    inputs: [
      { name: "caller", internalType: "address", type: "address" },
      { name: "owner", internalType: "address", type: "address" },
    ],
    name: "REVLoans_Unauthorized",
  },
  {
    type: "error",
    inputs: [
      { name: "minBorrowAmount", internalType: "uint256", type: "uint256" },
      { name: "borrowAmount", internalType: "uint256", type: "uint256" },
    ],
    name: "REVLoans_UnderMinBorrowAmount",
  },
  { type: "error", inputs: [], name: "REVLoans_ZeroCollateralLoanIsInvalid" },
  {
    type: "error",
    inputs: [{ name: "token", internalType: "address", type: "address" }],
    name: "SafeERC20FailedOperation",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "owner", internalType: "address", type: "address", indexed: true },
      { name: "approved", internalType: "address", type: "address", indexed: true },
      { name: "tokenId", internalType: "uint256", type: "uint256", indexed: true },
    ],
    name: "Approval",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "owner", internalType: "address", type: "address", indexed: true },
      { name: "operator", internalType: "address", type: "address", indexed: true },
      { name: "approved", internalType: "bool", type: "bool", indexed: false },
    ],
    name: "ApprovalForAll",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "loanId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "revnetId", internalType: "uint256", type: "uint256", indexed: true },
      {
        name: "loan",
        internalType: "struct REVLoan",
        type: "tuple",
        components: [
          { name: "amount", internalType: "uint112", type: "uint112" },
          { name: "collateral", internalType: "uint112", type: "uint112" },
          { name: "createdAt", internalType: "uint48", type: "uint48" },
          { name: "prepaidFeePercent", internalType: "uint16", type: "uint16" },
          { name: "prepaidDuration", internalType: "uint32", type: "uint32" },
          {
            name: "source",
            internalType: "struct REVLoanSource",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
            ],
          },
        ],
        indexed: false,
      },
      {
        name: "source",
        internalType: "struct REVLoanSource",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
        ],
        indexed: false,
      },
      { name: "borrowAmount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "collateralCount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "sourceFeeAmount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "beneficiary", internalType: "address payable", type: "address", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "Borrow",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "loanId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "revnetId", internalType: "uint256", type: "uint256", indexed: true },
      {
        name: "loan",
        internalType: "struct REVLoan",
        type: "tuple",
        components: [
          { name: "amount", internalType: "uint112", type: "uint112" },
          { name: "collateral", internalType: "uint112", type: "uint112" },
          { name: "createdAt", internalType: "uint48", type: "uint48" },
          { name: "prepaidFeePercent", internalType: "uint16", type: "uint16" },
          { name: "prepaidDuration", internalType: "uint32", type: "uint32" },
          {
            name: "source",
            internalType: "struct REVLoanSource",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
            ],
          },
        ],
        indexed: false,
      },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "Liquidate",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "previousOwner", internalType: "address", type: "address", indexed: true },
      { name: "newOwner", internalType: "address", type: "address", indexed: true },
    ],
    name: "OwnershipTransferred",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "loanId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "revnetId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "reallocatedLoanId", internalType: "uint256", type: "uint256", indexed: true },
      {
        name: "reallocatedLoan",
        internalType: "struct REVLoan",
        type: "tuple",
        components: [
          { name: "amount", internalType: "uint112", type: "uint112" },
          { name: "collateral", internalType: "uint112", type: "uint112" },
          { name: "createdAt", internalType: "uint48", type: "uint48" },
          { name: "prepaidFeePercent", internalType: "uint16", type: "uint16" },
          { name: "prepaidDuration", internalType: "uint32", type: "uint32" },
          {
            name: "source",
            internalType: "struct REVLoanSource",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
            ],
          },
        ],
        indexed: false,
      },
      { name: "removedcollateralCount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "ReallocateCollateral",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "loanId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "revnetId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "paidOffLoanId", internalType: "uint256", type: "uint256", indexed: true },
      {
        name: "loan",
        internalType: "struct REVLoan",
        type: "tuple",
        components: [
          { name: "amount", internalType: "uint112", type: "uint112" },
          { name: "collateral", internalType: "uint112", type: "uint112" },
          { name: "createdAt", internalType: "uint48", type: "uint48" },
          { name: "prepaidFeePercent", internalType: "uint16", type: "uint16" },
          { name: "prepaidDuration", internalType: "uint32", type: "uint32" },
          {
            name: "source",
            internalType: "struct REVLoanSource",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
            ],
          },
        ],
        indexed: false,
      },
      {
        name: "paidOffLoan",
        internalType: "struct REVLoan",
        type: "tuple",
        components: [
          { name: "amount", internalType: "uint112", type: "uint112" },
          { name: "collateral", internalType: "uint112", type: "uint112" },
          { name: "createdAt", internalType: "uint48", type: "uint48" },
          { name: "prepaidFeePercent", internalType: "uint16", type: "uint16" },
          { name: "prepaidDuration", internalType: "uint32", type: "uint32" },
          {
            name: "source",
            internalType: "struct REVLoanSource",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
            ],
          },
        ],
        indexed: false,
      },
      { name: "repayBorrowAmount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "sourceFeeAmount", internalType: "uint256", type: "uint256", indexed: false },
      { name: "collateralCountToReturn", internalType: "uint256", type: "uint256", indexed: false },
      { name: "beneficiary", internalType: "address payable", type: "address", indexed: false },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "RepayLoan",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "resolver",
        internalType: "contract IJBTokenUriResolver",
        type: "address",
        indexed: true,
      },
      { name: "caller", internalType: "address", type: "address", indexed: false },
    ],
    name: "SetTokenUriResolver",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "from", internalType: "address", type: "address", indexed: true },
      { name: "to", internalType: "address", type: "address", indexed: true },
      { name: "tokenId", internalType: "uint256", type: "uint256", indexed: true },
    ],
    name: "Transfer",
  },
  { type: "fallback", stateMutability: "payable" },
  {
    type: "function",
    inputs: [],
    name: "CONTROLLER",
    outputs: [{ name: "", internalType: "contract IJBController", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "DIRECTORY",
    outputs: [{ name: "", internalType: "contract IJBDirectory", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "LOAN_LIQUIDATION_DURATION",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "MAX_PREPAID_FEE_PERCENT",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "MIN_PREPAID_FEE_PERCENT",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "PERMIT2",
    outputs: [{ name: "", internalType: "contract IPermit2", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "PRICES",
    outputs: [{ name: "", internalType: "contract IJBPrices", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "PROJECTS",
    outputs: [{ name: "", internalType: "contract IJBProjects", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "REVNETS",
    outputs: [{ name: "", internalType: "contract IREVDeployer", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "REV_ID",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "REV_PREPAID_FEE_PERCENT",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "to", internalType: "address", type: "address" },
      { name: "tokenId", internalType: "uint256", type: "uint256" },
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "owner", internalType: "address", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256" },
      {
        name: "source",
        internalType: "struct REVLoanSource",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
        ],
      },
      { name: "minBorrowAmount", internalType: "uint256", type: "uint256" },
      { name: "collateralCount", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address payable", type: "address" },
      { name: "prepaidFeePercent", internalType: "uint256", type: "uint256" },
    ],
    name: "borrowFrom",
    outputs: [
      { name: "loanId", internalType: "uint256", type: "uint256" },
      {
        name: "",
        internalType: "struct REVLoan",
        type: "tuple",
        components: [
          { name: "amount", internalType: "uint112", type: "uint112" },
          { name: "collateral", internalType: "uint112", type: "uint112" },
          { name: "createdAt", internalType: "uint48", type: "uint48" },
          { name: "prepaidFeePercent", internalType: "uint16", type: "uint16" },
          { name: "prepaidDuration", internalType: "uint32", type: "uint32" },
          {
            name: "source",
            internalType: "struct REVLoanSource",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
            ],
          },
        ],
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256" },
      { name: "collateralCount", internalType: "uint256", type: "uint256" },
      { name: "decimals", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
    ],
    name: "borrowableAmountFrom",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "loan",
        internalType: "struct REVLoan",
        type: "tuple",
        components: [
          { name: "amount", internalType: "uint112", type: "uint112" },
          { name: "collateral", internalType: "uint112", type: "uint112" },
          { name: "createdAt", internalType: "uint48", type: "uint48" },
          { name: "prepaidFeePercent", internalType: "uint16", type: "uint16" },
          { name: "prepaidDuration", internalType: "uint32", type: "uint32" },
          {
            name: "source",
            internalType: "struct REVLoanSource",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
            ],
          },
        ],
      },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "determineSourceFeeAmount",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "tokenId", internalType: "uint256", type: "uint256" }],
    name: "getApproved",
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "owner", internalType: "address", type: "address" },
      { name: "operator", internalType: "address", type: "address" },
    ],
    name: "isApprovedForAll",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256" },
      { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
      { name: "token", internalType: "address", type: "address" },
    ],
    name: "isLoanSourceOf",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "forwarder", internalType: "address", type: "address" }],
    name: "isTrustedForwarder",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256" },
      { name: "startingLoanId", internalType: "uint256", type: "uint256" },
      { name: "count", internalType: "uint256", type: "uint256" },
    ],
    name: "liquidateExpiredLoansFrom",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "loanId", internalType: "uint256", type: "uint256" }],
    name: "loanOf",
    outputs: [
      {
        name: "",
        internalType: "struct REVLoan",
        type: "tuple",
        components: [
          { name: "amount", internalType: "uint112", type: "uint112" },
          { name: "collateral", internalType: "uint112", type: "uint112" },
          { name: "createdAt", internalType: "uint48", type: "uint48" },
          { name: "prepaidFeePercent", internalType: "uint16", type: "uint16" },
          { name: "prepaidDuration", internalType: "uint32", type: "uint32" },
          {
            name: "source",
            internalType: "struct REVLoanSource",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
            ],
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "revnetId", internalType: "uint256", type: "uint256" }],
    name: "loanSourcesOf",
    outputs: [
      {
        name: "",
        internalType: "struct REVLoanSource[]",
        type: "tuple[]",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "name",
    outputs: [{ name: "", internalType: "string", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "revnetId", internalType: "uint256", type: "uint256" }],
    name: "numberOfLoansFor",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "owner",
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "tokenId", internalType: "uint256", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "loanId", internalType: "uint256", type: "uint256" },
      { name: "collateralCountToTransfer", internalType: "uint256", type: "uint256" },
      {
        name: "source",
        internalType: "struct REVLoanSource",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
        ],
      },
      { name: "minBorrowAmount", internalType: "uint256", type: "uint256" },
      { name: "collateralCountToAdd", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address payable", type: "address" },
      { name: "prepaidFeePercent", internalType: "uint256", type: "uint256" },
    ],
    name: "reallocateCollateralFromLoan",
    outputs: [
      { name: "reallocatedLoanId", internalType: "uint256", type: "uint256" },
      { name: "newLoanId", internalType: "uint256", type: "uint256" },
      {
        name: "reallocatedLoan",
        internalType: "struct REVLoan",
        type: "tuple",
        components: [
          { name: "amount", internalType: "uint112", type: "uint112" },
          { name: "collateral", internalType: "uint112", type: "uint112" },
          { name: "createdAt", internalType: "uint48", type: "uint48" },
          { name: "prepaidFeePercent", internalType: "uint16", type: "uint16" },
          { name: "prepaidDuration", internalType: "uint32", type: "uint32" },
          {
            name: "source",
            internalType: "struct REVLoanSource",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
            ],
          },
        ],
      },
      {
        name: "newLoan",
        internalType: "struct REVLoan",
        type: "tuple",
        components: [
          { name: "amount", internalType: "uint112", type: "uint112" },
          { name: "collateral", internalType: "uint112", type: "uint112" },
          { name: "createdAt", internalType: "uint48", type: "uint48" },
          { name: "prepaidFeePercent", internalType: "uint16", type: "uint16" },
          { name: "prepaidDuration", internalType: "uint32", type: "uint32" },
          {
            name: "source",
            internalType: "struct REVLoanSource",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
            ],
          },
        ],
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "loanId", internalType: "uint256", type: "uint256" },
      { name: "maxRepayBorrowAmount", internalType: "uint256", type: "uint256" },
      { name: "collateralCountToReturn", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address payable", type: "address" },
      {
        name: "allowance",
        internalType: "struct JBSingleAllowance",
        type: "tuple",
        components: [
          { name: "sigDeadline", internalType: "uint256", type: "uint256" },
          { name: "amount", internalType: "uint160", type: "uint160" },
          { name: "expiration", internalType: "uint48", type: "uint48" },
          { name: "nonce", internalType: "uint48", type: "uint48" },
          { name: "signature", internalType: "bytes", type: "bytes" },
        ],
      },
    ],
    name: "repayLoan",
    outputs: [
      { name: "paidOffLoanId", internalType: "uint256", type: "uint256" },
      {
        name: "paidOffloan",
        internalType: "struct REVLoan",
        type: "tuple",
        components: [
          { name: "amount", internalType: "uint112", type: "uint112" },
          { name: "collateral", internalType: "uint112", type: "uint112" },
          { name: "createdAt", internalType: "uint48", type: "uint48" },
          { name: "prepaidFeePercent", internalType: "uint16", type: "uint16" },
          { name: "prepaidDuration", internalType: "uint32", type: "uint32" },
          {
            name: "source",
            internalType: "struct REVLoanSource",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
            ],
          },
        ],
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [{ name: "loanId", internalType: "uint256", type: "uint256" }],
    name: "revnetIdOfLoanWith",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    inputs: [
      { name: "from", internalType: "address", type: "address" },
      { name: "to", internalType: "address", type: "address" },
      { name: "tokenId", internalType: "uint256", type: "uint256" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "from", internalType: "address", type: "address" },
      { name: "to", internalType: "address", type: "address" },
      { name: "tokenId", internalType: "uint256", type: "uint256" },
      { name: "data", internalType: "bytes", type: "bytes" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "operator", internalType: "address", type: "address" },
      { name: "approved", internalType: "bool", type: "bool" },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "resolver", internalType: "contract IJBTokenUriResolver", type: "address" }],
    name: "setTokenUriResolver",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "interfaceId", internalType: "bytes4", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", internalType: "string", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "loanId", internalType: "uint256", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", internalType: "string", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "tokenUriResolver",
    outputs: [{ name: "", internalType: "contract IJBTokenUriResolver", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "revnetId", internalType: "uint256", type: "uint256" },
      { name: "terminal", internalType: "contract IJBPayoutTerminal", type: "address" },
      { name: "token", internalType: "address", type: "address" },
    ],
    name: "totalBorrowedFrom",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "revnetId", internalType: "uint256", type: "uint256" }],
    name: "totalCollateralOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "from", internalType: "address", type: "address" },
      { name: "to", internalType: "address", type: "address" },
      { name: "tokenId", internalType: "uint256", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "newOwner", internalType: "address", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [],
    name: "trustedForwarder",
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  { type: "receive", stateMutability: "payable" },
] as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x1880D832aa283d05b8eAB68877717E25FbD550Bb)
 */
export const revLoansAddress = {
  8453: "0x1880D832aa283d05b8eAB68877717E25FbD550Bb",
} as const;

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x1880D832aa283d05b8eAB68877717E25FbD550Bb)
 */
export const revLoansConfig = { address: revLoansAddress, abi: revLoansAbi } as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// superfluid
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x4E583d9390082B65Bef884b629DFA426114CED6d)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x567c4B141ED61923967cA25Ef4906C8781069a10)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4C073B3baB6d8826b8C5b229f3cfdC1eC6E47E74)
 */
export const superfluidAbi = [
  { type: "fallback", stateMutability: "payable" },
  {
    type: "function",
    inputs: [{ name: "initialAddress", internalType: "address", type: "address" }],
    name: "initializeProxy",
    outputs: [],
    stateMutability: "nonpayable",
  },
  { type: "receive", stateMutability: "payable" },
] as const;

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x4E583d9390082B65Bef884b629DFA426114CED6d)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x567c4B141ED61923967cA25Ef4906C8781069a10)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4C073B3baB6d8826b8C5b229f3cfdC1eC6E47E74)
 */
export const superfluidAddress = {
  1: "0x4E583d9390082B65Bef884b629DFA426114CED6d",
  10: "0x567c4B141ED61923967cA25Ef4906C8781069a10",
  8453: "0x4C073B3baB6d8826b8C5b229f3cfdC1eC6E47E74",
} as const;

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x4E583d9390082B65Bef884b629DFA426114CED6d)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x567c4B141ED61923967cA25Ef4906C8781069a10)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4C073B3baB6d8826b8C5b229f3cfdC1eC6E47E74)
 */
export const superfluidConfig = { address: superfluidAddress, abi: superfluidAbi } as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// superfluidImpl
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x07e4a282f8f20032f3e766fffb73c8b86ba7e1f1)
 */
export const superfluidImplAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "nonUpgradable", internalType: "bool", type: "bool" },
      { name: "appWhiteListingEnabled", internalType: "bool", type: "bool" },
      { name: "callbackGasLimit", internalType: "uint64", type: "uint64" },
      { name: "simpleForwarderAddress", internalType: "address", type: "address" },
      { name: "erc2771ForwarderAddress", internalType: "address", type: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "error",
    inputs: [{ name: "_code", internalType: "uint256", type: "uint256" }],
    name: "APP_RULE",
  },
  { type: "error", inputs: [], name: "HOST_AGREEMENT_ALREADY_REGISTERED" },
  { type: "error", inputs: [], name: "HOST_AGREEMENT_CALLBACK_IS_NOT_ACTION" },
  { type: "error", inputs: [], name: "HOST_AGREEMENT_IS_NOT_REGISTERED" },
  { type: "error", inputs: [], name: "HOST_CALL_AGREEMENT_WITH_CTX_FROM_WRONG_ADDRESS" },
  { type: "error", inputs: [], name: "HOST_CALL_APP_ACTION_WITH_CTX_FROM_WRONG_ADDRESS" },
  { type: "error", inputs: [], name: "HOST_CANNOT_DOWNGRADE_TO_NON_UPGRADEABLE" },
  { type: "error", inputs: [], name: "HOST_INVALID_CONFIG_WORD" },
  { type: "error", inputs: [], name: "HOST_MAX_256_AGREEMENTS" },
  { type: "error", inputs: [], name: "HOST_MUST_BE_CONTRACT" },
  { type: "error", inputs: [], name: "HOST_NEED_MORE_GAS" },
  { type: "error", inputs: [], name: "HOST_NON_UPGRADEABLE" },
  { type: "error", inputs: [], name: "HOST_NON_ZERO_LENGTH_PLACEHOLDER_CTX" },
  { type: "error", inputs: [], name: "HOST_NOT_A_SUPER_APP" },
  { type: "error", inputs: [], name: "HOST_NO_APP_REGISTRATION_PERMISSION" },
  { type: "error", inputs: [], name: "HOST_ONLY_GOVERNANCE" },
  { type: "error", inputs: [], name: "HOST_ONLY_LISTED_AGREEMENT" },
  { type: "error", inputs: [], name: "HOST_RECEIVER_IS_NOT_SUPER_APP" },
  { type: "error", inputs: [], name: "HOST_SENDER_IS_NOT_SUPER_APP" },
  { type: "error", inputs: [], name: "HOST_SOURCE_APP_NEEDS_HIGHER_APP_LEVEL" },
  { type: "error", inputs: [], name: "HOST_SUPER_APP_ALREADY_REGISTERED" },
  { type: "error", inputs: [], name: "HOST_SUPER_APP_IS_JAILED" },
  { type: "error", inputs: [], name: "HOST_UNKNOWN_BATCH_CALL_OPERATION_TYPE" },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "agreementType", internalType: "bytes32", type: "bytes32", indexed: false },
      { name: "code", internalType: "address", type: "address", indexed: false },
    ],
    name: "AgreementClassRegistered",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "agreementType", internalType: "bytes32", type: "bytes32", indexed: false },
      { name: "code", internalType: "address", type: "address", indexed: false },
    ],
    name: "AgreementClassUpdated",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [{ name: "app", internalType: "contract ISuperApp", type: "address", indexed: true }],
    name: "AppRegistered",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "uuid", internalType: "bytes32", type: "bytes32", indexed: false },
      { name: "codeAddress", internalType: "address", type: "address", indexed: false },
    ],
    name: "CodeUpdated",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "oldGov",
        internalType: "contract ISuperfluidGovernance",
        type: "address",
        indexed: false,
      },
      {
        name: "newGov",
        internalType: "contract ISuperfluidGovernance",
        type: "address",
        indexed: false,
      },
    ],
    name: "GovernanceReplaced",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [{ name: "version", internalType: "uint8", type: "uint8", indexed: false }],
    name: "Initialized",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "app", internalType: "contract ISuperApp", type: "address", indexed: true },
      { name: "reason", internalType: "uint256", type: "uint256", indexed: false },
    ],
    name: "Jail",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "beaconProxy", internalType: "address", type: "address", indexed: true },
      { name: "newBeaconLogic", internalType: "address", type: "address", indexed: false },
    ],
    name: "PoolBeaconLogicUpdated",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "newFactory",
        internalType: "contract ISuperTokenFactory",
        type: "address",
        indexed: false,
      },
    ],
    name: "SuperTokenFactoryUpdated",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "token", internalType: "contract ISuperToken", type: "address", indexed: true },
      { name: "code", internalType: "address", type: "address", indexed: false },
    ],
    name: "SuperTokenLogicUpdated",
  },
  {
    type: "function",
    inputs: [],
    name: "APP_WHITE_LISTING_ENABLED",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "CALLBACK_GAS_LIMIT",
    outputs: [{ name: "", internalType: "uint64", type: "uint64" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "MAX_APP_CALLBACK_LEVEL",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "MAX_NUM_AGREEMENTS",
    outputs: [{ name: "", internalType: "uint32", type: "uint32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "NON_UPGRADABLE_DEPLOYMENT",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "SIMPLE_FORWARDER",
    outputs: [{ name: "", internalType: "contract SimpleForwarder", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "bitmap", internalType: "uint256", type: "uint256" },
      { name: "agreementType", internalType: "bytes32", type: "bytes32" },
    ],
    name: "addToAgreementClassesBitmap",
    outputs: [{ name: "newBitmap", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "targetApp", internalType: "contract ISuperApp", type: "address" }],
    name: "allowCompositeApp",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "ctx", internalType: "bytes", type: "bytes" },
      { name: "appCreditUsedDelta", internalType: "int256", type: "int256" },
    ],
    name: "appCallbackPop",
    outputs: [{ name: "newCtx", internalType: "bytes", type: "bytes" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "ctx", internalType: "bytes", type: "bytes" },
      { name: "app", internalType: "contract ISuperApp", type: "address" },
      { name: "appCreditGranted", internalType: "uint256", type: "uint256" },
      { name: "appCreditUsed", internalType: "int256", type: "int256" },
      { name: "appCreditToken", internalType: "contract ISuperfluidToken", type: "address" },
    ],
    name: "appCallbackPush",
    outputs: [{ name: "appCtx", internalType: "bytes", type: "bytes" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      {
        name: "operations",
        internalType: "struct ISuperfluid.Operation[]",
        type: "tuple[]",
        components: [
          { name: "operationType", internalType: "uint32", type: "uint32" },
          { name: "target", internalType: "address", type: "address" },
          { name: "data", internalType: "bytes", type: "bytes" },
        ],
      },
    ],
    name: "batchCall",
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [
      { name: "agreementClass", internalType: "contract ISuperAgreement", type: "address" },
      { name: "callData", internalType: "bytes", type: "bytes" },
      { name: "userData", internalType: "bytes", type: "bytes" },
    ],
    name: "callAgreement",
    outputs: [{ name: "returnedData", internalType: "bytes", type: "bytes" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "agreementClass", internalType: "contract ISuperAgreement", type: "address" },
      { name: "callData", internalType: "bytes", type: "bytes" },
      { name: "userData", internalType: "bytes", type: "bytes" },
      { name: "ctx", internalType: "bytes", type: "bytes" },
    ],
    name: "callAgreementWithContext",
    outputs: [
      { name: "newCtx", internalType: "bytes", type: "bytes" },
      { name: "returnedData", internalType: "bytes", type: "bytes" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "app", internalType: "contract ISuperApp", type: "address" },
      { name: "callData", internalType: "bytes", type: "bytes" },
    ],
    name: "callAppAction",
    outputs: [{ name: "returnedData", internalType: "bytes", type: "bytes" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "app", internalType: "contract ISuperApp", type: "address" },
      { name: "callData", internalType: "bytes", type: "bytes" },
      { name: "ctx", internalType: "bytes", type: "bytes" },
    ],
    name: "callAppActionWithContext",
    outputs: [{ name: "newCtx", internalType: "bytes", type: "bytes" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "app", internalType: "contract ISuperApp", type: "address" },
      { name: "callData", internalType: "bytes", type: "bytes" },
      { name: "isTermination", internalType: "bool", type: "bool" },
      { name: "ctx", internalType: "bytes", type: "bytes" },
    ],
    name: "callAppAfterCallback",
    outputs: [{ name: "newCtx", internalType: "bytes", type: "bytes" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "app", internalType: "contract ISuperApp", type: "address" },
      { name: "callData", internalType: "bytes", type: "bytes" },
      { name: "isTermination", internalType: "bool", type: "bool" },
      { name: "ctx", internalType: "bytes", type: "bytes" },
    ],
    name: "callAppBeforeCallback",
    outputs: [{ name: "cbdata", internalType: "bytes", type: "bytes" }],
    stateMutability: "nonpayable",
  },
  { type: "function", inputs: [], name: "castrate", outputs: [], stateMutability: "nonpayable" },
  {
    type: "function",
    inputs: [
      { name: "token", internalType: "contract ISuperToken", type: "address" },
      { name: "newAdmin", internalType: "address", type: "address" },
    ],
    name: "changeSuperTokenAdmin",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "ctx", internalType: "bytes", type: "bytes" },
      { name: "appCreditUsedMore", internalType: "int256", type: "int256" },
    ],
    name: "ctxUseCredit",
    outputs: [{ name: "newCtx", internalType: "bytes", type: "bytes" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "ctx", internalType: "bytes", type: "bytes" }],
    name: "decodeCtx",
    outputs: [
      {
        name: "context",
        internalType: "struct ISuperfluid.Context",
        type: "tuple",
        components: [
          { name: "appCallbackLevel", internalType: "uint8", type: "uint8" },
          { name: "callType", internalType: "uint8", type: "uint8" },
          { name: "timestamp", internalType: "uint256", type: "uint256" },
          { name: "msgSender", internalType: "address", type: "address" },
          { name: "agreementSelector", internalType: "bytes4", type: "bytes4" },
          { name: "userData", internalType: "bytes", type: "bytes" },
          { name: "appCreditGranted", internalType: "uint256", type: "uint256" },
          { name: "appCreditWantedDeprecated", internalType: "uint256", type: "uint256" },
          { name: "appCreditUsed", internalType: "int256", type: "int256" },
          { name: "appAddress", internalType: "address", type: "address" },
          { name: "appCreditToken", internalType: "contract ISuperfluidToken", type: "address" },
        ],
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    inputs: [
      {
        name: "operations",
        internalType: "struct ISuperfluid.Operation[]",
        type: "tuple[]",
        components: [
          { name: "operationType", internalType: "uint32", type: "uint32" },
          { name: "target", internalType: "address", type: "address" },
          { name: "data", internalType: "bytes", type: "bytes" },
        ],
      },
    ],
    name: "forwardBatchCall",
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [{ name: "agreementType", internalType: "bytes32", type: "bytes32" }],
    name: "getAgreementClass",
    outputs: [
      { name: "agreementClass", internalType: "contract ISuperAgreement", type: "address" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "appAddr", internalType: "contract ISuperApp", type: "address" }],
    name: "getAppCallbackLevel",
    outputs: [{ name: "", internalType: "uint8", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "app", internalType: "contract ISuperApp", type: "address" }],
    name: "getAppManifest",
    outputs: [
      { name: "isSuperApp", internalType: "bool", type: "bool" },
      { name: "isJailed", internalType: "bool", type: "bool" },
      { name: "noopMask", internalType: "uint256", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "getCodeAddress",
    outputs: [{ name: "codeAddress", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "getERC2771Forwarder",
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "getGovernance",
    outputs: [{ name: "", internalType: "contract ISuperfluidGovernance", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "getNow",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "getSuperTokenFactory",
    outputs: [{ name: "factory", internalType: "contract ISuperTokenFactory", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "getSuperTokenFactoryLogic",
    outputs: [{ name: "logic", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "gov", internalType: "contract ISuperfluidGovernance", type: "address" }],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "agreementClass", internalType: "contract ISuperAgreement", type: "address" }],
    name: "isAgreementClassListed",
    outputs: [{ name: "yes", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "agreementType", internalType: "bytes32", type: "bytes32" }],
    name: "isAgreementTypeListed",
    outputs: [{ name: "yes", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "app", internalType: "contract ISuperApp", type: "address" }],
    name: "isApp",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "app", internalType: "contract ISuperApp", type: "address" }],
    name: "isAppJailed",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "app", internalType: "contract ISuperApp", type: "address" },
      { name: "targetApp", internalType: "contract ISuperApp", type: "address" },
    ],
    name: "isCompositeAppAllowed",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "ctx", internalType: "bytes", type: "bytes" }],
    name: "isCtxValid",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "forwarder", internalType: "address", type: "address" }],
    name: "isTrustedForwarder",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "ctx", internalType: "bytes", type: "bytes" },
      { name: "app", internalType: "contract ISuperApp", type: "address" },
      { name: "reason", internalType: "uint256", type: "uint256" },
    ],
    name: "jailApp",
    outputs: [{ name: "newCtx", internalType: "bytes", type: "bytes" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "bitmap", internalType: "uint256", type: "uint256" }],
    name: "mapAgreementClasses",
    outputs: [
      { name: "agreementClasses", internalType: "contract ISuperAgreement[]", type: "address[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "proxiableUUID",
    outputs: [{ name: "", internalType: "bytes32", type: "bytes32" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    inputs: [
      { name: "agreementClassLogic", internalType: "contract ISuperAgreement", type: "address" },
    ],
    name: "registerAgreementClass",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "configWord", internalType: "uint256", type: "uint256" }],
    name: "registerApp",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "app", internalType: "contract ISuperApp", type: "address" },
      { name: "configWord", internalType: "uint256", type: "uint256" },
    ],
    name: "registerApp",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "app", internalType: "contract ISuperApp", type: "address" },
      { name: "configWord", internalType: "uint256", type: "uint256" },
    ],
    name: "registerAppByFactory",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "configWord", internalType: "uint256", type: "uint256" },
      { name: "registrationKey", internalType: "string", type: "string" },
    ],
    name: "registerAppWithKey",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "bitmap", internalType: "uint256", type: "uint256" },
      { name: "agreementType", internalType: "bytes32", type: "bytes32" },
    ],
    name: "removeFromAgreementClassesBitmap",
    outputs: [{ name: "newBitmap", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "newGov", internalType: "contract ISuperfluidGovernance", type: "address" }],
    name: "replaceGovernance",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "agreementClassLogic", internalType: "contract ISuperAgreement", type: "address" },
    ],
    name: "updateAgreementClass",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "newAddress", internalType: "address", type: "address" }],
    name: "updateCode",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "newLogic", internalType: "address", type: "address" }],
    name: "updatePoolBeaconLogic",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "newFactory", internalType: "contract ISuperTokenFactory", type: "address" }],
    name: "updateSuperTokenFactory",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "token", internalType: "contract ISuperToken", type: "address" },
      { name: "newLogicOverride", internalType: "address", type: "address" },
    ],
    name: "updateSuperTokenLogic",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [],
    name: "versionRecipient",
    outputs: [{ name: "", internalType: "string", type: "string" }],
    stateMutability: "pure",
  },
] as const;

/**
 * [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x07e4a282f8f20032f3e766fffb73c8b86ba7e1f1)
 */
export const superfluidImplAddress = {
  1: "0x07E4A282F8f20032F3e766fFFB73c8b86bA7e1f1",
} as const;

/**
 * [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x07e4a282f8f20032f3e766fffb73c8b86ba7e1f1)
 */
export const superfluidImplConfig = {
  address: superfluidImplAddress,
  abi: superfluidImplAbi,
} as const;
